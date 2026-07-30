"""
Tool Calling — Transfer cuộc gọi đến queue tổng đài qua FreeSWITCH REST API
==========================================================================
Cung cấp direct function handler cho Pipecat LLM function calling.
Khi LLM detect ý định "gặp nhân viên tư vấn", handler gọi API chuyển
cuộc gọi vào callcenter queue.

Cách dùng (trong bot_fs.py):
    from fs_tools import create_transfer_tool

    handler = create_transfer_tool(
        call_uuid=conversation_id,
        api_base_url=FS_API_BASE_URL,
        api_username=FS_API_USERNAME,
        api_password=FS_API_PASSWORD,
        queue_name=FS_API_QUEUE,
    )
    context = LLMContext(tools=[handler])
"""

import asyncio
import os
import time
from loguru import logger

try:
    import httpx
except ImportError:
    httpx = None  # type: ignore

# ---------------------------------------------------------------------------
# Module-level JWT cache (dùng chung cho tất cả connections)
# ---------------------------------------------------------------------------
_jwt_token: str | None = None
_jwt_expiry: float = 0.0  # monotonic timestamp
_http_client: httpx.AsyncClient | None = None

_TOKEN_TTL_BUFFER = 60  # refresh token trước 60s khi hết hạn

# Thời gian delay trước khi stop audio stream, cho LLM + TTS kịp nói goodbye.
# Mặc định 8 giây: ~1s LLM generate + ~3-4s TTS nói + ~3s dự phòng.
_TRANSFER_CLEANUP_DELAY = int(os.getenv("FS_TRANSFER_CLEANUP_DELAY", "8"))


def _get_http_client() -> httpx.AsyncClient:
    """Get or create shared httpx AsyncClient."""
    global _http_client
    if _http_client is None:
        if httpx is None:
            raise ImportError("httpx is required. Run: pip install httpx")
        _http_client = httpx.AsyncClient(timeout=10.0)
    return _http_client


async def cleanup_http_client():
    """Close the shared HTTP client. Gọi từ finally block trong WebSocket handler."""
    global _http_client
    if _http_client is not None:
        await _http_client.aclose()
        _http_client = None
        logger.info("🧹 HTTP client closed")


async def _ensure_token(
    client: httpx.AsyncClient,
    base_url: str,
    username: str,
    password: str,
) -> str:
    """Get (or refresh) JWT token from FS API.

    Cache token ở module level, tự động refresh nếu sắp hết hạn.
    """
    global _jwt_token, _jwt_expiry

    now = time.monotonic()
    if _jwt_token and (_jwt_expiry - now) > _TOKEN_TTL_BUFFER:
        return _jwt_token

    logger.info("🔄 FS API: refreshing JWT token...")
    try:
        resp = await client.post(
            f"{base_url}/auth/token",
            json={"username": username, "password": password},
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("data", {}).get("token", "")
        if not token:
            raise ValueError(f"Unexpected auth response: {data}")

        _jwt_token = token
        _jwt_expiry = now + 86400 - _TOKEN_TTL_BUFFER  # 24h mặc định
        logger.info("✅ FS API: JWT token refreshed")
        return token
    except Exception as e:
        logger.error(f"❌ FS API auth failed: {e}")
        raise


async def _call_transfer_api(
    client: httpx.AsyncClient,
    base_url: str,
    call_uuid: str,
    queue_name: str,
    token: str,
) -> dict:
    """Gọi API transfer call vào queue."""
    resp = await client.post(
        f"{base_url}/callcenter/queues/transfer/{call_uuid}",
        json={"queue_name": queue_name},
        headers={"Authorization": f"Bearer {token}"},
    )
    resp.raise_for_status()
    return resp.json()


async def _call_stop_audio_stream(
    client: httpx.AsyncClient,
    base_url: str,
    call_uuid: str,
    token: str,
) -> bool:
    """Dừng mod_audio_stream để ngắt kết nối bot khỏi cuộc gọi.

    Sau khi transfer call vào queue, bot vẫn còn stream audio qua
    uuid_audio_stream. Nếu không stop, caller không thể nói chuyện
    với agent vì luồng audio vẫn chạy qua FS Bot.

    Gọi: POST /api/v1/commands
          {"command": "uuid_audio_stream", "args": "<uuid> stop"}
    """
    try:
        resp = await client.post(
            f"{base_url}/commands",
            json={"command": "uuid_audio_stream", "args": f"{call_uuid} stop"},
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        result = resp.json()
        body = result.get("data", {}).get("body", "")
        success = result.get("success", False)
        if success:
            logger.info(f"✅ Audio stream stopped: {body}")
        else:
            logger.warning(f"⚠️ Stop audio stream returned: {body}")
        return success
    except Exception as e:
        logger.warning(f"⚠️ Failed to stop audio stream: {e}")
        return False


async def _delayed_stop_audio(
    client: httpx.AsyncClient,
    base_url: str,
    call_uuid: str,
    token: str,
    delay_secs: int,
):
    """Dừng audio stream sau một khoảng delay, để TTS kịp đọc thông báo."""
    await asyncio.sleep(delay_secs)
    logger.info(f"⏰ Cleanup delay elapsed, stopping audio stream for {call_uuid}")
    await _call_stop_audio_stream(client, base_url, call_uuid, token)


def create_transfer_tool(
    call_uuid: str,
    api_base_url: str,
    api_username: str,
    api_password: str,
    queue_name: str = "support@default",
):
    """Factory: tạo direct function handler cho LLM tool calling.

    Closure này capture call_uuid và API config để handler có thể gọi
    REST API transfer mà không cần dependency injection phức tạp.

    Args:
        call_uuid: UUID của cuộc gọi (từ ws.query_params["conversation_id"])
        api_base_url: Base URL của FS API (vd: http://192.168.1.153:8443/api/v1)
        api_username: Username cho JWT auth
        api_password: Password cho JWT auth
        queue_name: Queue đích (mặc định support@default)

    Returns:
        Direct function handler (async function) để đưa vào LLMContext(tools=[...])
    """
    client = _get_http_client()
    base_url = api_base_url.rstrip("/")

    async def transfer_to_agent(params, reason: str = ""):
        """Chuyển cuộc gọi hiện tại đến nhân viên tổng đài / nhân viên tư vấn.

        Gọi hàm này khi khách hàng yêu cầu:
        - Gặp nhân viên hỗ trợ / nhân viên tư vấn / tổng đài viên
        - Chuyển máy cho người thật / điện thoại viên
        - Nói chuyện với nhân viên chăm sóc khách hàng
        - Gặp quản lý / cấp trên
        - Bất kỳ yêu cầu nào cần can thiệp của con người

        Hàm sẽ chuyển cuộc gọi đến hàng chờ tổng đài, nơi có nhân viên
        sẽ hỗ trợ khách hàng.

        Args:
            reason: Lý do khách hàng muốn gặp nhân viên (có thể để trống)
        """
        logger.info(f"🔄 Transfer requested: call={call_uuid}, queue={queue_name}, reason={reason!r}")

        try:
            # 1. Auth
            token = await _ensure_token(client, base_url, api_username, api_password)

            # 2. Call transfer API (chuyển call vào queue ngay lập tức)
            result = await _call_transfer_api(client, base_url, call_uuid, queue_name, token)

            # result = {"success": true, "data": {"success": true, "body": "+OK ..."}}
            api_ok = result.get("success", False)
            transfer_ok = result.get("data", {}).get("success", False) if api_ok else False
            if api_ok and transfer_ok:
                logger.info(f"✅ Transfer success: {result}")

                # 3. Lên lịch stop audio stream SAU KHI TTS nói xong goodbye.
                #    Delay mặc định 8s (~1s LLM + ~3-4s TTS + ~3s dự phòng).
                #    Không stop ngay vì khách sẽ không nghe được câu thông báo.
                delay = _TRANSFER_CLEANUP_DELAY
                logger.info(f"⏰ Will stop audio stream in {delay}s (after TTS finishes)")
                asyncio.create_task(
                    _delayed_stop_audio(
                        client, base_url, call_uuid, token, delay
                    )
                )

                # Đánh dấu stream sẽ được stop
                result["_stream_stopped"] = True
            else:
                logger.warning(f"⚠️ Transfer API returned error: {result}")

            await params.result_callback(result)

        except httpx.ConnectError as e:
            logger.error(f"❌ Transfer failed (FS API unreachable): {e}")
            await params.result_callback({
                "success": False,
                "error": f"Không thể kết nối đến tổng đài: {e}",
            })

        except httpx.TimeoutException as e:
            logger.error(f"❌ Transfer failed (timeout): {e}")
            await params.result_callback({
                "success": False,
                "error": "Kết nối đến tổng đài bị timeout",
            })

        except Exception as e:
            logger.error(f"❌ Transfer failed: {e}")
            logger.exception(e)
            await params.result_callback({
                "success": False,
                "error": f"Lỗi chuyển máy: {e}",
            })

    return transfer_to_agent

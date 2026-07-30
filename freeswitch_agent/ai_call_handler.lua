-- ai_call_handler.lua
local SAMPLE_RATE   = "8000"
local AUDIO_MODE    = "mono"
local PIPECAT_BASE  = "ws://192.168.1.20:8086/audio-stream"

-- ─── Helpers ──────────────────────────────────────────────────────────────────
local function log(level, msg)
    freeswitch.consoleLog(level, "[ai_call] " .. tostring(msg) .. "\n")
end

local function http_post(url, body)
    local api = freeswitch.API()
    -- Dùng curl qua system để POST webhook
    local escaped = body:gsub('"', '\\"')
    local cmd = string.format(
        'system curl -s -X POST -H "Content-Type: application/json" -d "%s" %s',
        escaped, url
    )
    return api:executeString(cmd)
end

-- ─── Main ─────────────────────────────────────────────────────────────────────
if not session then
    log("ERR", "Không có session")
    return
end

local call_uuid   = session:getVariable("uuid")
local phone       = session:getVariable("phone") or session:getVariable("sip_to_user") or "unknown"
-- Tự build Pipecat URL từ call_uuid và phone, không cần truyền từ bên ngoài
local pipecat_url = string.format("%s?conversation_id=%s&phone=%s", PIPECAT_BASE, call_uuid, phone)
local call_status = "no_answer"
-- Dùng start_epoch của FS để tính duration toàn bộ cuộc gọi (kể cả thời gian phát WAV)
local start_epoch = tonumber(session:getVariable("start_epoch")) or os.time()

log("INFO", string.format("Call started | uuid=%s phone=%s pipecat=%s",
    call_uuid, phone, pipecat_url))

-- Nhấc máy
session:answer()
freeswitch.msleep(200)
call_status = "answered"
log("INFO", "Call answered")

local api = freeswitch.API()




-- Set codec + DTMF mode
session:execute("set", "absolute_codec_string=PCMU")
session:setVariable("STREAM_PLAYBACK", "true")
session:setVariable("STREAM_SAMPLE_RATE", SAMPLE_RATE)
-- Bật DTMF events qua ESL để Pipecat bot detect được
-- (hoạt động với mọi DTMF mode: in-band, RFC2833, SIP-INFO)
session:setVariable("rfc2833_dtmf_events", "true")
session:setVariable("inbound_dtmf_events", "true")
-- Fallback: in-band vẫn hoạt động nếu client không gửi RFC2833
session:execute("set", "dtmfmode=inband")



-- ── 2. Start stream → Pipecat ────────────────────────────────────────────────
log("INFO", "Starting audio stream → " .. pipecat_url)
local result = api:executeString(string.format(
    "uuid_audio_stream %s start %s %s %s",
    call_uuid, pipecat_url, AUDIO_MODE, SAMPLE_RATE
))
log("INFO", "Audio stream result: " .. tostring(result))


freeswitch.msleep(100)



-- Giữ session sống bằng silence, chờ sự kiện kết thúc
-- (Pipecat sẽ gửi audio ngược lại qua WebSocket, mod_audio_stream tự phát cho khách)
log("INFO", "Holding session with silence...")
session:execute("endless_playback", "silence_stream://-1")

-- ─── Khi kết thúc (khách cúp hoặc Pipecat disconnect) ─────────────────────────
local duration = os.time() - start_epoch
log("INFO", string.format("Call ended | status=%s duration=%ds", call_status, duration))

-- Không stop audio stream ở đây — để Pipecat bot tự cleanup.
-- Nếu stop stream trong Lua script, nó sẽ đóng WebSocket ngay lập tức,
-- làm bot không kịp nói goodbye và pipeline bị cancel sớm.
-- Bot sẽ gọi uuid_audio_stream stop sau khi nói xong thông báo.


-- Xác định trạng thái cuối
-- Ưu tiên pipecat_status nếu Pipecat đã set qua ai_call_status.lua
local pipecat_status = session:getVariable("pipecat_status")
if pipecat_status and pipecat_status ~= "" then
    -- Pipecat đã gửi status (COMPLETED/PARTIAL/COMPLAINT) → Listen to end of call
    call_status = pipecat_status
else
    -- Khách cúp máy khi đang nghe WAV hoặc nói chuyện, Pipecat chưa trả status
    call_status = "NOT_COMPLETED"
end

-- Map status → mapping_result_code cho hệ thống bên ngoài
local mapping_result_code
if pipecat_status and pipecat_status ~= "" then
    mapping_result_code = "Listen to end of call"
else
    mapping_result_code = "Hang up"
end


log("INFO", "Script done.")

-- ai_call_handler.lua
local SAMPLE_RATE   = "8000"
local AUDIO_MODE    = "mono"
local PIPECAT_BASE  = "ws://192.168.1.20:8086/audio-stream"
-- Bot endpoint de nhan DTMF notify (Lua curl truc tiep ve bot)
local BOT_BASE      = "http://192.168.1.20:8086"

-- ─── Recording config ──────────────────────────────────────────────────────────
local RECORD_DIR    = "/usr/local/freeswitch/recordings"
local RECORD_FORMAT = "wav"

-- ─── Helpers ──────────────────────────────────────────────────────────────────
local function log(level, msg)
    freeswitch.consoleLog(level, "[ai_call] " .. tostring(msg) .. "\n")
end

local function ensure_dir(path)
    os.execute("mkdir -p " .. path)
end

local function register_active_call(uuid, phone)
    local api = freeswitch.API()
    api:executeString(string.format("global_setvar ai_call_%s=%s", phone, uuid))
    log("INFO", string.format("Registered active call: ai_call_%s=%s", phone, uuid))
end

local function unregister_active_call(phone)
    local api = freeswitch.API()
    api:executeString(string.format("global_setvar ai_call_%s=", phone))
    log("INFO", "Unregistered active call: ai_call_" .. phone)
end

-- ★ Phải là GLOBAL function (không phải local) để mod_lua gọi được theo tên
function hangup_cleanup(hangupSession)
    local phone = hangupSession:getVariable("phone") or hangupSession:getVariable("sip_to_user") or "unknown"
    unregister_active_call(phone)
end

-- ─── Main ─────────────────────────────────────────────────────────────────────
if not session then
    log("ERR", "Không có session")
    return
end

local call_uuid   = session:getVariable("uuid")

-- ─── DTMF callback ────────────────────────────────────────────────────────────
-- Duoc goi boi FreeSWITCH khi co phim bam (hoat dong voi moi DTMF mode)
-- Dung closure de capture call_uuid thay vi truy cap session ben trong callback
local BOT_BASE_LUA = BOT_BASE      -- capture bien global
local call_uuid_lua = call_uuid    -- capture call uuid
function on_input(s, input_type, obj)
    if input_type == "dtmf" and obj and obj.digit then
        freeswitch.consoleLog("INFO", "[dtmf_hook] digit=" .. obj.digit .. "\n")
        os.execute(string.format(
            "curl -s -m 3 '%s/dtmf-notify/%s/%s' >/dev/null 2>&1 &",
            BOT_BASE_LUA, call_uuid_lua, obj.digit))
    end
    return ""
end
local phone     = session:getVariable("caller_id_number") or "unknown"
local dest      = session:getVariable("destination_number") or ""
local pipecat_url = string.format("%s?conversation_id=%s&phone=%s", PIPECAT_BASE, call_uuid, phone)
local call_status = "no_answer"
local start_epoch = tonumber(session:getVariable("start_epoch")) or os.time()

-- Build record path theo ngày
local date_dir      = os.date("%Y-%m-%d")
local record_subdir = RECORD_DIR .. "/" .. date_dir
ensure_dir(record_subdir)
local record_path   = string.format("%s/%s_%s.%s", record_subdir, call_uuid, phone, RECORD_FORMAT)


log("INFO", string.format("Call started | uuid=%s phone=%s pipecat=%s",
    call_uuid, phone, pipecat_url))

log("INFO", "Record path: " .. record_path)

-- ★ Truyền tên hàm bằng string
session:setHangupHook("hangup_cleanup")

-- Nhấc máy
session:answer()
freeswitch.msleep(200)
call_status = "answered"
log("INFO", "Call answered")


local api = freeswitch.API()
session:execute("set", "absolute_codec_string=PCMU")
session:setVariable("STREAM_PLAYBACK", "true")
session:setVariable("STREAM_SAMPLE_RATE", SAMPLE_RATE)

-- DTMF config: ca 3 mode deu duoc
session:setVariable("rfc2833_dtmf_events", "true")
session:setVariable("inbound_dtmf_events", "true")
session:execute("set", "dtmfmode=inband")

-- Bắt đầu stream audio tới Pipecat
log("INFO", "Starting audio stream → " .. pipecat_url)
local result = api:executeString(string.format(
    "uuid_audio_stream %s start %s %s %s",
    call_uuid, pipecat_url, AUDIO_MODE, SAMPLE_RATE
))
log("INFO", "Audio stream result: " .. tostring(result))

-- QUAN TRỌNG: record SAU stream → media bug thấy cả TTS inject vào write channel
freeswitch.msleep(100)
session:setVariable("record_sample_rate", "8000")
local rec_result = api:executeString(string.format(
    "uuid_record %s start %s", call_uuid, record_path
))
log("INFO", "Recording start result: " .. tostring(rec_result))

-- ★ Đăng ký active call SAU record, để spy gắn vào sau cùng (giảm rủi ro LIFO conflict)
register_active_call(call_uuid, phone)

-- Giữ session sống + lang nghe DTMF qua setInputCallback
-- (hoat dong voi MOI DTMF mode: RFC2833, SIP-INFO, in-band)
log("INFO", "Holding session with silence + DTMF callback...")
session:setVariable("playback_terminators", "none")
session:setInputCallback("on_input")
while session:ready() do session:streamFile("silence_stream://-1") end

-- ─── Khi kết thúc bình thường ──────────────────────────────────────────────────
log("INFO", "Call ended")

-- Dừng audio stream - để bot tự cleanup
-- api:executeString(string.format("uuid_audio_stream %s stop", call_uuid))

-- ★ Cleanup spy-var (phòng trường hợp api_hangup_hook không chạy kịp)
unregister_active_call(phone)


local duration = os.time() - start_epoch
log("INFO", string.format("Call ended | status=%s duration=%ds", call_status, duration))


local pipecat_status = session:getVariable("pipecat_status")
if pipecat_status and pipecat_status ~= "" then
    call_status = pipecat_status
else
    call_status = "NOT_COMPLETED"
end

local mapping_result_code
if pipecat_status and pipecat_status ~= "" then
    mapping_result_code = "Listen to end of call"
else
    mapping_result_code = "Hang up"
end

log("INFO", "Script done.")

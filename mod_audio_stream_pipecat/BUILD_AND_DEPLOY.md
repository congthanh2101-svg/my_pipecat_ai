# Build and Deploy mod_audio_stream with Pipecat Protobuf Support

## Changes Made

1. **Added `protobuf_audio.h`**: Helper functions for protobuf audio encoding/decoding
   - `encode_varint()`: Encodes integers as protobuf varint
   - `build_audio_raw_frame()`: Wraps raw PCM audio in Pipecat AudioRawFrame protobuf format (for OUTBOUND audio)
   - `extract_audio_from_protobuf()`: Extracts raw PCM from Pipecat OutputAudioRawFrame (for INBOUND audio)

2. **Modified `audio_streamer_glue.cpp`**:
   - Added `#include "protobuf_audio.h"`
   - **OUTBOUND (User → Bot)**: Modified `writeBinary()` to wrap audio in protobuf before sending
   - **INBOUND (Bot → User)**: Added WebSocket message handler to:
     - Extract audio from binary protobuf frames (tag 0x12)
     - Convert to base64-encoded JSON format for playback
     - Send to mod_audio_stream playback mechanism via `eventCallback(MESSAGE, json)`
   - Added debug logging for messages and audio frames

3. **Modified `pipecat_audiostream.lua`**:
   - Added `session:setVariable("STREAM_PLAYBACK", "true")` to enable bidirectional audio
   - Added `session:setVariable("STREAM_SAMPLE_RATE", "8000")` to set playback sample rate
   - Fixed `silence_stream://-1` syntax (was `silence_stream://0` which caused error)

## Build Instructions (on FreeSWITCH server)

```bash
# 1. Copy source to FreeSWITCH server
cd /usr/local/src
rm -rf mod_audio_stream_pipecat
git clone https://github.com/sptmru/freeswitch_mod_audio_stream.git mod_audio_stream_pipecat
cd mod_audio_stream_pipecat

# 2. Apply Pipecat protobuf patch
# (Copy the modified files from local machine)

# 3. Initialize submodules
git submodule init
git submodule update

# 4. Build
mkdir build
cd build
PKG_CONFIG_PATH=/usr/local/freeswitch/lib/pkgconfig cmake ..
make

# 5. Stop FreeSWITCH
systemctl stop freeswitch

# 6. Backup old module
cp /usr/local/freeswitch/mod/mod_audio_stream.so /usr/local/freeswitch/mod/mod_audio_stream.so.backup

# 7. Install new module
cp mod_audio_stream.so /usr/local/freeswitch/mod/

# 8. Start FreeSWITCH
systemctl start freeswitch

# 9. Test
fs_cli -x "reload mod_audio_stream"
```

## Faster Build (if dependencies already installed)

```bash
ssh root@10.120.60.161
cd /usr/local/src/mod_audio_stream_pipecat
git pull  # if using git
cd build
make clean
make
systemctl stop freeswitch
cp mod_audio_stream.so /usr/local/freeswitch/mod/
systemctl start freeswitch
```

## Test

```lua

Đây là cách lấy log hoàn chỉnh để biết được time chính xác cuộc gọi và khi nào bot response nhận dạng dc
user nói cái gì và time  nhận dc frame audio đầu tiên và time phát ra audio frame đầu tiên

ssh root@10.120.60.161 "echo '=== Call Started ===' && grep -a 'Pipecat.*Call from' /usr/local/freeswitch/log/freeswitch.log | tail -1 | grep -oP '2025-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+' && echo -e '\n=== User Question ===' && grep -a 'user-transcription.*final.*true' /usr/local/freeswitch/log/freeswitch.log | tail -1 | grep -oP '2025-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+' && grep -a 'user-transcription.*final.*true' /usr/local/freeswitch/log/freeswitch.log | tail -1 | python3 -c \"import sys, json; line = sys.stdin.read(); data = json.loads(line[line.find('{'):line.rfind('}')+1]); print(data['data']['text'])\" && echo -e '\n=== Frame Received ===' && grep -a 'Buffered.*_0\.tmp\.r8' /usr/local/freeswitch/log/freeswitch.log | tail -1 | grep -oP '2025-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+' && echo -e '\n=== Playback Started ===' && grep -a 'Command Execute.*playback.*_0\.tmp\.r8' /usr/local/freeswitch/log/freeswitch.log | tail -1 | grep -oP '2025-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d+'"



-- Call extension 9902
-- Check logs:
tail -f /usr/local/freeswitch/log/freeswitch.log | grep -i pipecat

-- check json
grep 'JSON #' /usr/local/freeswitch/log/freeswitch.log 2>&1 | tail -20

-- Expected: Connection stays open, receives bot responses
```

## Rollback (if it doesn't work)

Nếu module mới không hoạt động, bạn có thể quay lại module cũ:

```bash
# Dừng FreeSWITCH
systemctl stop freeswitch

# Khôi phục module cũ từ backup
cp /usr/local/freeswitch/mod/mod_audio_stream.so.backup_20251218_102639 \
   /usr/local/freeswitch/mod/mod_audio_stream.so

# Khởi động lại FreeSWITCH
systemctl start freeswitch

# Reload module
fs_cli -x "reload mod_audio_stream"
```

**Lưu ý**: File backup được đặt tên theo timestamp khi tạo. Trên server hiện tại:
- Backup: `/usr/local/freeswitch/mod/mod_audio_stream.so.backup_20251218_102639`
- Module mới: `/usr/local/freeswitch/mod/mod_audio_stream.so` (1.4MB - có protobuf)
- Module cũ trong backup: 471KB (raw L16 only)

Để xem các backup có sẵn:
```bash
ls -lh /usr/local/freeswitch/mod/mod_audio_stream.so*
```

## Technical Details

### Bidirectional Audio Flow

**OUTBOUND (User → Pipecat Bot):**
1. FreeSWITCH captures audio from caller (PCMA/PCMU 8kHz)
2. mod_audio_stream receives raw PCM frames (640 bytes chunks)
3. `build_audio_raw_frame()` wraps in protobuf format
4. Sends binary protobuf via WebSocket to Pipecat server

**INBOUND (Pipecat Bot → User):**
1. Pipecat server sends binary protobuf `OutputAudioRawFrame` (tag 0x12) with 24kHz PCM audio
2. `extract_audio_from_protobuf()` parses protobuf and extracts raw PCM (1920 bytes @ 24kHz)
3. `resample_24k_to_8k()` applies FIR low-pass filter and decimates to 640 bytes @ 8kHz PCM
4. **DIRECT BINARY BUFFERING:** Append resampled PCM to buffer (no base64, no JSON!)
5. When buffer has 5 frames (3200 bytes = 200ms), write binary directly to `/tmp/uuid_N.tmp.r8`
6. **AUTO-PLAYBACK:** `uuid_broadcast` is called automatically to play the .r8 file to caller
7. File is played to user via FreeSWITCH's raw PCM playback and then deleted

**Optimizations:**
- ✅ **NO base64 encoding** (eliminated 33% overhead)
- ✅ **NO JSON wrapping/parsing** (faster processing)
- ✅ **Direct binary buffering** in WebSocket layer (single-layer architecture)
- ✅ **Frame buffering** (5 frames = 200ms) reduces uuid_broadcast overhead

### Protobuf Format

**OUTBOUND Audio Frame (User → Bot):**
```
[WebSocket Binary Frame]
├─ 0x12 <varint_len>        # Outer frame tag (field 2)
   ├─ 0x12 <len> "audio"    # Field 2: type
   ├─ 0x1a <len> <pcm_data> # Field 3: audio bytes (640 bytes)
   ├─ 0x20 <varint>         # Field 4: sample_rate (8000)
   └─ 0x28 <varint>         # Field 5: num_channels (1)
```

**INBOUND Audio Frame (Bot → User):**
```
[WebSocket Binary Frame]
├─ 0x12 <varint_len>        # Outer frame tag (field 2) = OutputAudioRawFrame
   ├─ 0x08 <varint>         # Field 1: sequence number
   ├─ 0x12 <len> "OutputAudioRawFrame"  # Field 2: type string
   ├─ 0x1a <len> <pcm_data> # Field 3: audio bytes (1920 bytes)
   ├─ 0x20 <varint>         # Field 4: sample_rate (8000)
   └─ 0x28 <varint>         # Field 5: num_channels (1)
```

This matches the format from Pipecat server (same as Python test_ws_client.py).

### Audio Processing Pipeline

**Resampling (24kHz → 8kHz):**
- Pipecat server sends audio at **24kHz** (1920 bytes per frame = 40ms)
- FIR low-pass filter applied (16 taps, 3.5kHz cutoff, Hamming window)
- Decimation by factor of 3 to produce 8kHz output (640 bytes = 40ms)
- Same algorithm as working UniMRCP plugin (pipecat_synth.c)

**Frame Buffering:**
- Each resampled frame = 640 bytes PCM @ 8kHz (40ms audio)
- Buffer size = 5 frames = 3200 bytes (200ms audio)
- Reduces uuid_broadcast overhead from 25 calls/sec to 5 calls/sec
- Acceptable latency trade-off (~200ms) for better audio quality

**Why Raw PCM (.r8) format?**
- NO compression overhead (PCMU encoding removed)
- Better audio quality (no G.711 μ-law compression artifacts)
- FreeSWITCH can play raw PCM files directly via uuid_broadcast
- Simpler pipeline: Binary → Buffer → File → Play (no base64, no JSON)

### Key Code Changes

**1. Direct binary buffering in WebSocket layer (audio_streamer_glue.cpp:314-360):**
```cpp
if (audio_len > 0) {
    // Resample 24kHz -> 8kHz with anti-aliasing filter
    uint8_t resampled_buffer[16384];
    size_t resampled_len = resample_24k_to_8k(audio_buffer, audio_len,
                                               resampled_buffer, sizeof(resampled_buffer));

    // DIRECT BINARY BUFFERING (no base64, no JSON!)
    m_frameBuffer.append((const char*)resampled_buffer, resampled_len);
    m_frameCount++;

    // When buffer is full, write to file and play
    if (m_frameCount >= m_bufferSize) {
        // Write buffered binary data directly to file
        char filePath[256];
        snprintf(filePath, 256, "/tmp/%s_%d.tmp.r8", session_id, file_counter++);

        std::ofstream fstream(filePath, std::ofstream::binary);
        fstream.write(m_frameBuffer.data(), m_frameBuffer.size());
        fstream.close();

        // Play directly using uuid_broadcast
        switch_api_execute("uuid_broadcast", broadcast_args, session, &stream);

        // Reset buffer
        m_frameBuffer.clear();
        m_frameCount = 0;
    }
}
```

**2. Enable bidirectional audio (pipecat_audiostream.lua:18-20):**
```lua
-- Enable bidirectional audio playback
session:setVariable("STREAM_PLAYBACK", "true")
session:setVariable("STREAM_SAMPLE_RATE", "8000")
```

**3. Keep session active (pipecat_audiostream.lua:49):**
```lua
-- Use -1 for infinite duration (NOT 0, which causes error)
session:execute("endless_playback", "silence_stream://-1")
```

### Debugging

Check logs to verify audio flow:
```bash
# See WebSocket messages and audio frames
tail -f /usr/local/freeswitch/log/freeswitch.log | grep -E "mod_audio_stream|Buffering frame|Buffered.*frames"

# Expected output:
# [mod_audio_stream] *** WebSocket CONNECTED ***
# [mod_audio_stream] Sent frame #50: 640 bytes raw -> 658 bytes protobuf
# [mod_audio_stream] *** RECEIVED AUDIO FRAME #50: 1920 bytes (24kHz) -> 640 bytes (8kHz PCM) ***
# [mod_audio_stream] Buffering frame 1/5 (640 bytes total)
# [mod_audio_stream] Buffering frame 2/5 (1280 bytes total)
# ...
# [mod_audio_stream] Buffered 5 frames (3200 bytes) -> /tmp/uuid_1.tmp.r8
```

### Performance Comparison

**OLD (with base64/JSON):**
- Processing: Binary → Resample → Base64 encode → JSON wrap → Parse → Base64 decode → Buffer → File
- Overhead: ~33% (base64) + JSON parsing
- Throughput: ~25 file writes/sec (40ms intervals)

**NEW (optimized):**
- Processing: Binary → Resample → Buffer → File
- Overhead: None
- Throughput: ~5 file writes/sec (200ms intervals)
- **Result: 80% reduction in file I/O, eliminated base64 overhead**

# STT & Audio Quality Issue Analysis

Date: 2026-07-15

## 1. Audio Quality Degradation (rè/nhiễu)

**Triệu chứng:** Bot nói bị rè, nhiễu khi output ở 8000Hz nhưng nghe tốt ở 22050Hz (react-c1 client).

**Nguyên nhân gốc rễ:** Piper TTS native rate = 22050Hz. Pipecat framework dùng `SOXRStreamAudioResampler` để resample từng audio chunk từ 22050Hz → 8000Hz. `soxr.ResampleStream.resample_chunk()` không được gọi với `last=True` ở chunk cuối, dẫn đến mất âm cuối.

Sau khi fix (để TTS output ở 22050Hz, L16 serializer resample bằng scipy FFT), audio trở nên hoàn chỉnh nhưng có nhiễu do:
- `scipy.signal.resample` (FFT-based) trên từng chunk ngắn (~20-40ms) gây **boundary artifacts** ở đầu/cuối mỗi chunk
- Tổng cộng 54 chunks cho một câu trả lời → tích lũy artifacts ở mỗi chunk boundary → âm rè

**Fix đề xuất:**
- Output 22050Hz trực tiếp ra client (bỏ qua resample), chỉ chuyển đổi sample rate cho FreeSWITCH (8000Hz)
- Hoặc dùng soxr với `last=True` cho chunk cuối
- Hoặc gộp toàn bộ audio chunk thành 1 buffer rồi resample 1 lần

## 2. STT Không Hoạt Động (Bot không nghe được)

**Triệu chứng:** Bot không phản hồi khi user nói vào mic, dù kết nối WebSocket thành công.

### Luồng xử lý STT:

```
Browser mic (48000Hz Float32)
  → WebSocket
  → Serializer.deserialize() → InputAudioRawFrame(sample_rate=??, Int16)
  → transport.input()        (audio_in_passthrough=True)
  → stt (WhisperSTTService)  (accumulate audio chunks)
  → user_agg (LLMUserAggregator + SileroVADAnalyzer)
      [VADAnalyzer phân tích audio → broadcast VAD frames]
      [VADUserStoppedSpeakingFrame → (upstream) → stt → transcribe]
```

### Vấn đề tiềm năng (cần kiểm tra):

#### A. Sample rate mismatch

- Browser microphone thường ghi ở 48000Hz hoặc 44100Hz (Float32)
- `audio_in_sample_rate=8000` trong `FastAPIWebsocketParams`
- Nếu serializer không resample từ 48000 → 8000, VAD và Whisper nhận audio sai rate → không detect speech

**Các thành phần bị ảnh hưởng:**
1. `L16FrameSerializer.deserialize()`: stamp `sample_rate=self._sample_rate=8000` nhưng data raw từ client có rate gốc (48000/44100)
2. `SileroVADAnalyzer(sample_rate=8000)`: phân tích 256 samples = 32ms. Nếu audio thực tế 48000Hz, 256 samples = 5.3ms → VAD không hoạt động đúng
3. `WhisperSTTService`: Whisper hỗ trợ 16000Hz mặc định. Nếu audio sai rate → transcription fails hoặc cho kết quả rỗng

**Cần kiểm tra:**
- `audio_in_sample_rate` có thực sự resample audio không?
- `RTVICompatibleSerializer.deserialize()` có resample Float32[48000] → Int16[8000]?
- `L16FrameSerializer.deserialize()` có cần resample không? (Hiện tại không)

#### B. VADAnalyzer + SegmentedSTTService requirement

- `SegmentedSTTService` (base class của `WhisperSTTService`) yêu cầu `VADUserStoppedSpeakingFrame` để trigger transcription
- `SileroVADAnalyzer` trong `LLMUserAggregatorParams` chịu trách nhiệm detect speech và broadcast VAD frames
- Nếu VAD không detect "user started speaking" và "user stopped speaking" → STT không bao giờ transcribe

**Điều kiện cần:**
1. Audio đến được `SileroVADAnalyzer` → phân tích đúng
2. `SileroVADAnalyzer` broadcast `VADUserStartedSpeakingFrame` + `VADUserStoppedSpeakingFrame`
3. `SegmentedSTTService` nhận `VADUserStoppedSpeakingFrame` → transcribe accumulated audio

**Cần kiểm tra:**
- Log có `UserStartedSpeaking` / `UserStoppedSpeaking` không?
- Audio input path có thực sự đưa audio đến VAD không?
- `audio_in_enabled=True` + `audio_in_passthrough=True` đã đảm bảo audio đi qua chưa?

#### C. Audio input path

- `audio_in_enabled=True`: transport nhận audio từ WebSocket và push vào queue
- `audio_in_passthrough=True`: transport push_frame audio xuống downstream (tới STT)
- Nếu thiếu `audio_in_passthrough=True`, audio bị consume từ queue nhưng không push đi đâu

**Status:** `audio_in_passthrough=True` đã set (fixed từ 2026-07-14).

### Tóm tắt ưu tiên kiểm tra:

1. **Sample rate mismatch**: Đây là nghi vấn hàng đầu — cần kiểm tra browser ghi bao nhiêu Hz, serializer có resample đến 8000Hz không
2. **VAD flow**: Xem log VAD để biết có detect speech không
3. **Transport path**: Verify `audio_in_passthrough` hoạt động đúng

## 3. React-c1 Sample Rate Settings

- react-c1 cho chọn 8000/16000/22050/44100 Hz cho audio input
- Ở 22050Hz hoặc 44100Hz: âm thanh nghe tốt hơn vì không qua resample
- Ở 8000Hz: âm thanh bị rè do resample từ 48000 → 8000 ở client-side

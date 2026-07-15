/**
 * AudioWorklet processor for mic capture.
 * Runs on a dedicated audio thread (not main thread), so it never drops audio.
 * Captures input channel 0 and posts Float32 data to the main thread.
 */
class CaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === 'close') {
        this.port.close();
      }
    };
  }

  process(inputs, outputs, parameters) {
    // Zero output buffers to prevent stale/garbage data reaching downstream
    for (let ch = 0; ch < outputs[0].length; ch++) {
      outputs[0][ch].fill(0);
    }

    const input = inputs[0];
    if (input && input.length > 0 && input[0].length > 0) {
      const channelData = input[0];
      this.port.postMessage(
        { type: 'audio', data: channelData.slice(0) },
        [channelData.buffer]
      );
    }
    return true;
  }
}

registerProcessor('capture-processor', CaptureProcessor);

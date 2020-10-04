import { InlineWebWorker } from "./utils/inline-webworker";

// TODO: in the future, can't we just pass down the AudioBuffer?
type MultiChannelBuffer = Float32Array[];

const AudioWorker = new InlineWebWorker(() => {
  let recLength = 0; // TODO: rename
  let recBuffers: MultiChannelBuffer[] = []; // TODO: rename
  let sampleRate: number;
  let numberOfChannels: number;

  // TODO: types...
  self.onmessage = (e: any) => {
    console.log("got message!---", e.data.command);
    switch (e.data.command) {
      case "init":
        init(e.data.config);
        break;
      case "record":
        record(e.data.buffer);
        break;
      case "exportWAV":
        exportWAV(e.data.type);
        break;
      case "getBuffer":
        getBuffer();
        break;
      case "clear":
        clear();
        break;
    }
  };

  function postMessageToMain(obj: { command: string; data: any }) {
    // ignored because I don't want to bother with separate tsconfig files for webworker files
    // @ts-ignore
    self.postMessage(obj);
  }

  function init(config: {
    sampleRate: number;
    numberOfChannels: number;
  }): void {
    sampleRate = config.sampleRate;
    numberOfChannels = config.numberOfChannels;
    initBuffers();
  }

  function record(inputBuffer: MultiChannelBuffer): void {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      recBuffers[channel].push(inputBuffer[channel]);
    }
    recLength += inputBuffer[0].length;
  }

  function exportWAV(type: "audio/wav"): void {
    const buffers = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      buffers.push(mergeBuffers(recBuffers[channel], recLength));
    }
    const interleaved =
      numberOfChannels === 2 ? interleave(buffers[0], buffers[1]) : buffers[0];
    const dataview = encodeWAV(interleaved);
    console.log("interleaved", interleaved, interleaved.length);
    const audioBlob = new Blob([dataview], { type });

    postMessageToMain({ command: "exportWAV", data: audioBlob });
  }

  function getBuffer(): void {
    const buffers = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      buffers.push(mergeBuffers(recBuffers[channel], recLength));
    }
    postMessageToMain({ command: "getBuffer", data: buffers });
  }

  function clear(): void {
    recLength = 0;
    recBuffers = [];
    initBuffers();
  }

  function initBuffers(): void {
    for (let channel = 0; channel < numberOfChannels; channel++) {
      recBuffers[channel] = [];
    }
  }

  function mergeBuffers(
    recBuffers: Float32Array[],
    recLength: number,
  ): Float32Array {
    const result = new Float32Array(recLength);
    let offset = 0;
    // for (let i = 0; i < recBuffers.length; i++) {
    //   result.set(recBuffers[i], offset);
    //   offset += recBuffers[i].length;
    // }
    for (const recBuffer of recBuffers) {
      console.log("recBuffer", recBuffer);
      result.set(recBuffer, offset);
      offset += recBuffer.length;
    }
    return result;
  }

  function interleave(
    inputL: Float32Array,
    inputR: Float32Array,
  ): Float32Array {
    const length = inputL.length + inputR.length;
    const result = new Float32Array(length);

    let index = 0;
    let inputIndex = 0;

    while (index < length) {
      result[index++] = inputL[inputIndex];
      result[index++] = inputR[inputIndex];
      inputIndex++;
    }
    return result;
  }

  function floatTo16BitPCM(
    output: DataView,
    offset: number,
    input: Float32Array,
  ): void {
    for (let i = 0; i < input.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
  }

  function writeString(view: DataView, offset: number, str: string): void {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  }

  function encodeWAV(samples: Float32Array): DataView {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    /* RIFF identifier */
    writeString(view, 0, "RIFF");
    /* RIFF chunk length */
    view.setUint32(4, 36 + samples.length * 2, true);
    /* RIFF type */
    writeString(view, 8, "WAVE");
    /* format chunk identifier */
    writeString(view, 12, "fmt ");
    /* format chunk length */
    view.setUint32(16, 16, true);
    /* sample format (raw) */
    view.setUint16(20, 1, true);
    /* channel count */
    view.setUint16(22, numberOfChannels, true);
    /* sample rate */
    view.setUint32(24, sampleRate, true);
    /* byte rate (sample rate * block align) */
    view.setUint32(28, sampleRate * 4, true);
    /* block align (channel count * bytes per sample) */
    view.setUint16(32, numberOfChannels * 2, true);
    /* bits per sample */
    view.setUint16(34, 16, true);
    /* data chunk identifier */
    writeString(view, 36, "data");
    /* data chunk length */
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return view;
  }
});

export default AudioWorker;

import * as Types from "./types";

import { InlineWebWorker } from "../utils/inline-webworker";

export default new InlineWebWorker(() => {
  interface TimedBuffer {
    firstSampleStartTime: number;
    data: Float32Array[];
  }
  // redo constants here for command names
  let recLength = 0; // TODO: rename
  let sampleRate: number;
  let numberOfChannels: number;
  let isRecording = false;
  let currentRecordingBuffer: TimedBuffer[] = [];
  let lastFinishedBuffer: TimedBuffer[] = [];
  let lastStartTime = -1;

  // TODO: types...
  self.onmessage = (e: { data: Types.WorkerInputs }) => {
    switch (e.data.command) {
      case "init":
        init(e.data.key, e.data.sampleRate, e.data.numberOfChannels);
        break;
      case "record":
        record(e.data.key, e.data.buffer, e.data.sampleStartTime);
        break;
      case "startRecording":
        startRecording(e.data.key, e.data.time);
        break;
      case "stopRecording":
        stopRecording(e.data.key, e.data.time);
        break;
      case "exportWAV":
        exportWAV(e.data.key, e.data.mimeType);
        break;
      case "clear":
        clear(e.data.key);
        break;
    }
  };

  function postMessageToMain(obj: {
    command: string;
    data?: any;
    key: string; // TODO: should not be optional... create better abstraction
  }) {
    // ignored because I don't want to bother with separate tsconfig files for webworker files
    // @ts-ignore
    self.postMessage(obj);
  }

  function init(
    key: string,
    _sampleRate: number,
    _numberOfChannels: number,
  ): void {
    sampleRate = _sampleRate;
    numberOfChannels = _numberOfChannels;
    initBuffers();
    postMessageToMain({ command: "init", key });
  }

  function startRecording(key: string, time: number) {
    lastStartTime = time;
    isRecording = true;
    postMessageToMain({ command: "startRecording", key });
  }

  function constrainBuffers(
    buffers: TimedBuffer[],
    start: number,
    end: number,
  ): TimedBuffer[] {
    // do shit
    // const diff = context.currentTime - this.tempStartTime;
    // console.log("recorded for", diff, "seconds");
    // console.log(
    //   "this should be exactly this many samples:",
    //   diff * context.sampleRate,
    // );
    console.log("end - start", `${end} - ${start}`, end - start);
    console.log("buffers", buffers);
    return buffers; // OBVIOUSLY FAKE
  }

  function stopRecording(key: string, time: number) {
    lastFinishedBuffer = constrainBuffers(
      currentRecordingBuffer.slice(),
      lastStartTime,
      time,
    );
    // need last buffer....
    isRecording = false;
    postMessageToMain({ command: "stopRecording", key });
  }

  function transformTimedBufferToTransferable(
    timedBuffer: TimedBuffer[],
  ): Types.MultiChannelBuffer[] {
    // need to decide how much processing to do on stop
    return timedBuffer.reduce((previous, buffer) => {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        previous[channel].push(buffer.data[channel]);
      }
      return previous;
    }, makeEmptyBuffer());
  }

  function exportWAV(key: string, type: "audio/wav"): void {
    const buffers = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const result = transformTimedBufferToTransferable(lastFinishedBuffer);
      buffers.push(mergeBuffers(result[channel], recLength));
    }
    const interleaved =
      numberOfChannels === 2 ? interleave(buffers[0], buffers[1]) : buffers[0];
    const dataview = encodeWAV(interleaved);
    console.log(
      "exported sample length",
      interleaved.length / numberOfChannels,
    );
    const blob = new Blob([dataview], { type });
    console.log("responding to key", key);
    postMessageToMain({ command: "exportWAV", data: { blob }, key });
  }

  function resetState(): void {
    recLength = 0;
    currentRecordingBuffer = [];
    initBuffers();
  }

  function clear(key: string): void {
    resetState();
    postMessageToMain({ command: "exportWAV", key });
  }

  function makeEmptyBuffer(): Types.MultiChannelBuffer[] {
    const array = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      array[channel] = [];
    }
    return array;
  }

  function initBuffers(): void {
    currentRecordingBuffer = [];
  }

  function record(
    key: string,
    inputBuffer: Types.MultiChannelBuffer,
    firstSampleStartTime: number,
  ): void {
    if (!isRecording) {
      resetState();
    }

    const data: Types.MultiChannelBuffer = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      data.push(inputBuffer[channel]);
    }
    recLength += inputBuffer[0].length;
    currentRecordingBuffer.push({ firstSampleStartTime, data });
    postMessageToMain({ command: "record", key });
  }

  function mergeBuffers(
    recBuffers: Float32Array[],
    recLength: number,
  ): Float32Array {
    const result = new Float32Array(recLength);
    let offset = 0;
    for (const recBuffer of recBuffers) {
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

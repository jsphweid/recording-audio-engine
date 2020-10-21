import * as Types from "./types";

import { InlineWebWorker } from "../utils/inline-webworker";

export default new InlineWebWorker(() => {
  class Hooks {
    private hooks: Array<() => any>;
    public constructor() {
      this.hooks = [];
    }
    public add = (fn: () => any): void => {
      this.hooks.push(fn);
    };
    public flush = (): void => {
      this.hooks
        .slice()
        .reverse()
        .forEach((_, index, object) => {
          this.hooks.splice(object.length - 1 - index, 1)[0]();
        });
    };
  }

  // redo constants here for command names
  let sampleRate: number;
  let bufferLength: number;
  let numberOfChannels: number;
  let isSavingBuffers = false;
  let currentRecordingBuffer: Types.TimedBuffer[] = [];
  const lastFinishedBuffer: Types.MultiChannelBuffer[] = [];
  const postRecordHooks = new Hooks();

  // TODO: types...
  self.onmessage = (e: { data: Types.WorkerInputs }) => {
    switch (e.data.command) {
      case "init":
        init(
          e.data.key,
          e.data.sampleRate,
          e.data.numberOfChannels,
          e.data.bufferLength,
        );
        break;
      case "record":
        record(e.data.key, e.data.buffer, e.data.sampleStartTime);
        break;
      case "startRecording":
        startRecording(e.data.key);
        break;
      case "stopRecording":
        stopRecording(e.data.key);
        break;
      case "exportWAV":
        exportWAV(e.data.key, e.data.mimeType, e.data.start, e.data.end);
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
    _bufferLength: number,
  ): void {
    sampleRate = _sampleRate;
    numberOfChannels = _numberOfChannels;
    bufferLength = _bufferLength;
    initBuffers();
    postMessageToMain({ command: "init", key });
  }

  function startRecording(key: string) {
    isSavingBuffers = true;
    postMessageToMain({ command: "startRecording", key });
  }

  function constrainBuffers(
    _buffers: Types.TimedBuffer[],
    desiredStart: number,
    desiredEnd: number,
  ): Types.MultiChannelBuffer[] {
    const buffers = _buffers.slice();
    const bufferDuration = bufferLength / sampleRate;
    const sampleDuration = 1 / sampleRate;

    if (buffers.length === 0) {
      throw new Error("How are there no buffers....");
    }
    if (desiredStart < buffers[0].firstSampleStartTime) {
      throw new Error(
        "Recording start time was too early somehow... not covered in buffers.",
      );
    }
    if (
      desiredEnd >
      buffers[buffers.length - 1].firstSampleStartTime + bufferDuration
    ) {
      throw new Error("Recording end time was not covered in buffers...");
    }

    // remove irrelevant buffers
    const filteredBuffers = buffers.filter(buffer => {
      const bufferStart = buffer.firstSampleStartTime;
      const bufferEnd = bufferStart + bufferDuration - sampleDuration;
      return !(bufferEnd < desiredStart || bufferStart > desiredEnd);
    });

    // figure out how many sample to remove
    const samplesToRemoveFromBeginning = Math.round(
      (desiredStart - filteredBuffers[0].firstSampleStartTime) * sampleRate,
    );
    const samplesToRemoveFromEnd = Math.round(
      (bufferDuration -
        (desiredEnd -
          filteredBuffers[filteredBuffers.length - 1].firstSampleStartTime)) *
        sampleRate,
    );

    const transformedBuffers = transformTimedBufferToTransferable(
      filteredBuffers,
    );

    // for each channel, remove the samples
    for (let channel = 0; channel < numberOfChannels; channel++) {
      transformedBuffers[channel][0] = transformedBuffers[channel][0].slice(
        samplesToRemoveFromBeginning,
      );
      const lastChannelIndex = transformedBuffers[channel].length - 1;
      transformedBuffers[channel][lastChannelIndex] = transformedBuffers[
        channel
      ][lastChannelIndex].slice(0, -samplesToRemoveFromEnd);
    }

    return transformedBuffers;
  }

  function stopRecording(key: string) {
    postRecordHooks.add(() => {
      isSavingBuffers = false;
      postMessageToMain({ command: "stopRecording", key });
    });
  }

  function transformTimedBufferToTransferable(
    timedBuffers: Types.TimedBuffer[],
  ): Types.MultiChannelBuffer[] {
    return timedBuffers.reduce((previous, buffer) => {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        previous[channel].push(buffer.data[channel]);
      }
      return previous;
    }, makeEmptyBuffer());
  }

  function exportWAV(
    key: string,
    type: "audio/wav",
    start: number,
    end: number,
  ): void {
    const buffers = [];
    const lastFinishedBuffer = constrainBuffers(
      currentRecordingBuffer,
      start,
      end,
    );
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const result = lastFinishedBuffer;
      buffers.push(mergeBuffers(result[channel]));
    }
    const interleaved =
      numberOfChannels === 2 ? interleave(buffers[0], buffers[1]) : buffers[0];
    const dataview = encodeWAV(interleaved);
    const blob = new Blob([dataview], { type });
    postMessageToMain({ command: "exportWAV", data: { blob }, key });
  }

  function resetState(): void {
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
    if (!isSavingBuffers) {
      resetState();
    }

    const data: Types.MultiChannelBuffer = [];
    for (let channel = 0; channel < numberOfChannels; channel++) {
      data.push(inputBuffer[channel]);
    }
    currentRecordingBuffer.push({ firstSampleStartTime, data });
    postRecordHooks.flush();
    postMessageToMain({ command: "record", key });
  }

  function mergeBuffers(recBuffers: Float32Array[]): Float32Array {
    const length = recBuffers.reduce((prev, curr) => prev + curr.length, 0);
    const result = new Float32Array(length);
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

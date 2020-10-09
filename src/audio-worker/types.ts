export namespace Literals {
  export type INIT = "init";
  export const INIT: INIT = "init";

  export type EXPORT_WAV = "exportWAV";
  export const EXPORT_WAV: EXPORT_WAV = "exportWAV";

  export type RECORD = "record";
  export const RECORD: RECORD = "record";

  export type START_RECORDING = "startRecording";
  export const START_RECORDING: START_RECORDING = "startRecording";

  export type STOP_RECORDING = "stopRecording";
  export const STOP_RECORDING: STOP_RECORDING = "stopRecording";

  export type CLEAR = "clear";
  export const CLEAR: CLEAR = "clear";
}

export namespace Command {
  export type Name =
    | Literals.EXPORT_WAV
    | Literals.RECORD
    | Literals.START_RECORDING
    | Literals.STOP_RECORDING
    | Literals.INIT
    | Literals.CLEAR;
}

export interface WorkerBaseInput<T extends Command.Name> {
  key: string;
  command: T;
}

export namespace Init {
  export interface UserInput {
    sampleRate: number;
    numberOfChannels: number;
  }
  export type WorkerInput = WorkerBaseInput<Literals.INIT> & UserInput;
}

export namespace Clear {
  export interface UserInput {}
  export type WorkerInput = WorkerBaseInput<Literals.CLEAR> & UserInput;
}

export namespace StartRecording {
  export interface UserInput {
    time: number;
  }
  export type WorkerInput = WorkerBaseInput<Literals.START_RECORDING> &
    UserInput;
}

export namespace StopRecording {
  export interface UserInput {
    time: number;
  }
  export type WorkerInput = WorkerBaseInput<Literals.STOP_RECORDING> &
    UserInput;
}

export namespace ExportWAV {
  export interface UserInput {
    mimeType: "audio/wav";
  }
  export type WorkerInput = WorkerBaseInput<Literals.EXPORT_WAV> & UserInput;
  export interface WorkerOutput {
    blob: Blob;
  }
}

export namespace Record {
  export interface UserInput {
    buffer: MultiChannelBuffer;
    sampleStartTime: number;
  }
  export type WorkerInput = WorkerBaseInput<Literals.RECORD> & UserInput;
}

export type WorkerInputs =
  | Init.WorkerInput
  | Clear.WorkerInput
  | StartRecording.WorkerInput
  | StopRecording.WorkerInput
  | ExportWAV.WorkerInput
  | Record.WorkerInput;

export type MultiChannelBuffer = Float32Array[];

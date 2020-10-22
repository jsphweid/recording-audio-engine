export namespace Literals {
  export type INIT = "init";
  export const INIT: INIT = "init";

  export type EXTRACT_RANGE_FROM_LAST_RECORDED = "extractRangeFromLastRecorded";
  export const EXTRACT_RANGE_FROM_LAST_RECORDED: EXTRACT_RANGE_FROM_LAST_RECORDED =
    "extractRangeFromLastRecorded";

  export type RECORD = "record";
  export const RECORD: RECORD = "record";

  export type START_RECORDING = "startRecording";
  export const START_RECORDING: START_RECORDING = "startRecording";

  export type STOP_RECORDING = "stopRecording";
  export const STOP_RECORDING: STOP_RECORDING = "stopRecording";

  export type CLEAR = "clear";
  export const CLEAR: CLEAR = "clear";

  export type CREATE_WAV = "createWav";
  export const CREATE_WAV: CREATE_WAV = "createWav";
}

export namespace Command {
  export type Name =
    | Literals.EXTRACT_RANGE_FROM_LAST_RECORDED
    | Literals.RECORD
    | Literals.START_RECORDING
    | Literals.STOP_RECORDING
    | Literals.INIT
    | Literals.CLEAR
    | Literals.CREATE_WAV;
}

export interface WorkerBaseInput<T extends Command.Name> {
  key: string;
  command: T;
}

export namespace Init {
  export interface UserInput {
    sampleRate: number;
    numberOfChannels: number;
    bufferLength: number;
  }
  export type WorkerInput = WorkerBaseInput<Literals.INIT> & UserInput;
}

export namespace Clear {
  export interface UserInput {}
  export type WorkerInput = WorkerBaseInput<Literals.CLEAR> & UserInput;
}

export namespace StartRecording {
  export type WorkerInput = WorkerBaseInput<Literals.START_RECORDING>;
}

export namespace StopRecording {
  export type WorkerInput = WorkerBaseInput<Literals.STOP_RECORDING>;
}

export namespace ExtractRangeFromLastRecorded {
  export interface UserInput {
    start: number;
    end: number;
  }
  export type WorkerInput = WorkerBaseInput<
    Literals.EXTRACT_RANGE_FROM_LAST_RECORDED
  > &
    UserInput;
  export interface WorkerOutput {
    buffers: Float32Array[];
  }
}

export namespace Record {
  export interface UserInput {
    buffer: Float32Array[];
    sampleStartTime: number;
  }
  export type WorkerInput = WorkerBaseInput<Literals.RECORD> & UserInput;
}

export namespace CreateWav {
  export interface UserInput {
    rawAudioData: Float32Array[];
  }
  export type WorkerInput = WorkerBaseInput<Literals.CREATE_WAV> & UserInput;
  export interface WorkerOutput {
    blob: Blob;
  }
}

export type WorkerInputs =
  | Init.WorkerInput
  | Clear.WorkerInput
  | StartRecording.WorkerInput
  | StopRecording.WorkerInput
  | ExtractRangeFromLastRecorded.WorkerInput
  | Record.WorkerInput
  | CreateWav.WorkerInput;

export interface TimedBuffer {
  firstSampleStartTime: number;
  data: Float32Array[];
}

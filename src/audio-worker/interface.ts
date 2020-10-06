import audioWorker from "./worker";

// TODO: fix any's

const generatePromiseKey = (command: string) =>
  `${command}_${new Date().getTime()}`;

// these must be the same as the worker file
const EXPORT_WAV_COMMAND = "exportWAV";
const SAVE_BUFFER_COMMAND = "record";
const INIT_COMMAND = "init";
const CLEAR_COMMAND = "clear";

const callbacks: any = {};

audioWorker.onmessage = e => {
  const key = e.data.key;
  const cb = callbacks[key];
  if (key.startsWith(EXPORT_WAV_COMMAND)) {
    cb(e.data.data);
  } else {
    // more cases...
  }
  delete callbacks[key];
};

export const initWorker = ({
  sampleRate,
  numberOfChannels,
}: {
  sampleRate: number;
  numberOfChannels: number;
}): Promise<void> => {
  const key = generatePromiseKey(INIT_COMMAND);
  return new Promise(resolve => {
    callbacks[key] = () => resolve();
    audioWorker.postMessage({
      command: INIT_COMMAND,
      key,
      sampleRate,
      numberOfChannels,
    });
  });
};

export const clear = (): Promise<void> => {
  const key = generatePromiseKey(CLEAR_COMMAND);
  return new Promise(resolve => {
    callbacks[key] = () => resolve();
    audioWorker.postMessage({
      command: CLEAR_COMMAND,
      key,
    });
  });
};

export const saveBuffer = ({
  buffer,
}: {
  buffer: Float32Array[];
}): Promise<void> => {
  const key = generatePromiseKey(SAVE_BUFFER_COMMAND);
  return new Promise(resolve => {
    callbacks[key] = () => resolve();
    audioWorker.postMessage({
      command: SAVE_BUFFER_COMMAND,
      buffer,
      key,
    });
  });
};

export const exportWAV = (
  {
    mimeType,
  }: {
    mimeType: "audio/wav";
  } = { mimeType: "audio/wav" },
): Promise<Blob> => {
  const key = generatePromiseKey(EXPORT_WAV_COMMAND);
  return new Promise(resolve => {
    callbacks[key] = (blob: Blob) => resolve(blob);
    audioWorker.postMessage({
      command: EXPORT_WAV_COMMAND,
      type: mimeType,
      key,
    });
  });
};

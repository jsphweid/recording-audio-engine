import * as Types from "./types";
import audioWorker from "./worker";

const generatePromiseKey = (command: string) =>
  `${command}_${new Date().getTime()}`;

const callbacks: { [key: string]: (data?: any) => void } = {};

audioWorker.onmessage = e => {
  const key = e.data.key;
  const data = e.data.data;
  callbacks[key](data);
  delete callbacks[key];
};

const interfaceGenerator = <
  A extends Types.Command.Name,
  B extends object = {},
  C extends any = void
>(
  command: A,
) => (obj: B): Promise<C> => {
  const key = generatePromiseKey(command);
  return new Promise(resolve => {
    callbacks[key] = (data?: any) => resolve(data);
    audioWorker.postMessage({ command, key, ...obj });
  });
};

export const init = interfaceGenerator<
  Types.Literals.INIT,
  Types.Init.UserInput
>(Types.Literals.INIT);

export const clear = interfaceGenerator<Types.Literals.CLEAR>(
  Types.Literals.CLEAR,
);

export const record = interfaceGenerator<
  Types.Literals.RECORD,
  Types.Record.UserInput
>(Types.Literals.RECORD);

export const startRecording = interfaceGenerator<
  Types.Literals.START_RECORDING,
  Types.StartRecording.UserInput
>(Types.Literals.START_RECORDING);

export const stopRecording = interfaceGenerator<
  Types.Literals.STOP_RECORDING,
  Types.StopRecording.UserInput
>(Types.Literals.STOP_RECORDING);

export const exportWav = interfaceGenerator<
  Types.Literals.EXPORT_WAV,
  Types.ExportWAV.UserInput,
  Types.ExportWAV.WorkerOutput
>(Types.Literals.EXPORT_WAV);

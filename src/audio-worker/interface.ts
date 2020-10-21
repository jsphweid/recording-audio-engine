import * as Types from "./types";
import audioWorker from "./worker";

const createQuickUUID = () => {
  // http://www.ietf.org/rfc/rfc4122.txt
  const s = [];
  const hexDigits = "0123456789abcdef";
  for (let i = 0; i < 36; i++) {
    s[i] = hexDigits.substr(Math.floor(Math.random() * 0x10), 1);
  }
  s[14] = "4"; // bits 12-15 of the time_hi_and_version field to 0010
  // tslint:disable-next-line:no-bitwise
  s[19] = hexDigits.substr(((s as any)[19] & 0x3) | 0x8, 1); // bits 6-7 of the clock_seq_hi_and_reserved to 01
  s[8] = s[13] = s[18] = s[23] = "-";

  const uuid = s.join("");
  return uuid;
};

const generatePromiseKey = (command: string) =>
  `${command}_${new Date().getTime()}_${createQuickUUID()}`;

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
  Types.Literals.START_RECORDING
>(Types.Literals.START_RECORDING);

export const stopRecording = interfaceGenerator<Types.Literals.STOP_RECORDING>(
  Types.Literals.STOP_RECORDING,
);

export const exportWav = interfaceGenerator<
  Types.Literals.EXPORT_WAV,
  Types.ExportWAV.UserInput,
  Types.ExportWAV.WorkerOutput
>(Types.Literals.EXPORT_WAV);

import * as AudioWorker from "./audio-worker";
import { DEFAULT_BUFFER_SIZE, DEFAULT_NUMBER_OF_CHANNELS } from "./constants";

// const getStream = (): Promise<MediaStream> =>
//   navigator.mediaDevices.getUserMedia({ audio: true });

const getStreamAndAudioContext = (): Promise<{
  stream: MediaStream;
  audioContext: AudioContext;
}> => {
  // Important... Stream / AudioContext must be created in this particular order!
  return new Promise((resolve, reject) => {
    navigator.getUserMedia =
      navigator.getUserMedia || (navigator as any).webkitGetUserMedia;

    navigator.getUserMedia(
      { audio: true },
      stream => {
        const win: any = window;
        win.AudioContext = win.AudioContext || win.webkitAudioContext;
        const audioContext: AudioContext = new win.AudioContext();
        resolve({ stream, audioContext });
      },
      reject,
    );
  });
};

const getDefaultSource = (): Promise<MediaStreamAudioSourceNode> =>
  getStreamAndAudioContext().then(({ stream, audioContext }) =>
    audioContext.createMediaStreamSource(stream),
  );

// TODO: make constants from events

interface Config {
  bufferLength: 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384;
  numberOfChannels: 1 | 2;
  mimeType: "audio/wav"; // in the future, more types can be supported...
}

// const WorkerToMainCommands = {
//   getBuffer: () => null,
//   exportWAV: () => null,
// };

// type MainToWorkerCommands = "init"; // more

// type AllCommandNames =
//   | MainToWorkerCommands
//   | (keyof typeof WorkerToMainCommands);

class Recorder {
  private config: Config = {
    bufferLength: DEFAULT_BUFFER_SIZE,
    numberOfChannels: DEFAULT_NUMBER_OF_CHANNELS,
    mimeType: "audio/wav",
  };

  private audioContext: BaseAudioContext | null = null;

  public async initialize(
    _source?: AudioNode,
    _config: Partial<Config> = {},
  ): Promise<void> {
    console.log("Initializing Audio Engine....");
    const source = _source || (await getDefaultSource());
    this.config = { ...this.config, ..._config };

    const audioContext = source.context;
    const node: ScriptProcessorNode = (
      audioContext.createScriptProcessor ||
      (audioContext as any).createJavaScriptNode
    ).call(
      audioContext,
      this.config.bufferLength,
      this.config.numberOfChannels,
      this.config.numberOfChannels,
    );

    const createTransferableAudioBuffer = (
      audioBuffer: AudioBuffer,
    ): Float32Array[] => {
      // Because you can't transfer an AudioBuffer to a WebWorker

      // use transferable objects? https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers, https://developers.google.com/web/updates/2011/12/Transferable-Objects-Lightning-Fast
      const buffer = [];
      for (let channel = 0; channel < this.config.numberOfChannels; channel++) {
        buffer.push(audioBuffer.getChannelData(channel));
      }
      return buffer;
    };

    node.onaudioprocess = e => {
      const audioBuffer = e.inputBuffer;
      AudioWorker.record({
        buffer: createTransferableAudioBuffer(audioBuffer),
        sampleStartTime: audioContext.currentTime - audioBuffer.duration,
      });
    };

    source.connect(node);
    node.connect(audioContext.destination);

    this.audioContext = audioContext;

    return AudioWorker.init({
      sampleRate: audioContext.sampleRate,
      numberOfChannels: this.config.numberOfChannels,
      bufferLength: this.config.bufferLength
    });
  }

  private withAudioContext = (): Promise<BaseAudioContext> =>
    new Promise((resolve, reject) =>
      this.audioContext
        ? resolve(this.audioContext)
        : reject(new Error("You must run `initialize` first...")),
    );

  public start() {
    return this.withAudioContext().then(context => {
      return AudioWorker.startRecording({ time: context.currentTime });
    });
  }

  public stop() {
    return this.withAudioContext().then(context => {
      return AudioWorker.stopRecording({ time: context.currentTime });
    });
  }

  public clear() {
    AudioWorker.clear({}); // TODO: don't do {}
  }

  public exportWAV = (): Promise<Blob> =>
    AudioWorker.exportWav({ mimeType: this.config.mimeType }).then(
      data => data.blob,
    );

  public static forceDownload(
    blob: Blob,
    filename: string = "output.wav",
  ): void {
    console.log("blob", blob);
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}

export default Recorder;

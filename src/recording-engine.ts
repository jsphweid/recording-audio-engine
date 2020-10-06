import * as AudioWorker from "./audio-worker";

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
    bufferLength: 4096,
    numberOfChannels: 2,
    mimeType: "audio/wav",
  };

  private recording = false;

  public async initialize(
    _source?: AudioNode,
    _config: Partial<Config> = {},
  ): Promise<void> {
    await new Promise(resolve => {
      setTimeout(() => {
        resolve("Promise A win!");
      }, 1000);
    });

    // TODO: change any
    console.log("Initializing Audio Engine....");
    const source = _source || (await getDefaultSource());
    this.config = { ...this.config, ..._config };

    const context = source.context;
    const node: ScriptProcessorNode = (
      context.createScriptProcessor || (context as any).createJavaScriptNode
    ).call(
      context,
      this.config.bufferLength,
      this.config.numberOfChannels,
      this.config.numberOfChannels,
    );

    node.onaudioprocess = e => {
      if (!this.recording) return;
      console.log("processing", e);
      const buffer = [];
      for (let channel = 0; channel < this.config.numberOfChannels; channel++) {
        buffer.push(e.inputBuffer.getChannelData(channel));
      }
      AudioWorker.saveBuffer({ buffer });
    };

    source.connect(node);
    node.connect(context.destination); // this should not be necessary

    return AudioWorker.initWorker({
      sampleRate: context.sampleRate,
      numberOfChannels: this.config.numberOfChannels,
    });
  }

  public start() {
    this.recording = true;
  }

  public stop() {
    this.recording = false;
  }

  public clear() {
    AudioWorker.clear();
  }

  public exportWAV = (): Promise<Blob> =>
    AudioWorker.exportWAV({ mimeType: this.config.mimeType });

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

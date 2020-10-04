import audioWorker from "./audio-worker";

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

  // private callbacks = {
  //   getBuffer: [],
  //   exportWAV: [],
  // };

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
    console.log("initializing....");
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
      audioWorker.postMessage({
        command: "record",
        buffer,
      });
    };

    source.connect(node);
    node.connect(context.destination); // this should not be necessary

    audioWorker.postMessage({
      command: "init",
      config: {
        sampleRate: context.sampleRate,
        numberOfChannels: this.config.numberOfChannels, // TODO: need types to share here...
      },
    });

    // audioWorker.onmessage = e => {
    //   const cb = this.callbacks[e.data.command].pop();
    //   if (typeof cb === "function") {
    //     cb(e.data.data);
    //   }
    // };
  }

  public start() {
    this.recording = true;
  }

  public stop() {
    this.recording = false;
  }

  public clear() {
    audioWorker.postMessage({ command: "clear" });
  }

  // public getBuffer(cb) {
  //   cb = cb || this.config.callback;
  //   if (!cb) throw new Error("Callback not set");

  //   this.callbacks.getBuffer.push(cb);

  //   this.audioWorker.postMessage({ command: "getBuffer" });
  // }

  public exportWAV(cb: (blob: Blob) => void) {
    const mimeType = this.config.mimeType;
    if (!cb) throw new Error("Callback not set");

    // this.callbacks.exportWAV.push(cb);

    audioWorker.onmessage = e => {
      console.log("main received message", e);
      cb(e.data.data);
    };

    audioWorker.postMessage({
      command: "exportWAV",
      type: mimeType,
    });
  }

  public static forceDownload(blob: Blob, filename: string): void {
    console.log("blob", blob);
    const url = window.URL.createObjectURL(blob);
    const link = window.document.createElement("a");
    link.href = url;
    link.download = filename || "output.wav";
    link.click();
    window.URL.revokeObjectURL(url);
    // const click = document.createEvent("Event");
    // click.initEvent("click", true, true);
    // link.dispatchEvent(click);
  }
}

export default Recorder;

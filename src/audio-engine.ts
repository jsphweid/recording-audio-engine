import * as AudioWorker from "./audio-worker";
import { DEFAULT_BUFFER_SIZE, DEFAULT_NUMBER_OF_CHANNELS } from "./constants";
import { PlayableAudio } from "./playable-audio";
import { ScheduledAudioEvent } from "./scheduled-audio-event";
import { Time } from "./time";

const getAudioContext = (): AudioContext => {
  const win: any = window;
  win.AudioContext = win.AudioContext || win.webkitAudioContext;
  return new win.AudioContext();
};

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
        const audioContext = getAudioContext();
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

interface Config {
  bufferLength: 256 | 512 | 1024 | 2048 | 4096 | 8192 | 16384;
  numberOfChannels: 1 | 2;
  mimeType: "audio/wav";
}

class AudioEngine {
  private config: Config = {
    bufferLength: DEFAULT_BUFFER_SIZE,
    numberOfChannels: DEFAULT_NUMBER_OF_CHANNELS,
    mimeType: "audio/wav",
  };

  private source: AudioNode | null = null;
  private audioContext: BaseAudioContext | null = null;

  public primeRecorder = async (
    _source?: AudioNode,
    _config: Partial<Config> = {},
  ): Promise<void> => {
    console.log("Initializing Audio Engine....");
    this.source = _source || (await getDefaultSource());
    this.config = { ...this.config, ..._config };

    const audioContext = this.source.context;
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

    this.source.connect(node);
    node.connect(audioContext.destination);

    this.audioContext = audioContext;

    return AudioWorker.init({
      sampleRate: audioContext.sampleRate,
      numberOfChannels: this.config.numberOfChannels,
      bufferLength: this.config.bufferLength,
    });
  };

  private withAudioContext = (
    options: {
      requireRecorder?: boolean;
    } = {},
  ): Promise<BaseAudioContext> =>
    (options.requireRecorder
      ? this.withRecorderInitialized()
      : Promise.resolve()
    ).then(() => this.audioContext || getAudioContext());

  private withRecorderInitialized = (): Promise<void> =>
    this.source ? Promise.resolve() : this.primeRecorder();

  public startRecording = () =>
    this.withAudioContext({ requireRecorder: true }).then(context =>
      AudioWorker.startRecording({ time: context.currentTime }),
    );

  public stopRecording = () =>
    this.withAudioContext().then(context =>
      AudioWorker.stopRecording({ time: context.currentTime }),
    );

  public clear = () => {
    AudioWorker.clear({}); // TODO: don't do {}
  };

  public exportWAV = (): Promise<Blob> =>
    AudioWorker.exportWav({ mimeType: this.config.mimeType }).then(
      data => data.blob,
    );

  public getRelativeTime = (
    context: AudioContext | BaseAudioContext,
    time: Time.AllTypes,
    relativeTimeFnCalled: number,
  ): number =>
    // TODO: could be smoother if we had logged when the audio context time started
    Time.when(time, {
      secondsOffset: seconds => seconds + relativeTimeFnCalled,
      atDate: date => {
        const contextStartDate = new Date(
          Date.now() - context.currentTime * 1000,
        );

        if (date < contextStartDate) {
          throw new Error(
            "Desired start time was before AudioContext initialized!",
          );
        } else if (date < new Date()) {
          throw new Error(
            "Desired start time was before now. This isn't currently supported.",
          );
        }

        return (date.getTime() - contextStartDate.getTime()) / 1000;
      },
    });

  public playImmediately = (playableAudio: PlayableAudio.AllTypes) =>
    this.schedule([
      {
        type: ScheduledAudioEvent.Type.PlayEvent,
        timeRange: {
          start: { offset: 0 },
        },
        data: playableAudio,
      },
    ]);

  public schedule = (scheduledEvents: ScheduledAudioEvent.Event[]) =>
    this.withAudioContext({
      requireRecorder: scheduledEvents.some(
        event => event.type === ScheduledAudioEvent.Type.RecordEvent,
      ),
    }).then(context => {
      const { currentTime } = context;

      scheduledEvents.forEach(_ => {
        // TODO: make sure no events overlap with each other -- and existing...
      });

      scheduledEvents.forEach(event => {
        ScheduledAudioEvent.when(event, {
          record: () => {
            // TODO: handle...
          },
          play: playEvent => {
            const source = context.createBufferSource();
            source.buffer = PlayableAudio.conformToAudioBuffer(
              playEvent.data,
              context,
            );
            source.connect(context.destination);

            const startTime = this.getRelativeTime(
              context,
              playEvent.timeRange.start,
              currentTime,
            );

            const endTime = playEvent.timeRange.end
              ? this.getRelativeTime(
                  context,
                  playEvent.timeRange.end,
                  currentTime,
                )
              : undefined;

            const duration = endTime ? endTime - startTime : undefined;

            // In the future, we could have an option here
            // to offset the buffer if it's behind the timing
            const bufferOffset = 0;

            source.start(startTime, bufferOffset, duration);
          },
        });
      });
    });
}

export default new AudioEngine();

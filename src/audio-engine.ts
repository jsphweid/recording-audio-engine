import Audio from "./audio";
import AudioWorker from "./audio-worker";
import { DEFAULT_BUFFER_SIZE, DEFAULT_NUMBER_OF_CHANNELS } from "./constants";
import { makeTimeoutPromise } from "./helpers";
import { PlayableAudio } from "./playable-audio";
import { ScheduledAudioEvent } from "./scheduled-audio-event";
import { Time } from "./time";

const getAudioContext = (): AudioContext => {
  const win: any = window;
  win.AudioContext = win.AudioContext || win.webkitAudioContext;
  return new win.AudioContext({ latencyHint: "balanced" });
};

const getStreamAndAudioContext = (): Promise<{
  stream: MediaStream;
  audioContext: AudioContext;
}> => {
  // Important... Stream / AudioContext must be created in this particular order!
  return new Promise((resolve, reject) => {
    navigator.getUserMedia =
      navigator.getUserMedia ||
      (navigator as any).webkitGetUserMedia ||
      (navigator as any).mozGetUserMedia ||
      (navigator as any).msGetUserMedia;

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

  private lastStart: number | null = null;
  private lastEnd: number | null = null;

  public primeRecorder = async (
    _source?: AudioNode,
    _config: Partial<Config> = {},
  ): Promise<void> => {
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
      const currentTime = audioContext.currentTime;
      // This operates under the assumption that `onaudioprocess`
      // is called the exact moment the buffer is finished
      const audioBuffer = e.inputBuffer;
      AudioWorker.record({
        buffer: createTransferableAudioBuffer(audioBuffer),
        sampleStartTime: currentTime - audioBuffer.duration,
      });
    };

    this.source.connect(node);
    node.connect(audioContext.destination); // this shouldn't be necessary

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
    this.withAudioContext({ requireRecorder: true }).then(context => {
      this.lastStart = context.currentTime;
      return AudioWorker.startRecording({});
    });

  public stopRecording = () =>
    this.withAudioContext().then(context => {
      this.lastEnd = context.currentTime;
      return AudioWorker.stopRecording({});
    });

  public clear = () => {
    AudioWorker.clear({}); // TODO: don't do {}
  };

  public exportLastRecording = (): Promise<Audio> => {
    if (!this.lastStart || !this.lastEnd) {
      throw new Error("Need to record something before trying to export...");
    }
    return AudioWorker.extractRangeFromLastRecorded({
      start: this.lastStart,
      end: this.lastEnd,
    }).then(data => new Audio(data.buffers));
  };

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
    ]).then(results => results[0]);

  private getPlaybackLatency = (
    scheduledEvents: ScheduledAudioEvent.Event[],
    context: AudioContext | BaseAudioContext,
  ) => {
    const numRecordEvents = scheduledEvents.filter(ScheduledAudioEvent.isRecord)
      .length;
    const numPlayEvents = scheduledEvents.filter(ScheduledAudioEvent.isPlay)
      .length;
    if (numRecordEvents === 0 || numPlayEvents === 0) {
      // No need to adjust timings if there aren't both kinds of events
      return 0;
    }

    // TOOD: this isn't correct and there are other problems on why things aren't lining up
    const latency =
      // only currently exists in firefox
      (context as any).outputLatency ||
      // not necessarily accurate, but seems to be close to `outputLatency`
      context.currentTime - (context as any).getOutputTimestamp().contextTime;

    return latency;
  };

  // TODO: fix any
  public schedule = (
    scheduledEvents: ScheduledAudioEvent.Event[],
  ): Promise<Array<Audio | null>> => {
    const allRecordingEvents = scheduledEvents.filter(
      ScheduledAudioEvent.isRecord,
    );
    const containsAtLeastOnRecordEvent = allRecordingEvents.length > 0;
    return this.withAudioContext({
      requireRecorder: containsAtLeastOnRecordEvent,
    }).then(context => {
      const { currentTime } = context;
      const latency = this.getPlaybackLatency(scheduledEvents, context);

      scheduledEvents.forEach(_ => {
        // TODO: make sure no events overlap with each other -- and existing...
      });

      const promises: Array<Promise<Audio | null>> = [];

      let recordingChunkPromise: Promise<void> | null = null;

      if (containsAtLeastOnRecordEvent) {
        const firstStart = Math.min(
          ...allRecordingEvents.map(event =>
            this.getRelativeTime(context, event.timeRange.start, currentTime),
          ),
        );
        const lastEnd = Math.max(
          ...allRecordingEvents.map(event =>
            this.getRelativeTime(context, event.timeRange.end, currentTime),
          ),
        );

        const padding = 0.1;

        const startOffset = Math.max(firstStart - currentTime - padding, 0);

        recordingChunkPromise = makeTimeoutPromise(startOffset)
          .then(() => this.startRecording())
          .then(() => makeTimeoutPromise(lastEnd - firstStart + 2 * padding))
          .then(() => this.stopRecording())
          .then(() => this.exportLastRecording())
          .then(audio => audio.forceDownload());
      }

      scheduledEvents.forEach(event => {
        ScheduledAudioEvent.when(event, {
          record: recordEvent => {
            // if we get here, this definitely is a promise...
            recordingChunkPromise = recordingChunkPromise as Promise<void>;

            const promise = recordingChunkPromise.then(() => {
              const data = {
                start:
                  this.getRelativeTime(
                    context,
                    recordEvent.timeRange.start,
                    currentTime,
                  ) + latency,
                end:
                  this.getRelativeTime(
                    context,
                    recordEvent.timeRange.end,
                    currentTime,
                  ) + latency,
              };

              return AudioWorker.extractRangeFromLastRecorded(data).then(
                data => {
                  const audio = new Audio(data.buffers);
                  audio.forceDownload();
                  return audio;
                },
              );
            });
            promises.push(promise);
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
              : startTime + source.buffer.length / source.buffer.sampleRate;
            const duration = endTime - startTime;

            // In the future, we could have an option here
            // to offset the buffer if it's behind the timing
            const bufferOffset = 0;

            source.start(startTime, bufferOffset, duration);
            promises.push(
              makeTimeoutPromise(endTime - currentTime).then(() => null),
            );
          },
        });
      });
      return Promise.all(promises);
    });
  };
}

export default new AudioEngine();

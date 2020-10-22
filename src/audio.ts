import AudioWorker from "./audio-worker";
import { RawAudio } from "./raw-audio";

class Audio {
  private rawAudioData: Float32Array[];

  constructor(audioInput: RawAudio.AllTypes) {
    this.rawAudioData = RawAudio.conformToSimpleRawAudioData(audioInput);
  }

  public toAudioBuffer = (
    audioContext: AudioContext | BaseAudioContext,
  ): AudioBuffer =>
    RawAudio.conformToAudioBuffer(this.rawAudioData, audioContext);

  public toWAVBlob = (): Promise<Blob> =>
    AudioWorker.createWav({ rawAudioData: this.rawAudioData }).then(
      data => data.blob,
    );
}

export default Audio;

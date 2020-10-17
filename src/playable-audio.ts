import { RawAudio } from "./raw-audio";

export namespace PlayableAudio {
  export enum Type {
    Raw,
  }

  interface Contract<A extends Type> {
    type: A;
    sampleRate: number;
  }
  interface Raw extends Contract<Type.Raw> {
    rawData: RawAudio.AllTypes;
  }

  export type AllTypes = Raw; // | Others...

  const isRaw = (input: AllTypes): input is Raw => input.type === Type.Raw;

  export const conformToAudioBuffer = (
    playableAudio: AllTypes,
    audioContext: AudioContext | BaseAudioContext,
  ): AudioBuffer => {
    const { sampleRate } = playableAudio;
    if (sampleRate !== audioContext.sampleRate) {
      throw new Error("Resampling is not yet supported...");
    }

    if (isRaw(playableAudio)) {
      return RawAudio.conformToAudioBuffer(playableAudio.rawData, audioContext);
    }

    throw new Error(
      "Can't conform Playable Audio to AudioBuffer because type wasn't handled.",
    );
  };
}

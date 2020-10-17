export namespace RawAudio {
  export type MonoFloat32Array = Float32Array;
  export type StereoFloat32Array = Float32Array[];
  export type MonoArray = number[];
  export type StereoArray = number[][];

  export type AllTypes =
    | MonoFloat32Array
    | StereoFloat32Array
    | MonoArray
    | StereoArray;

  /**
   * i.e. `new Float32Array()`
   */
  export const isMonoFloat32Array = (input: any): input is MonoFloat32Array =>
    input instanceof Float32Array;

  /**
   * i.e. `[new Float32Array(), new Float32Array()]`
   */
  export const isStereoFloat32Array = (
    input: any,
  ): input is StereoFloat32Array =>
    Array.isArray(input) &&
    input.length === 2 &&
    input.every((arr, _, all) => arr.length === all[0].length) && // each arr is same length
    input.every(item => item instanceof Float32Array);

  /**
   * i.e. `[0, 1, 0, -1, 0, 1]`
   */
  export const isMonoArray = (input: any): input is MonoArray =>
    Array.isArray(input) && input.every(item => Number.isFinite(item));

  /**
   * i.e. `[[0, 1, 0, -1, 0, 1], [0, 1, 0, -1, 0, 1]]`
   */
  export const isStereoArray = (input: any): input is StereoArray =>
    Array.isArray(input) &&
    input.length === 2 &&
    input.every((arr, _, all) => arr.length === all[0].length) && // each arr is same length
    input.every(
      arr => Array.isArray(arr) && arr.every(item => Number.isFinite(item)),
    );

  export const conformToAudioBuffer = (
    rawAudio: AllTypes,
    audioContext: AudioContext | BaseAudioContext,
  ): AudioBuffer => {
    if (isMonoArray(rawAudio) || isMonoFloat32Array(rawAudio)) {
      const float32Array = new Float32Array(rawAudio);
      const audioBuffer = audioContext.createBuffer(
        1,
        rawAudio.length,
        audioContext.sampleRate,
      );
      audioBuffer.copyToChannel(float32Array, 0, 0);
      return audioBuffer;
    } else if (isStereoArray(rawAudio) || isStereoFloat32Array(rawAudio)) {
      const audioBuffer = audioContext.createBuffer(
        2,
        rawAudio[0].length,
        audioContext.sampleRate,
      );
      const rawAudioAsStereoFloat32Array = isStereoArray(rawAudio)
        ? rawAudio.map(arr => new Float32Array(arr))
        : rawAudio;
      rawAudioAsStereoFloat32Array.forEach((channelData, i) => {
        audioBuffer.copyToChannel(channelData, i, 0);
        audioBuffer.copyToChannel(channelData, i, 0);
      });

      return audioBuffer;
    }
    throw new Error(
      "Can't conform Raw Audio to AudioBuffer because that type wasn't handled.",
    );
  };
}

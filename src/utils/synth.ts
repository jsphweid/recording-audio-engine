export const createMonoSineWave = (
  sampleRate: number,
  frequency: number,
  duration: number,
): Float32Array => {
  const lengthOfSamples = sampleRate * duration;
  const ret = new Float32Array(lengthOfSamples);
  for (let i = 0; i < lengthOfSamples; i++) {
    ret[i] = Math.sin(i / (sampleRate / frequency / (Math.PI * 2)));
  }
  return ret;
};

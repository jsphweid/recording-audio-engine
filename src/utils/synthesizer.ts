import audioContextInstance from "../audio-context";
import MonoRecording from "../mono-recording";

export function makeSynthesizedMonoRecording(
  recordings: MonoRecording[],
): MonoRecording {
  const buffers = recordings.map(({ audioBuffer }) => audioBuffer);
  let maxChannels = 0;
  let maxDuration = 0;

  for (const buffer of buffers) {
    if (buffer.numberOfChannels > maxChannels) {
      maxChannels = buffer.numberOfChannels;
    }
    if (buffer.duration > maxDuration) {
      maxDuration = buffer.duration;
    }
  }

  const outBuffer = audioContextInstance.createBuffer(
    maxChannels,
    audioContextInstance.sampleRate * maxDuration,
    audioContextInstance.sampleRate,
  );

  for (const buffer of buffers) {
    for (
      let srcChannel = 0;
      srcChannel < buffer.numberOfChannels;
      srcChannel++
    ) {
      const outt = outBuffer.getChannelData(srcChannel);
      const inn = buffer.getChannelData(srcChannel);
      const innLength = inn.length;
      for (let i = 0; i < innLength; i++) {
        outt[i] += inn[i];
      }
      outBuffer.getChannelData(srcChannel).set(outt, 0);
    }
  }

  return new MonoRecording(outBuffer.getChannelData(0));
}

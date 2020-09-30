import audioContextInstance from "../audio-context";

export function float32ToMonoAudioBuffer(
  float32Data: Float32Array,
  sampleRate: number = audioContextInstance.sampleRate,
): AudioBuffer {
  const finalBuffer = audioContextInstance.createBuffer(
    1,
    float32Data.length,
    sampleRate,
  );

  finalBuffer.copyToChannel(float32Data, 0, 0);
  return finalBuffer;
}

export function decodeAudioData(
  arrayBuffer: ArrayBuffer,
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    audioContextInstance.decodeAudioData(
      arrayBuffer,
      (buffer: AudioBuffer) => resolve(buffer),
      (error: any) => reject(error),
    );
  });
}

export function exportBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader();
    fileReader.onloadend = () => {
      const result = fileReader.result as string;
      if (result) {
        resolve(result);
      } else {
        reject("Could not convert blob to base 64 string.");
      }
    };
    fileReader.readAsDataURL(blob);
  });
}

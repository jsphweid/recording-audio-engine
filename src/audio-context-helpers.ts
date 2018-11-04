import { audioContextInstance } from '.'

export function float32ToAudioBuffer(float32Data: Float32Array): AudioBuffer {
  const finalBuffer = audioContextInstance.createBuffer(
    1,
    float32Data.length,
    audioContextInstance.sampleRate
  )

  finalBuffer.copyToChannel(float32Data, 0, 0)
  return finalBuffer
}

export function decodeAudioData(
  arrayBuffer: ArrayBuffer
): Promise<AudioBuffer> {
  return new Promise((resolve, reject) => {
    audioContextInstance.decodeAudioData(
      arrayBuffer,
      (buffer: AudioBuffer) => resolve(buffer),
      (error: any) => reject(error)
    )
  })
}

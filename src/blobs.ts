import WavEncoder from './wav-encoder'

export function makeWavBlobFromFloat32Arr(float32Data: Float32Array): Blob {
  const wavEncoder = new WavEncoder(1)
  wavEncoder.encode([float32Data])
  return wavEncoder.finish()
}

export function exportBlobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const fileReader = new FileReader()
    fileReader.onloadend = () => {
      const result = fileReader.result as string
      if (result) {
        resolve(result)
      } else {
        reject('Could not convert blob to base 64 string.')
      }
    }
    fileReader.readAsDataURL(blob)
  })
}

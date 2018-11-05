export function flattenFloat32Arrays(arrs: Float32Array[]): Float32Array {
  const newArrs = arrs.map(arr => Array.from(arr))
  const flattened = [].concat.apply([], newArrs)
  return new Float32Array(flattened)
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

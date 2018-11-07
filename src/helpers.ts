export function flattenFloat32Arrays(arrs: Float32Array[]): Float32Array {
  const newArrs = arrs.map(arr => Array.from(arr))
  const flattened = [].concat.apply([], newArrs)
  return new Float32Array(flattened)
}

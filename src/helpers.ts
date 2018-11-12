export function flattenFloat32Arrays(arrs: Float32Array[]): Float32Array {
  const newArrs = arrs.map(arr => Array.from(arr))
  const flattened = [].concat.apply([], newArrs)
  return new Float32Array(flattened)
}

export function makeTimeoutPromise(milli: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(resolve, milli)
  })
}

export function hasWasmSupport(): boolean {
  try {
    const win = window as any
    const webassembly = win.WebAssembly
    if (
      typeof webassembly === 'object' &&
      typeof webassembly.instantiate === 'function'
    ) {
      const module = new webassembly.Module(
        Uint8Array.of(0x0, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00)
      )
      if (module instanceof webassembly.Module) {
        return new webassembly.Instance(module) instanceof webassembly.Instance
      }
    }
  } catch (e) {
    // go on
  }
  return false
}

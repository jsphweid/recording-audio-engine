import { exportBlobAsBase64 } from '../../utils'
import { encodeMono } from './wav'

describe('wav encoder', () => {
  it('should make a simple wav file', async () => {
    const data = new Float32Array([1, 0, -1, 0])
    const wavBlob = encodeMono(data)
    expect(await exportBlobAsBase64(wavBlob)).toEqual(
      'data:audio/wav;base64,UklGRiwAAABXQVZFZm10IBAAAAABAAEARKwAABCxAgACABAAZGF0YQgAAAD/fwAAAYAAAA=='
    )
  })
})

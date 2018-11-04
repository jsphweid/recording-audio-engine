import { float32ToAudioBuffer } from './audio-context-helpers'
import { makeWavBlobFromFloat32Arr } from './blobs'

export default class Recording {
  public rawData: Float32Array
  constructor(rawData: Float32Array) {
    // some validation that makes sure none of the getters will fail
    this.rawData = rawData
  }

  public get wavBlob(): Blob {
    return makeWavBlobFromFloat32Arr(this.rawData)
  }

  public get audioBuffer(): AudioBuffer {
    return float32ToAudioBuffer(this.rawData)
  }
}

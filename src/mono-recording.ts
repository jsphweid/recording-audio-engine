import { float32ToMonoAudioBuffer } from './audio-context/utils'
import { encodeMono } from './encoders/wav'

export default class MonoRecording {
  public rawData: Float32Array
  constructor(rawData: Float32Array) {
    // some validation that makes sure none of the getters will fail
    this.rawData = rawData
  }

  public get wavBlob(): Blob {
    return encodeMono(this.rawData)
  }

  public get audioBuffer(): AudioBuffer {
    return float32ToMonoAudioBuffer(this.rawData)
  }
}

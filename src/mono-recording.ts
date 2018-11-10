import AudioContextInstance from './audio-context'
import { encodeMono } from './encoders/wav'
import { makeTimeoutPromise } from './helpers'
import { float32ToMonoAudioBuffer } from './utils'

type MonoProcessor = (arr: Float32Array) => Float32Array

export default class MonoRecording {
  public rawData: Float32Array
  public createDate: Date
  public sampleRate: number
  public duration: number
  private earlyStopResolver: (() => void) | undefined

  constructor(
    rawData: Float32Array,
    sampleRate = AudioContextInstance.sampleRate
  ) {
    // some validation that makes sure none of the getters will fail

    this.rawData = rawData
    this.sampleRate = sampleRate

    // may not work on files imported from another sample rate
    this.duration = this.rawData.length / this.sampleRate
    this.createDate = new Date()
  }

  public get wavBlob(): Blob {
    return encodeMono(this.rawData, this.sampleRate)
  }

  public get audioBuffer(): AudioBuffer {
    return float32ToMonoAudioBuffer(this.rawData, this.sampleRate)
  }

  public applyMonoProcessors(processors: MonoProcessor[]): void {
    processors.forEach(processor => (this.rawData = processor(this.rawData)))
  }

  public play(): Promise<void> {
    const blobUrl = URL.createObjectURL(this.wavBlob)
    const audioElement: HTMLAudioElement = new Audio(blobUrl)
    audioElement.play()
    return Promise.race([
      new Promise(resolve => (this.earlyStopResolver = resolve)),
      makeTimeoutPromise(this.duration * 1000)
    ]).then(() => {
      audioElement.pause()
      this.earlyStopResolver = undefined
      return
    })
  }

  public stop(): void {
    if (this.earlyStopResolver) {
      this.earlyStopResolver()
    }
  }
}

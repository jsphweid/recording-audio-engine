import { audioContextInstance } from '.'

export default class WavEncoder {
  private sampleRate: number
  private numChannels: number
  private numSamples: number
  private dataViews: DataView[]

  constructor(numChannels: number) {
    this.sampleRate = audioContextInstance.sampleRate
    this.numChannels = numChannels
    this.numSamples = 0
    this.dataViews = []
  }

  public encode(buffers: Float32Array[]): void {
    const len = buffers[0].length
    const view = new DataView(new ArrayBuffer(len * this.numChannels * 2))
    let offset = 0

    for (let i = 0; i < len; ++i) {
      for (let ch = 0; ch < this.numChannels; ++ch) {
        const x = buffers[ch][i] * 0x7fff
        view.setInt16(
          offset,
          x < 0 ? Math.max(x, -0x8000) : Math.min(x, 0x7fff),
          true
        )
        offset += 2
      }
    }

    this.dataViews.push(view)
    this.numSamples += len
  }

  public finish(): Blob {
    const dataSize: number = this.numChannels * this.numSamples * 2
    const view: DataView = new DataView(new ArrayBuffer(44))
    this.setString(view, 0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    this.setString(view, 8, 'WAVE')
    this.setString(view, 12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, this.numChannels, true)
    view.setUint32(24, this.sampleRate, true)
    view.setUint32(28, this.sampleRate * 4, true)
    view.setUint16(32, this.numChannels * 2, true)
    view.setUint16(34, 16, true)
    this.setString(view, 36, 'data')
    view.setUint32(40, dataSize, true)
    this.dataViews.unshift(view)
    const blob = new Blob(this.dataViews, { type: 'audio/wav' })
    this.cleanup()
    return blob
  }

  public cleanup(): void {
    delete this.dataViews
    this.dataViews = []
  }

  private setString(view: DataView, offset: number, str: string): void {
    const len = str.length
    for (let i = 0; i < len; ++i) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }
}

if (typeof window === 'undefined') {
  class AudioContext {
    public sampleRate = 44100
  }
  ;(global as any).window = { AudioContext }
}

export default new (window as any).AudioContext() as AudioContext

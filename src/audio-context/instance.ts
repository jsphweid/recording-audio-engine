if (typeof window === 'undefined') {
  ;(global as any).window = {}
}

const win = window as any

if (!win.AudioContext) {
  console.log('No audio context, likely because test env. Creating one...')
  win.AudioContext = class {
    public sampleRate = 44100
  }
}
export default new win.AudioContext() as AudioContext

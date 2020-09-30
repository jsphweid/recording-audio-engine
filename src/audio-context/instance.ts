if (typeof window === "undefined") {
  (global as any).window = {};
}

const win = window as any;

if (!win.AudioContext) {
  win.AudioContext = class {
    public sampleRate = 44100;
  };
}
export default new win.AudioContext() as AudioContext;

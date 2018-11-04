import audioContextInstance from './audio-context'
import AudioEngine from './audio-engine'
import { makeSynthesizedRecording } from './synthesize'

const audioEngineInstance = new AudioEngine()

export { audioEngineInstance, audioContextInstance, makeSynthesizedRecording }

import { MAX_RECORDING_SECONDS } from './constants'
import MonoRecording from './mono-recording'
import {
  connectRecordingNodes,
  disconnectRecordingNodes
} from './recording-nodes'

let stopRecordingResolver: () => void

const makePromiseWithExternalHandlers = (): Promise<MonoRecording> => {
  return new Promise(resolve => (stopRecordingResolver = resolve))
}

const makeTimeoutPromise = (milli: number): Promise<MonoRecording> => {
  return new Promise(resolve => {
    setTimeout(resolve, milli)
  })
}

export function startRecording(
  maxLengthSeconds = MAX_RECORDING_SECONDS
): Promise<MonoRecording> {
  connectRecordingNodes()
  return Promise.race([
    makePromiseWithExternalHandlers(),
    makeTimeoutPromise(maxLengthSeconds * 1000)
  ]).then(() => {
    const audioData = disconnectRecordingNodes()
    return new MonoRecording(audioData)
  })
}

export function stopRecording(): void {
  stopRecordingResolver()
}

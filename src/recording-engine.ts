import { MAX_RECORDING_SECONDS } from './constants'
import { makeTimeoutPromise } from './helpers'
import MonoRecording from './mono-recording'
import {
  connectRecordingNodes,
  disconnectRecordingNodes
} from './recording-nodes'

let stopRecordingResolver: () => void

const makePromiseWithExternalHandlers = (): Promise<MonoRecording> => {
  return new Promise(resolve => (stopRecordingResolver = resolve))
}

export function startRecording(
  maxLengthSeconds = MAX_RECORDING_SECONDS
): Promise<MonoRecording> {
  return connectRecordingNodes().then(() => {
    console.log('connectRecordingNodes done')
    return Promise.race([
      makePromiseWithExternalHandlers(),
      makeTimeoutPromise(maxLengthSeconds * 1000)
    ]).then(() => {
      const audioData = disconnectRecordingNodes()
      console.log('audioData', audioData)
      return new MonoRecording(audioData)
    })
  })
}

export function stopRecording(): void {
  console.log('calling stopRecordingResolver')
  stopRecordingResolver()
}

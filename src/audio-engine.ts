import Recording from './recording'
import {
  connectRecordingNodes,
  disconnectRecordingNodes
} from './recording-nodes'

export let latestRecording: Recording | null = null

export function startRecording(): void {
  connectRecordingNodes()
}

export function stopRecording(): void {
  const audioData = disconnectRecordingNodes()
  latestRecording = new Recording(audioData)
}

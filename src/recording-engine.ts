import MonoRecording from './mono-recording'
import {
  connectRecordingNodes,
  disconnectRecordingNodes
} from './recording-nodes'

export let latestRecording: MonoRecording | null = null

export function startRecording(): void {
  connectRecordingNodes()
}

export function stopRecording(): void {
  const audioData = disconnectRecordingNodes()
  latestRecording = audioData ? new MonoRecording(audioData) : null
}

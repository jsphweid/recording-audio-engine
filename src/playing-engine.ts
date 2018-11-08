import MonoRecording from './mono-recording'

let activeAudioElement: HTMLAudioElement | undefined

export function playRecording(recording: MonoRecording) {
  if (activeAudioElement) {
    stopPlaying()
  }
  const blobUrl = URL.createObjectURL(recording.wavBlob)
  activeAudioElement = new Audio(blobUrl)
  activeAudioElement.play()
}

export function stopPlaying() {
  activeAudioElement = undefined
}

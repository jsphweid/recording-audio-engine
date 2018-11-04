import { audioContextInstance } from '.'
import { bufferSize } from './constants'
import { flattenFloat32Arrays } from './helpers'

let source: MediaStreamAudioSourceNode | undefined
let processor: ScriptProcessorNode | undefined
let tmpAudioData: Float32Array[] = []

export function connectRecordingNodes(): Promise<void> {
  tmpAudioData = []
  return new Promise(resolve => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      source = audioContextInstance.createMediaStreamSource(stream)
      processor = audioContextInstance.createScriptProcessor(bufferSize, 1, 1)
      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        tmpAudioData.push(event.inputBuffer.getChannelData(0).slice())
      }
      source.connect(processor)
      processor.connect(audioContextInstance.destination)
      resolve()
    })
  })
}

export function disconnectRecordingNodes(): Float32Array {
  if (source) source.disconnect()
  if (processor) processor.disconnect()
  return flattenFloat32Arrays(tmpAudioData)
}

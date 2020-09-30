import audioContextInstance from './audio-context'
import { flattenFloat32Arrays } from './helpers'

let source: MediaStreamAudioSourceNode | undefined
let tmpAudioData: Float32Array[] = []

export function connectRecordingNodes(): Promise<void> {
  tmpAudioData = []
  console.log('audioContextInstance', audioContextInstance)
  return new Promise(resolve => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
      console.log('stream', stream)
      console.log('audioContextInstance', audioContextInstance)
      source = audioContextInstance.createMediaStreamSource(stream)

      const mediaRecorder = new MediaRecorder(stream)
      console.log('mediaRecorder', mediaRecorder)

      mediaRecorder.ondataavailable = e => {
        console.log('e.data', e.data)
        tmpAudioData.push(e.data as any)
      }

      mediaRecorder.onstop = e => {
        console.log('onstop', e)
      }
      console.log('calling start')
      mediaRecorder.start()
      console.log('called start')
      //
      console.log('source', source)
      // processor = audioContextInstance.createScriptProcessor(
      //   DEFAULT_BUFFER_SIZE,
      //   1,
      //   1
      // )
      // console.log('processor', processor)
      // processor.onaudioprocess = (event: AudioProcessingEvent) => {
      //   console.log('pushing data...')
      //   tmpAudioData.push(event.inputBuffer.getChannelData(0).slice())
      // }
      // source.connect(processor)
      // processor.connect(audioContextInstance.destination)
      resolve()
    })
  })
}

export function disconnectRecordingNodes(): Float32Array {
  if (source) source.disconnect()
  // if (processor) processor.disconnect()
  return flattenFloat32Arrays(tmpAudioData)
}

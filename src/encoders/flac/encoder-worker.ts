// importScripts('libflac3-1.3.2.min.js')

const registerPromiseWorker = require('promise-worker/register')
const Flac = require('../../../node_modules/libflacjs/dist/libflac4-1.3.2.js')
console.log('Flac', Flac)

// declare var Flac: any

// TODO: fix anys

let flacEncoder: any
const BUFSIZE = 4096
let numberOfChannels = 1
let samplerRate = 44100
let compressionLevel = 5
let bitDepth = 16
let flackOk = 1
let flacLength = 0
const flacBuffers: any[] = []
let INIT = false
let wavLength = 0
const wavBuffers: any[] = []

function write_callback_fn(buffer: any) {
  // deleted 2nd arg: bytes
  flacBuffers.push(buffer)
  flacLength += buffer.byteLength
}

function write_wav(buffer: any) {
  wavBuffers.push(buffer)
  wavLength += buffer.length
}
console.log('---------', self)
registerPromiseWorker((e: any) => {
  console.log('on message', e)
  switch (e.data.cmd) {
    case 'init':
      // using FLAC

      if (!e.data.config) {
        e.data.config = {
          bps: bitDepth,
          channels: numberOfChannels,
          samplerate: samplerRate,
          compression: compressionLevel
        }
      }

      e.data.config.channels = e.data.config.channels
        ? e.data.config.channels
        : numberOfChannels
      e.data.config.samplerate = e.data.config.samplerate
        ? e.data.config.samplerate
        : samplerRate
      e.data.config.bps = e.data.config.bps ? e.data.config.bps : bitDepth
      e.data.config.compression = e.data.config.compression
        ? e.data.config.compression
        : compressionLevel

      ////
      compressionLevel = e.data.config.compression
      bitDepth = e.data.config.bps
      samplerRate = e.data.config.samplerate
      numberOfChannels = e.data.config.channels
      ////

      if (!Flac.isReady()) {
        Flac.onready = () => {
          setTimeout(() => {
            initFlac()
          }, 0)
        }
      } else {
        initFlac()
      }
      break

    case 'encode':
      encodeFlac(e.data.buf)
      break

    case 'finish':
      let data: any
      if (!Flac.isReady()) {
        console.error('Flac was not initialized: could not encode data!')
      } else {
        flackOk &= Flac.FLAC__stream_encoder_finish(flacEncoder)
        console.log('flac finish: ' + flackOk) // DEBUG
        data = exportFlacFile(flacBuffers, flacLength) // used to be 3rd argument: mergeBuffersUint8

        Flac.FLAC__stream_encoder_delete(flacEncoder)
      }

      clear()

      self.postMessage({ cmd: 'end', buf: data }, '') // added empty string as second arg
      INIT = false
      break
  }
})

// self.onmessage = (e: any) => {
//   console.log('on message', e)
//   switch (e.data.cmd) {
//     case 'init':
//       // using FLAC

//       if (!e.data.config) {
//         e.data.config = {
//           bps: bitDepth,
//           channels: numberOfChannels,
//           samplerate: samplerRate,
//           compression: compressionLevel
//         }
//       }

//       e.data.config.channels = e.data.config.channels
//         ? e.data.config.channels
//         : numberOfChannels
//       e.data.config.samplerate = e.data.config.samplerate
//         ? e.data.config.samplerate
//         : samplerRate
//       e.data.config.bps = e.data.config.bps ? e.data.config.bps : bitDepth
//       e.data.config.compression = e.data.config.compression
//         ? e.data.config.compression
//         : compressionLevel

//       ////
//       compressionLevel = e.data.config.compression
//       bitDepth = e.data.config.bps
//       samplerRate = e.data.config.samplerate
//       numberOfChannels = e.data.config.channels
//       ////

//       if (!Flac.isReady()) {
//         Flac.onready = () => {
//           setTimeout(() => {
//             initFlac()
//           }, 0)
//         }
//       } else {
//         initFlac()
//       }
//       break

//     case 'encode':
//       encodeFlac(e.data.buf)
//       break

//     case 'finish':
//       let data: any
//       if (!Flac.isReady()) {
//         console.error('Flac was not initialized: could not encode data!')
//       } else {
//         flackOk &= Flac.FLAC__stream_encoder_finish(flacEncoder)
//         console.log('flac finish: ' + flackOk) // DEBUG
//         data = exportFlacFile(flacBuffers, flacLength) // used to be 3rd argument: mergeBuffersUint8

//         Flac.FLAC__stream_encoder_delete(flacEncoder)
//       }

//       clear()

//       self.postMessage({ cmd: 'end', buf: data }, '') // added empty string as second arg
//       INIT = false
//       break
//   }
// }

// HELPER: handle initialization of flac encoder
function initFlac() {
  const flacEncoder = Flac.init_libflac_encoder(
    samplerRate,
    numberOfChannels,
    bitDepth,
    compressionLevel,
    0
  )
  ////
  if (flacEncoder !== 0) {
    const statusEncoder = Flac.init_encoder_stream(
      flacEncoder,
      write_callback_fn
    )
    flackOk &= (statusEncoder === 0) as any

    console.log('flac init     : ' + flackOk) // DEBUG
    console.log('status encoder: ' + statusEncoder) // DEBUG

    INIT = true
  } else {
    console.error('Error initializing the encoder.')
  }
}

// HELPER: handle incoming PCM audio data for Flac encoding:
function encodeFlac(audioData: any) {
  if (!Flac.isReady()) {
    // if Flac is not ready yet: buffer the audio
    wavBuffers.push(audioData)
    console.info('buffered audio data for Flac encdoing')
  } else {
    if (wavBuffers.length > 0) {
      // if there is buffered audio: encode buffered first (and clear buffer)

      const len = wavBuffers.length
      const buffered = wavBuffers.splice(0, len)
      for (let i = 0; i < len; ++i) {
        doEncodeFlac(buffered[i])
      }
    }

    doEncodeFlac(audioData)
  }
}

// HELPER: actually encode PCM data to Flac
function doEncodeFlac(audioData: any) {
  const bufferLength = audioData.length
  const bufferI32 = new Uint32Array(bufferLength)
  const view = new DataView(bufferI32.buffer)
  const volume = 1
  let index = 0
  for (let i = 0; i < bufferLength; i++) {
    view.setInt32(index, audioData[i] * (0x7fff * volume), true)
    index += 4
  }

  const flacReturn = Flac.FLAC__stream_encoder_process_interleaved(
    flacEncoder,
    bufferI32,
    bufferI32.length / numberOfChannels
  )
  if (flacReturn !== true) {
    console.log(
      'Error: encode_buffer_pcm_as_flac returned false. ' + flacReturn
    )
  }
}

function exportFlacFile(recBuffers: any, recLength: any) {
  // convert buffers into one single buffer
  const samples = mergeBuffersUint8(recBuffers, recLength)

  // var audioBlob = new Blob([samples], { type: type });
  const theBlob = new Blob([samples], { type: 'audio/flac' })
  return theBlob
}

function exportMonoWAV(buffers: any[], length: number) {
  // buffers: array with
  //  buffers[0] = header information (with missing length information)
  //  buffers[1] = Float32Array object (audio data)
  //  ...
  //  buffers[n] = Float32Array object (audio data)

  const dataLength = length * 2
  const buffer = new ArrayBuffer(44 + dataLength)
  const view = new DataView(buffer)

  // copy WAV header data into the array buffer
  const header = buffers[0]
  const len = header.length
  for (let i = 0; i < len; ++i) {
    view.setUint8(i, header[i])
  }

  // add file length in header
  view.setUint32(4, 32 + dataLength, true)
  // add data chunk length in header
  view.setUint32(40, dataLength, true)

  // write audio data
  floatTo16BitPCM(view, 44, buffers)

  return new Blob([view], { type: 'audio/wav' })
}

function writeUTFBytes(view: any, offset: any, string: any) {
  const lng = string.length
  for (let i = 0; i < lng; ++i) {
    view.setUint8(offset + i, string.charCodeAt(i))
  }
}

function mergeBuffersUint8(channelBuffer: any, recordingLength: any) {
  const result = new Uint8Array(recordingLength)
  let offset = 0
  const lng = channelBuffer.length
  for (let i = 0; i < lng; i++) {
    const buffer = channelBuffer[i]
    result.set(buffer, offset)
    offset += buffer.length
  }
  return result
}

function floatTo16BitPCM(output: any, offset: any, inputBuffers: any[]) {
  let input
  const jsize = inputBuffers.length
  let isize
  let i
  let s

  // first entry is header information (already used in exportMonoWAV),
  // rest is Float32Array-entries -> ignore header entry
  for (let j = 1; j < jsize; ++j) {
    input = inputBuffers[j]
    isize = input.length
    for (i = 0; i < isize; ++i, offset += 2) {
      s = Math.max(-1, Math.min(1, input[i]))
      output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    }
  }
}

/*
 * clear recording buffers
 */
function clear() {
  flacBuffers.splice(0, flacBuffers.length)
  flacLength = 0
  wavBuffers.splice(0, wavBuffers.length)
  wavLength = 0
}

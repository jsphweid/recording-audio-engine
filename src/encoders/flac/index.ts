// const Flac = require('../../../node_modules/libflacjs/dist/libflac4-1.3.2.js')
// console.log('Flac', Flac)
// export function saysHi() {
//   console.log('hi')
// }

// TODO: move this to a different file
// TODO: is a blob really what we get?

// const PromiseWorker = require('promise-worker')
import PromiseWorker from 'promise-worker'
import Worker from 'worker-loader!./encoder-worker'

// import * as workerPath from 'file-loader?name=[name].js!./encoder-worker'
// console.log('workerPath', workerPath)
const worker = new Worker()
console.log('worker', worker)
const promiseWorker = new PromiseWorker(worker)
console.log('promiseWorker', promiseWorker)

// TODO: fix anys

export function encodeMonoFlac(
  rawData: Float32Array,
  sampleRate: number
): Promise<Blob> {
  console.log('sampleRate', sampleRate)
  return promiseWorker
    .postMessage({ cmd: 'encode', buf: rawData })
    .then((response: any) => {
      console.log('response', response)
      // handle response
      return new Blob()
    })
    .catch((error: any) => {
      console.log('error', error)
      // handle error
      return new Blob()
    })
}

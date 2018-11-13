# Audio Engine

A simple and small (under 2kB gzipped, currently) library that specializes in simple audio input / output and marshalling to various audio formats by wrapping the browser's Audio Context and providing a bunch of convenience functions. Currently only supports mono audio. See the `TODO` section below for more explanation.

## Usage

`npm install --save recording-audio-engine`

Check out the `example/` folder for a decent example. Here is a basic use case:

```javascript
import { Recording } from 'recording-audio-engine'

// start recording with max length of 5 seconds
Recording.startRecording(5).then(recording => {
  recordings.push(recording) // add recording to store
  console.log('recording as encoded wav blob', recording.wavBlob)
  console.log('recording as audio buffer', recording.audioBuffer)
  console.log('recording as Float32Array', recording.rawData)
})

function handleStopRecordingImmediately() {
  Recording.stopRecording()
}

function handleRecordingPlay(recording) {
  recording.play().then(() => {
    console.log('recording just finished playing!')
  })
}

function handleStopPlayingImmediately(recording) {
  recording.stop()
}
```

Note: This library does concern itself with managing a complicated state. Basically you have to manage all of that yourself. When the 'startRecording promise' resolves (either it reached the timeout you set OR you called `.stopRecording()`), it provides the recording. You just have to do something with it, as in the above example.

You can also create your own recording objects (for example, maybe you downloaded a file from the internet):

```javascript
import { MonoRecording } from 'recording-audio-engine'
const recording = new Recording(new Float32Array([1, 2, 3, 4]), 44100)
const automaticallyEncodedWavBlob = recording.wavBlob
```

In the above example, the sampling rate is optional. It will default to your browser's default sampling rate if you don't set it.

It provides a single running instance of the browser's AudioContext. If you still need to use it for some reason, you can access it without creating a new one:

```javascript
import { AudioContextInstance } from 'recording-audio-engine'
console.log('sample rate is', AudioContextInstance.sampleRate)
```

Finally, it comes with some utils.

```javascript
import { Utils } from 'recording-audio-engine'
import axios from 'axios'
axios
  .get('www.example.com/audio.wav', { responseType: 'arraybuffer' })
  .then(res => Utils.decodeAudioData(res.data))
  .then(res => new MonoRecording(res.getChannelData(0)))
```

```javascript
import { Utils } from 'recording-audio-engine'
const synthesizedRecording = Utils.makeSynthesizedMonoRecording([
  monoRecording1,
  monoRecording2,
  monoRecording3
])
```

```javascript
import { Utils } from 'recording-audio-engine'
const fileAsString = await exportBlobAsBase64(wavFileBlob)
```

## Dev

### TODO:

- have an example project that uses the lib for development purposes
- Support multi-channel everywhere: As this was developed out of projects that make use of the microphone, the MVP was built around mono audio. Some parts are built with multi-channel in mind but the API will assume mono until the whole code base has multi-channel support.

### Note about tests

- I'm using karma for tests (as opposed to the much more light weight and easy to use `jest`) because it runs tests in the browser as opposed to node. This is important for this project because it relies heavily on the Web Audio API. There are various libraries for mocking the Web Audio API in node but none of these suffice for the type of tests that I want to write (and many are incomplete...)

```bash
npm run test # run tests once
npm run test:dev # run tests in watch mode
```

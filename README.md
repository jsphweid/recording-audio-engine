# Audio Engine

A simple library that specializes in simple audio input / output and marshalling to various audio formats by wrapping the browser's Audio Context and providing a bunch of convenience functions. Currently only supports mono audio. See the `TODO` section below for more explanation.

## Usage

The central part of this library is the `MonoRecording` class. Its underlying data is a simple Float32Array with the raw audio data. It has 'computed' values / 'getters' that provide the information in various other forms (an Audio Buffer or an encoded 16-bit wav file blob).

This library does concern itself with managing a complicated state. You can access the last created `MonoRecording` but that's it. It's up to you and your application as to how to persist the products of this library.

## Dev

### TODO:

- have an example project that uses the lib for development purposes
- eliminate all import from '.'
- Support multi-channel everywhere: As this was developed out of projects that make use of the microphone, the MVP was built around mono audio. Some parts are built with multi-channel in mind but the API will assume mono until the whole code base has multi-channel support.

### Note about tests

- I'm using karma for tests (as opposed to the much more light weight and easy to use `jest`) because it runs tests in the browser as opposed to node. This is important for this project because it relies heavily on the Web Audio API. There are various libraries for mocking the Web Audio API in node but none of these suffice for the type of tests that I want to write (and many are incomplete...)

```bash
npm run test # run tests once
npm run test:dev # run tests in watch mode
```

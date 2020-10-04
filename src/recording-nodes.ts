import audioContextInstance from "./audio-context";
import { BUFFER_SIZE, DEFAULT_NUMBER_OF_CHANNELS } from "./constants";
import { flattenFloat32Arrays } from "./helpers";

let source: MediaStreamAudioSourceNode | undefined;
let processor: ScriptProcessorNode | undefined;
let tmpAudioData: Float32Array[] = [];

const getStream = (): Promise<MediaStream> =>
  navigator.mediaDevices.getUserMedia({ audio: true });

export function connectRecordingNodes(): Promise<void> {
  tmpAudioData = [];
  return getStream()
    .then(stream => {
      console.log("stream", stream);

      source = audioContextInstance.createMediaStreamSource(stream);
      console.log("source", source);
      processor = audioContextInstance.createScriptProcessor(
        BUFFER_SIZE,
        DEFAULT_NUMBER_OF_CHANNELS,
        DEFAULT_NUMBER_OF_CHANNELS,
      );
      console.log("processor", processor);
      processor.onaudioprocess = (event: AudioProcessingEvent) => {
        console.log("audio processing");
        tmpAudioData.push(event.inputBuffer.getChannelData(0).slice()); // TODO: get both channel data
      };
      source.connect(processor);
      processor.connect(audioContextInstance.destination);
    })
    .catch(error => {
      console.log("Some Error...", error);
    });
}

export function disconnectRecordingNodes(): Float32Array {
  if (source) source.disconnect();
  if (processor) processor.disconnect();
  return flattenFloat32Arrays(tmpAudioData);
}

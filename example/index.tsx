import * as React from "react";
import * as ReactDOM from "react-dom";
import AudioEngine, {
  PlayableAudioType,
  ScheduledAudioEventType,
} from "../src";
import { DEFAULT_SAMPLE_RATE } from "../src/constants";
import { createMonoSineWave } from "../src/utils/synth";

interface ExampleState {
  maxRecordingTime: number;
  isRecorderReady: boolean;
  isRecording: boolean;
  simpleRecordings: Blob[];
}

class Example extends React.Component<any, ExampleState> {
  constructor(props: any) {
    super(props);
    this.state = {
      simpleRecordings: [],
      maxRecordingTime: 5,
      isRecorderReady: false,
      isRecording: false,
    };
    AudioEngine.primeRecorder().then(() =>
      this.setState({ isRecorderReady: true }),
    );
  }

  private handleStartRecording = () => {
    this.setState({ isRecording: true });

    AudioEngine.startRecording();
  };

  private appendRecordings = (blobs: Blob[]) =>
    this.setState({
      simpleRecordings: [...this.state.simpleRecordings, ...blobs],
    });

  private handleStopRecording = () => {
    AudioEngine.stopRecording()
      .then(() => {
        this.setState({ isRecording: false });
        return AudioEngine.exportLastAsWavBlob();
      })
      .then(blob => this.appendRecordings([blob]))
      .then(() => AudioEngine.clear());
  };

  private renderStartStop = () => (
    <div>
      <button
        onClick={this.handleStartRecording}
        disabled={!this.state.isRecorderReady || this.state.isRecording}
      >
        start recording
      </button>
      <button
        onClick={this.handleStopRecording}
        disabled={!this.state.isRecorderReady || !this.state.isRecording}
      >
        stop recording
      </button>
    </div>
  );

  private renderMaxTimeout() {
    return (
      <div>
        Max Recording Length (seconds):
        <input
          onChange={e =>
            this.setState({ maxRecordingTime: parseInt(e.target.value, 10) })
          }
          min={1}
          type="number"
          value={this.state.maxRecordingTime}
        />
      </div>
    );
  }

  private renderSimpleRecordings = () => {
    return this.state.simpleRecordings.length === 0 ? null : (
      <ul>
        {this.state.simpleRecordings.map((blob, i) => (
          <li key={`audio-${i}`}>
            <audio src={URL.createObjectURL(blob)} controls={true} />
          </li>
        ))}
      </ul>
    );
  };

  private renderPlayImmediatelyTest = () => (
    <div>
      <button
        onClick={() => {
          AudioEngine.playImmediately({
            type: PlayableAudioType.Raw,
            rawData: createMonoSineWave(DEFAULT_SAMPLE_RATE, 1000, 1),
            sampleRate: DEFAULT_SAMPLE_RATE,
          }).then(result =>
            console.log("play immediately test completed", result),
          );
        }}
      >
        test play immediately
      </button>
    </div>
  );

  private renderScheduleTest = () => {
    const makePlayEvent = (
      startOffset: number,
      endOffset: number,
      freq: number,
    ) => ({
      type: ScheduledAudioEventType.PlayEvent,
      timeRange: {
        start: { date: new Date(Date.now() + startOffset * 1000) },
        end: { offset: endOffset },
      },
      data: {
        type: PlayableAudioType.Raw,
        rawData: createMonoSineWave(DEFAULT_SAMPLE_RATE, freq, 1),
        sampleRate: DEFAULT_SAMPLE_RATE,
      },
    });

    return (
      <div>
        <button
          onClick={() => {
            AudioEngine.schedule(
              [200, 249, 329, 380, 500, 623, 1094, 1423].map((freq, i) =>
                makePlayEvent(i / 10 + 0.3, i / 10 + 0.5, freq),
              ),
            ).then(results => console.log("schedule play completed", results));
          }}
        >
          test schedule play
        </button>
      </div>
    );
  };

  private renderTestScheduledRecords = () => (
    <div>
      <button
        onClick={() => {
          AudioEngine.schedule([
            {
              type: ScheduledAudioEventType.RecordEvent,
              timeRange: { start: { offset: 0.2 }, end: { offset: 0.7 } },
            },
            {
              type: ScheduledAudioEventType.RecordEvent,
              timeRange: { start: { offset: 1 }, end: { offset: 1.2 } },
            },
          ]).then(results =>
            this.appendRecordings((results as any[]).filter(r => r !== null)),
          );
        }}
      >
        test scheduled records
      </button>
    </div>
  );

  public render() {
    return (
      <div>
        {this.renderMaxTimeout()}
        {this.renderStartStop()}
        {this.renderSimpleRecordings()}
        {this.renderScheduleTest()}
        {this.renderPlayImmediatelyTest()}
        {this.renderTestScheduledRecords()}
      </div>
    );
  }
}

ReactDOM.render(<Example />, document.getElementById("example"));

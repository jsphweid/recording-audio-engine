import * as React from 'react'
import * as ReactDOM from 'react-dom'
import * as RecordingAudioEngine from '../src'

interface ExampleState {
  recordings: RecordingAudioEngine.MonoRecording[]
}

class Example extends React.Component<any, ExampleState> {
  constructor(props: any) {
    super(props)
    this.state = {
      recordings: []
    }
  }

  private handleStopRecording() {
    RecordingAudioEngine.Recording.stopRecording()
    const latestRecording = RecordingAudioEngine.Recording.latestRecording
    if (latestRecording) {
      this.setState({
        recordings: [...this.state.recordings, latestRecording]
      })
    }
  }

  private renderStartStop() {
    const { startRecording } = RecordingAudioEngine.Recording
    return (
      <div>
        <button onClick={() => startRecording()}>start recording</button>
        <button onClick={() => this.handleStopRecording()}>
          stop recording
        </button>
      </div>
    )
  }

  private renderRecordings() {
    if (!this.state.recordings) return null
    const lis = this.state.recordings.map((recording, i) => (
      <li
        key={i}
        onClick={() => RecordingAudioEngine.Playing.playRecording(recording)}
      >
        Recording {i + 1} made on {`${recording.createDate}`}
      </li>
    ))
    return <ul>{lis}</ul>
  }

  public render() {
    return (
      <div>
        {this.renderStartStop()}
        {this.renderRecordings()}
      </div>
    )
  }
}

ReactDOM.render(<Example />, document.getElementById('example'))

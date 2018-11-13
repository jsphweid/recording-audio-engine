import FileSaver from 'file-saver'
import * as React from 'react'
import * as RecordingAudioEngine from '../src'
import { timeSince } from './helpers'

export interface RecordingProps {
  recording: RecordingAudioEngine.MonoRecording
}

export interface RecordingState {
  isPlaying: boolean
}

export default class Recording extends React.Component<
  RecordingProps,
  RecordingState
> {
  constructor(props: RecordingProps) {
    super(props)
    this.state = {
      isPlaying: false
    }
  }

  private handlePlay = (): void => {
    this.setState({ isPlaying: true })
    this.props.recording.play().then(() => {
      this.setState({ isPlaying: false })
    })
  }

  private handleDownloadWav = (): void => {
    FileSaver.saveAs(this.props.recording.wavBlob)
  }

  public render() {
    const { recording } = this.props
    const { isPlaying } = this.state
    return (
      <li>
        made {timeSince(recording.createDate)} ago
        <button onClick={this.handlePlay} disabled={isPlaying}>
          Play
        </button>
        <button onClick={() => recording.stop()} disabled={!isPlaying}>
          Pause
        </button>
        <button onClick={this.handleDownloadWav}>Download Wav</button>
      </li>
    )
  }
}

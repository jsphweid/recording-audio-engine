import { PlayableAudio } from "./playable-audio";
import { Time } from "./time";

export namespace ScheduledAudioEvent {
  interface ScheduledEvent<A> {
    timeRange: A;
  }

  export enum Type {
    PlayEvent,
    RecordEvent,
  }

  interface Contract<A extends Type, B> extends ScheduledEvent<B> {
    type: A;
  }

  export interface ScheduledPlayEvent
    extends Contract<Type.PlayEvent, Time.RangeWithOptionalEnd> {
    data: PlayableAudio.AllTypes;
  }

  export interface ScheduledRecordEvent
    extends Contract<Type.RecordEvent, Time.Range> {}

  export type Event = ScheduledRecordEvent | ScheduledPlayEvent;

  export const isRecord = (event: Event): event is ScheduledRecordEvent =>
    event.type === Type.RecordEvent;

  export const isPlay = (event: Event): event is ScheduledPlayEvent =>
    event.type === Type.PlayEvent;

  export interface When {
    record: (recordEvent: ScheduledRecordEvent) => void;
    play: (playEvent: ScheduledPlayEvent) => void;
  }

  export const when = (event: Event, { record, play }: When): void => {
    switch (event.type) {
      case Type.RecordEvent:
        return record(event);
      case Type.PlayEvent:
        return play(event);
    }
  };
}

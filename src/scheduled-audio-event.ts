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

  export interface PlayEvent
    extends Contract<Type.PlayEvent, Time.RangeWithOptionalEnd> {
    data: PlayableAudio.AllTypes;
  }

  export interface RecordEvent extends Contract<Type.RecordEvent, Time.Range> {}

  export type Event = RecordEvent | PlayEvent;

  export const isRecord = (event: Event): event is RecordEvent =>
    event.type === Type.RecordEvent;

  export const isPlay = (event: Event): event is PlayEvent =>
    event.type === Type.PlayEvent;

  export interface When {
    record: (recordEvent: RecordEvent) => void;
    play: (playEvent: PlayEvent) => void;
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

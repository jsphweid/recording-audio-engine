export namespace Time {
  export interface SecondsOffset {
    offset: number;
  }
  export interface AtDate {
    date: Date;
  }

  export type AllTypes = SecondsOffset | AtDate;

  export interface When<A> {
    secondsOffset: (seconds: number) => A;
    atDate: (date: Date) => A;
  }

  export const when = <A>(
    input: AllTypes,
    { secondsOffset, atDate }: When<A>,
  ): A =>
    "offset" in input ? secondsOffset(input.offset) : atDate(input.date);

  export interface Range {
    start: AllTypes;
    end: AllTypes;
  }

  export interface RangeWithOptionalEnd {
    start: AllTypes;
    end?: AllTypes;
  }
}

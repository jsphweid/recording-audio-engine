export function makeTimeoutPromise(milli: number): Promise<any> {
  return new Promise(resolve => {
    setTimeout(resolve, milli);
  });
}

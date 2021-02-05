export class InlineWebWorker {
  public get onerror() {
    return this.worker.onerror;
  }
  public set onerror(errorhandler: AbstractWorker["onerror"]) {
    this.worker.onerror = errorhandler;
  }
  public get onmessage() {
    return this.worker.onmessage;
  }
  public set onmessage(messagehandler: Worker["onmessage"]) {
    this.worker.onmessage = messagehandler;
  }

  public static create(task: () => any) {
    return new InlineWebWorker(task);
  }

  private worker: Worker;
  constructor(task: () => any) {
    if (task) {
      const taskStrs = task
        .toString()
        .trim()
        .match(/^function\s*\w*\s*\([\w\s,]*\)\s*{([\w\W]*?)}$/);
      if (taskStrs && taskStrs.length >= 2) {
        const blob = new Blob([taskStrs[1]], { type: "text/javascript" });
        this.worker = new Worker(URL.createObjectURL(blob));
        // @ts-ignore
        URL.revokeObjectURL(blob);
        return;
      }
    }
    throw new Error("must has a function agument");
  }
  public postMessage(message: any, transfer?: any[] | undefined): void {
    // @ts-ignore TODO: fix
    this.worker.postMessage(message, transfer);
  }
  public terminate(): void {
    this.worker.terminate();
  }
  public addEventListener<K extends "message" | "error">(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => void,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void;
  public addEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | AddEventListenerOptions | undefined,
  ): void;
  public addEventListener(type: any, listener: any, options?: any) {
    this.worker.addEventListener(type, listener, options);
  }
  public removeEventListener<K extends "message" | "error">(
    type: K,
    listener: (this: Worker, ev: WorkerEventMap[K]) => void,
    options?: boolean | EventListenerOptions | undefined,
  ): void;
  public removeEventListener(
    type: string,
    listener: EventListenerOrEventListenerObject,
    options?: boolean | EventListenerOptions | undefined,
  ): void;
  public removeEventListener(type: any, listener: any, options?: any) {
    this.worker.removeEventListener(type, listener, options);
  }
  public dispatchEvent(evt: Event): boolean {
    return this.worker.dispatchEvent(evt);
  }
}

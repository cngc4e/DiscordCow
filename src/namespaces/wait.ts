import { EventEmitter } from "events";

interface IEventWaiterOptions {
    /**
     * The default maximum time (in milliseconds) to wait for the event.
     */
    defaultTimeout?: number;
}

export interface IWaitForOptions<F extends unknown[]> {
    /**
     * The maximum time (in milliseconds) to wait for the event. Supercedes the default timeout
     * defined by the waiter object.
     */
    timeout?: number;
    /**
     * The condition to resolve the event.
     *
     * If this condition returns false, the waiter continues to wait until the next event or
     * timeout, whichever first.
     */
    condition?: (...args: F) => boolean;
}

export class EventWaiter<Events = { [event: string | symbol]: (...args: any[]) => void }> {
    constructor(public emitter: EventEmitter, private options: IEventWaiterOptions = {}) {}

    /**
     * Waits for an event to emit.
     * @throws - On timeout
     */
    waitFor<E extends keyof Events>(
        eventName: E,
        // Unable to satisfy interface constraints
        // @ts-ignore
        options?: IWaitForOptions<Parameters<Events[E]>>): Promise<Parameters<Events[E]>>
    {
        return new Promise((resolve, reject) => {
            var timer: NodeJS.Timeout | undefined;
            const listener = (...args: any) => {
                if (options?.condition && options.condition(...args) !== true) {
                    // Ignore.
                    return;
                }
                if (timer) {
                    clearTimeout(timer);
                }
                this.emitter.off(eventName as string | symbol, listener);
                resolve(args);
            }
            this.emitter.on(eventName as string | symbol, listener);

            const timeout = options?.timeout ?? this.options.defaultTimeout;
            if (timeout) {
                timer = setTimeout(() => {
                    this.emitter.off(eventName as string | symbol, listener);
                    reject("Timed out");
                }, timeout);
            }
        });
    }
}

interface IWaitPromiseOptions {
    /**
     * The maximum time (in milliseconds) to wait for the promise.
     */
    timeout?: number;
}

export function waitPromise(promise: Promise<unknown>, options?: IWaitPromiseOptions) {
    if (!options.timeout) return promise;
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject("Timed out"), options.timeout))
    ])
}

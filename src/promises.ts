import {HigherOrderPromise} from "./HigherOrderPromise";
import {WaitPromise} from "./WaitPromise";
import {PromiseRetry} from "./PromiseRetry";
import {SlidingWindow, SlidingWindowProducer} from "./SlidingWindow";
import {DeferredPromise} from "./DeferredPromise";

export const promises = {
    map: <T, U>(items: Array<T>, fn: (item: T) => Promise<U>) =>
        HigherOrderPromise.map<T, U>(items, fn),
    flatMap: <T, U>(items: Array<T>, fn: (item: T) => Promise<Array<U>>) =>
        HigherOrderPromise.flatMap<T, U>(items, fn),
    filter: <T>(items: Array<T>, fn: (item: T) => Promise<boolean>) =>
        HigherOrderPromise.filter<T>(items, fn),
    forEach: <T>(items: Array<T>, fn: (item: T, index: number) => Promise<any>) =>
        HigherOrderPromise.forEach<T>(items, fn),
    forEachIterator: <T>(it: Iterator<T>, fn: (item: T, index: number) => Promise<any>) =>
        HigherOrderPromise.forEachIterator<T>(it, fn),
    forEachWithConstrainedParallelism: <T, U>(items: Array<T>, asynchCount: number, fn: (item: T) => Promise<unknown>) =>
        HigherOrderPromise.forEachWithConstrainedParallelism<T, U>(items, asynchCount, fn),
    for: <T>(start: number, pastEnd: number, increment: number, fn: (t: number) => Promise<any>) =>
        HigherOrderPromise.for<T>(start, pastEnd, increment, fn),
    while: <T>(fnContinue: () => boolean, fn: () => Promise<unknown>) =>
        HigherOrderPromise.while<T>(fnContinue, fn),

    waitForPromise: <T>(milliseconds: number, value?: T) =>
        WaitPromise.waitForPromise<T>(milliseconds, value),
    waitForTimeoutOrPromise: <T>(timeout: number, fn: () => Promise<T>) =>
        WaitPromise.waitForTimeoutOrPromise<T>(timeout, fn),

    poll: PromiseRetry.poll,
    retryOverExceptions: PromiseRetry.retryOverExceptions,
    retryOnTimeoutGivingFirstResult: PromiseRetry.retryOnTimeoutGivingFirstResult,
    retryOnTimeout: PromiseRetry.retryOnTimeout,
    retryUntilValid: <T>(fn: () => Promise<T | undefined>,
                         valid: (value: T | undefined) => boolean,
                         logger: (message: any) => void,
                         retries = 5,
                         timeout = 100) =>
        PromiseRetry.retryUntilValid<T>(fn, valid, logger, retries, timeout),
    slidingWindow: (context: string,
                    producer: SlidingWindowProducer,
                    logger: (message: object | string) => void,
                    maxInFlight = 5) =>
        new SlidingWindow(context, producer, logger, maxInFlight),
    deferredPromise: <T>() =>
        new DeferredPromise<T>()
}
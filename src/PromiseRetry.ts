import {promises} from "./promises";
import {Option} from "prelude-ts";

const noValue = Symbol();
const timedOutSymbol = Symbol();

export class PromiseRetry {
    // Try the fn up to N times until it succeeds with a delay after each failure to get a value. Uses exponential back-off
    // Any exceptions thrown by the fn() are not caught; they are immediately passed out to the caller of poll()
    static async poll<T>(fn: () => Promise<Option<T>>,
                         retries = 3,
                         timeout = 100): Promise<Option<T>> {
        const result = await fn()
        if (result.isSome() || retries <= 0) {
            return result;
        }
        await promises.waitForPromise(timeout)
        return await PromiseRetry.poll(fn, retries - 1, timeout * 2)
    }

    // Try the fn up to N times until it succeeds with a delay after each failure. Uses exponential back-off
    static retryOverExceptions<T>(fn: () => Promise<T>,
                                  logger: (message: any) => void,
                                  retries = 3,
                                  timeout = 100): Promise<T> {
        return Promise
            .resolve()
            .then(() => fn())
            .catch(e => {
                if (retries <= 0) {
                    throw e;
                }
                logger({aim: "retry after exception", timeout, exception: e.message, stack: e.stack});
                return promises
                    .waitForPromise(timeout)
                    .then(success => PromiseRetry.retryOverExceptions(fn, logger, retries - 1, timeout * 2));
            });
    }

    // If the fn call times out, or an unacceptable exception is thrown on that call, we try again after a delay.
    // We try N times and then give up.
    // However, if an allowedException is thrown, we reject on that immediately. That may be needed, eg, for determining EOF.
    static retryOnTimeout<T>(fn: () => Promise<T>,
                             logger: (message: any) => void,
                             retries = 5,
                             timeout = 100,
                             allowedException: (e) => boolean = () => false): Promise<T> {
        if (retries <= 0) {
            return Promise.reject(new Error('timed out'));
        }
        return Promise
            .race([
                Promise.resolve().then(() => fn()),
                promises.waitForPromise(timeout, timedOutSymbol)
            ])
            .then(outcome => {
                if (outcome === timedOutSymbol) {
                    logger({aim: "retry after timed out", timeout});
                    return PromiseRetry.retryOnTimeout(fn, logger, retries - 1, timeout * 2, allowedException);
                }
                return outcome;
            })
            .catch(e => {
                if (allowedException(e)) {
                    logger({aim: "Reject on allowed exception", timeout, exception: e.message, stack: e.stack});
                    throw e;
                }
                logger({aim: "retry after an exception that was not allowed", error: e.message});
                return PromiseRetry.retryOnTimeout(fn, logger, retries - 1, timeout * 2, allowedException);
            });
    }

    // If the fn call times out, we try again after a delay.
    // We try N times and then give up.
    // However, the value from the earlier call is returned, regardless of timeouts.
    static retryOnTimeoutGivingFirstResult<T>(fn: () => Promise<T>,
                                              logger: (message: any) => void,
                                              retries = 5,
                                              timeout = 100): Promise<T> {
        return PromiseRetry.retryOnTimeoutGivingFirstResult2(fn, logger, retries, timeout,
            {value: noValue, timedOut: false})
    }

    private static retryOnTimeoutGivingFirstResult2<T>(fn: () => Promise<T>,
                                                       logger: (message: any) => void,
                                                       retries = 5,
                                                       timeout = 100,
                                                       state: RetryState<T>): Promise<T> {
        if (state.value !== noValue) {
            return Promise.resolve(state.value as T);
        }
        if (retries <= 0) {
            state.timedOut = true;
            if (state.lastExceptionMessage) {
                return Promise.reject(state.lastExceptionMessage)
            }
            return Promise.reject(new Error('timed out'));
        }
        return Promise
            .race([
                Promise.resolve()
                    .then(() => fn())
                    .then(value => {
                        if (state.value === noValue) {
                            state.value = value
                        }
                    }),
                promises.waitForPromise(timeout, timedOutSymbol)
            ])
            .then(() => {
                if (state.value !== noValue) {
                    return state.value as T
                }
                logger({aim: "retry after timed out", timeout});
                return PromiseRetry.retryOnTimeoutGivingFirstResult2(fn, logger, retries - 1, timeout * 2, state);
            })
            .catch(e => {
                if (!state.timedOut) {
                    logger({aim: "retry after an exception", error: e.message});
                    state.lastExceptionMessage = e;
                    return PromiseRetry.retryOnTimeoutGivingFirstResult2(fn, logger, retries - 1, timeout * 2, state);
                }
                throw e;
            });
    }
}

interface RetryState<T> {
    value: T | Symbol,
    timedOut: boolean,
    lastExceptionMessage?: Error
}

import {promises} from "./promises";

export class PromiseRetry {
    // Try the fn up to N times until it succeeds with a delay after each failure. Uses exponential back-off
    static retryOverExceptions<T>(fn: () => Promise<T>,
                                  logger: (message: any) => void,
                                  retries: number = 3,
                                  timeout: number = 100): Promise<T> {
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

    // If the fn call times out, or an acceptable exception is thrown on that call, we try again after a delay.
    // We try N times and then give up.
    static retryOnTimeout<T>(fn: () => Promise<T>,
                             logger: (message: any) => void,
                             retries: number = 5,
                             timeout: number = 100,
                             allowedException: (e) => boolean = () => false): Promise<T> {
        if (retries <= 0) {
            return Promise.reject(new Error('timed out'));
        }
        const timedOutSymbol = Symbol();
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
                    logger({aim: "retry after allowed exception", timeout, exception: e.message, stack: e.stack});
                    return PromiseRetry.retryOnTimeout(fn, logger, retries - 1, timeout * 2, allowedException);
                }
                throw e;
            });
    }
}


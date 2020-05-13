export class WaitPromise {
    static waitForPromise<T>(milliseconds: number, value?: T): Promise<T> {
        return new Promise(resolve => setTimeout(() => resolve(value), milliseconds));
    }

    static waitForTimeoutOrPromise<T>(timeout: number, fn: () => Promise<T>): Promise<T> {
        // Create a promise that rejects in <ms> milliseconds
        const timeoutPromise: Promise<any> = new Promise((resolve, reject) => {
            const id = setTimeout(() => {
                clearTimeout(id);
                reject('Timed out in ' + timeout + 'ms.')
            }, timeout)
        });

        // Returns a race between our timeout and the passed in promise
        return Promise
            .resolve()
            .then(() => Promise.race([
                fn(),
                timeoutPromise
            ]));
    }
}
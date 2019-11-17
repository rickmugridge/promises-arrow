import {DeferredPromise} from "./DeferredPromise";

export class Promises {
    static while<T>(fnContinue: () => boolean,
                    fn: () => Promise<any>): Promise<any> {
        const promise = new DeferredPromise<any>();
        whileLocal(fnContinue, fn, promise);
        return promise.promise;
    }

    static for<T>(start: number, pastEnd: number, increment: number,
                  fn: (t: number) => Promise<any>): Promise<any> {
        let value = start;
        return Promises.while(
            () => value < pastEnd,
            () => fn(value).then(() => value += increment)
        );
    }

    // Calls the function with each of the items in turn, one at a time.
    // It does not alter the items array (and assumes that it doesn't during execution
    static forEach<T>(items: Array<T>,
                      fn: (item: T) => Promise<any>): Promise<any> {
        return Promises.for(0, items.length, 1, i => fn(items[i]));
    }

    // Calls the function with each of the iterator items in turn, one at a time, recursively.
    static forEachIterator<T>(it: Iterator<T>,
                              fn: (item: T) => Promise<any>): Promise<any> {
        let head: IteratorResult<T>;
        return Promises.while(
            () => {
                head = it.next();
                return !head.done;
            },
            () => fn(head.value)
        );
    }

    // Calls the function with each of the items in turn, one at a time.
    // Returns a mapped array
    // It does not alter the items array (and assumes that it doesn't during execution
    static map<T, U>(items: Array<T>,
                     fn: (item: T) => Promise<U>): Promise<Array<U>> {
        const results: Array<U> = [];
        return Promises.for(0, items.length, 1,
            i => fn(items[i]).then(result => results.push(result)))
            .then(() => results);
    }

    // Calls the predicate function with each of the items in turn, one at a time to select.
    // Returns a filtered array
    // It does not alter the items array (and assumes that it doesn't during execution
    static filter<T>(items: Array<T>,
                     fn: (item: T) => Promise<boolean>): Promise<Array<T>> {
        const results: Array<T> = [];
        return Promises.for(0, items.length, 1,
            i => fn(items[i]).then(result => {
                if (result) {
                    results.push(items[i]);
                }
            }))
            .then(() => results);
    }
    static delayedPromise<T>(value: T, delay: number = 2): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            setTimeout(() =>
                resolve(value), delay);
        });
    }
}

function whileLocal(fnContinue: () => boolean,
                    fn: () => Promise<any>,
                    promise: DeferredPromise<any>) {
    setImmediate(() => {
        try {
            if (fnContinue()) {
                fn()
                    .then(() => whileLocal(fnContinue, fn, promise))
                    .catch(e => promise.reject(e));
            } else {
                promise.resolve(undefined);
            }
        } catch (e) {
            promise.reject(e);
        }
    });
}


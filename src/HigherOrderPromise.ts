import {DeferredPromise} from "./DeferredPromise";
import {Option} from "prelude-ts";

export class HigherOrderPromise {
    static while<T>(fnContinue: () => boolean,
                    fn: () => Promise<unknown>): Promise<unknown> {
        const promise = new DeferredPromise<any>();
        whileLocal(fnContinue, fn, promise);
        return promise.promise;
    }

    static for<T>(start: number, pastEnd: number, increment: number,
                  fn: (t: number) => Promise<any>): Promise<any> {
        let value = start;
        return HigherOrderPromise.while(
            () => value < pastEnd,
            () => fn(value).then(() => value += increment)
        );
    }

    // Calls the function with each of the items in turn, one at a time.
    // It does not alter the items array
    static forEach<T>(items: Array<T>,
                      fn: (item: T) => Promise<any>): Promise<any> {
        return HigherOrderPromise.for(0, items.length, 1, i => fn(items[i]));
    }

    // Calls the function with each of the iterator items in turn, one at a time, recursively.
    static forEachIterator<T>(it: Iterator<T>,
                              fn: (item: T) => Promise<any>): Promise<any> {
        let head: IteratorResult<T>;
        return HigherOrderPromise.while(
            () => {
                head = it.next();
                return !head.done;
            },
            () => fn(head.value)
        );
    }

    // Calls the function with each of the items in turn, N at a time.
    // It does not alter the items array
    static forEachWithConstrainedParallelism<T, U>(items: Array<T>,
                                                   asynchCount: number,
                                                   fn: (item: T) => Promise<unknown>): Promise<unknown> {
        if (asynchCount < 2 || items.length < asynchCount) {
            return HigherOrderPromise.forEach(items, fn);
        }

        const copy: Array<T> = Array.from(items);
        const workers: Array<any> = [];
        for (let i = 0; i < asynchCount; i++) {
            workers.push(forEachWorker(copy, fn));
        }
        return Promise
            .all(workers)
            .then(arrays => arrays.reduceRight((a, b) => a.concat(b), []));
    }

    // Calls the function with each of the items in turn, one at a time,
    // adding the result to the returned array in the same order.
    // Returns a mapped array
    // It does not alter the items array (and assumes that it doesn't during execution
    static map<T, U>(items: Array<T>,
                     fn: (item: T) => Promise<U>): Promise<Array<U>> {
        const results: Array<U> = [];
        return HigherOrderPromise.for(0, items.length, 1,
            i => fn(items[i]).then(result => results.push(result)))
            .then(() => results);
    }

    // Calls the function with each of the items in turn, one at a time,
    // concatenating the result to the returned array in the same order.
    // Returns a flat-mapped array
    // It does not alter the items array (and assumes that it doesn't during execution
    static flatMap<T, U>(items: Array<T>,
                         fn: (item: T) => Promise<Array<U>>): Promise<Array<U>> {
        let results: Array<U> = [];
        return HigherOrderPromise.for(0, items.length, 1,
            i => fn(items[i]).then(result => results = results.concat(result)))
            .then(() => results);
    }

    // Calls the predicate function with each of the items in turn, one at a time to select.
    // Returns a filtered array
    // It does not alter the items array (and assumes that it doesn't during execution
    static filter<T>(items: Array<T>,
                     fn: (item: T) => Promise<boolean>): Promise<Array<T>> {
        const results: Array<T> = [];
        return HigherOrderPromise.for(0, items.length, 1,
            i => fn(items[i]).then(result => {
                if (result) {
                    results.push(items[i]);
                }
            }))
            .then(() => results);
    }

}

const whileLocal = (fnContinue: () => boolean,
                    fn: () => Promise<any>,
                    promise: DeferredPromise<any>) => {
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


const forEachWorker = <T, U>(items: Array<T>,
                             fn: (item: T) => Promise<unknown>): Promise<unknown> => {
    if (items.length == 0) {
        return Promise.resolve();
    }
    const head = items.shift();
    try {
        return fn(head!)
            .then(() => forEachWorker(items, fn));
    } catch (e) {
        return Promise.reject(e);
    }
}

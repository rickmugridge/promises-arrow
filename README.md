# `promises-arrow`

`promises-arrow` is a library of:

 * Higher-order over collections where the function returns a Promise: `forEach()`, `map()`, `filter()`, etc.
 * Functions that `wait`, returning a Promise.
 * Functions that manage `retrying` an operation N times until it succeeds.
 * `SlidingWindow`, which manages a sliding window producer, which limits the work in progress.
 * `DeferredPromise`, which creates a Promise in one context that is resolved/rejected in another.

## Higher-order over collections

These functions deal correctly with composing the Promises that result in a memory-efficient manner.
So a huge collection doesn't create a huge stack of recursive calls.

#### + `map(): <T, U>(items: Array<T>, fn: (item: T) => Promise<U>) => Promise<Array<U>>`

This takes an array of some `items`, plus a function (`fn`) that is applied to each of the elements in turn.
That `fn` returns a Promise.

Eg, this could be used to take an array of some data, where the fn calls an external service with that data,
returning the result in a Promise. Eg, in an async function:

```
    const mappedResults = await promises.map(collectionOfData, data => service.call(data))
```

#### + `flatMap(): : <T, U>(items: Array<T>, fn: (item: T) => Promise<Array<U>>) => Promise<Array<U>>`

This takes an array of some `items`, plus a function (`fn`) that is applied to each of the elements in turn.
That `fn` returns a Promise containing an array.

Eg, this could be used to take an array of some data, where the fn calls an external service with that data,
returning the results in a Promise. Eg, in an async function:

```
    const flatMappedResults = await promises.flatMap(collectionOfData, data => service.callMultiple(data))
```

#### + `filter: <T>(items: Array<T>, fn: (item: T) => Promise<boolean>) => Promise<Array<T>>`

This takes an array of some `items`, plus a function (`fn`) that is applied to each of the elements in turn.
That `fn` returns a Promise containing a boolean.

Eg, this could be used to take an array of some data, where the fn calls an external service with that data,
returning whether some condition is true in a Promise. Eg, in an async function:

```
    const filteredResults = await promises.filter(collectionOfData, data => service.predicate(data))
```

#### + `forEach: <T>(items: Array<T>, fn: (item: T) => Promise<any>) => Promise<any>`

This takes an array of some `items`, plus a function (`fn`) that is applied to each of the elements in turn
for some side-effect.
That `fn` returns a Promise that is unlikely to have a value.

Eg, this could be used to take an array of some data, where the fn passes that data to an external service,
 returning a Promise. Eg, in an async function:
 
 ```
     await promises.forEach(collectionOfData, data => service.command(data))
 ```
 
#### + `forEachIterator: <T>(it: Iterator<T>, fn: (item: T) => Promise<any>) => Promise<any>`

Like `forEach`, except where the items are provided by an `Iterator`.

#### + `forEachWithConstrainedParallelism: <T, U>(items: Array<T>, asynchCount: number, fn: (item: T) => Promise<unknown>)`

Run the functions partially in parallel, allowing up to `asynchCount` of them to be in progress at once.
The result can't be depended on.
This works well for Promises that resolve on completion of external activity, such as an HTTP GET. Eg:

```
     await promises.forEachWithConstrainedParallelism(collectionOfData, 5, data => service.command(data))
 ```
 
#### + `for: <T>(start: number, pastEnd: number, increment: number, fn: (t: number) => Promise<any>) => Promise<any>`

Loop from start up to pastEnd, incrementing by the increment. For each number, call the function, which returns a Promise.
Eg, `forEach()` is defined in terms of `for()`:

```
    static forEach<T>(items: Array<T>, fn: (item: T) => Promise<any>): Promise<any> {
        return promises.for(0, items.length, 1, i => fn(items[i]));
    }
```

#### + `while: <T>(fnContinue: () => boolean, fn: () => Promise<unknown>) =>Promise<unknown>`

Continue looping while 'fnContinue()' is true. For each loop, call the function, which returns a Promise.
Eg, `for()` is defined in terms of `while()`:

```
   static for<T>(start: number, pastEnd: number, increment: number,
                  fn: (t: number) => Promise<any>): Promise<any> {
        let value = start;
        return promises.while(
            () => value < pastEnd,
            () => fn(value).then(() => value += increment)
        );
    }
```

## Waiting and Promises

#### + `waitForPromise: <T>(milliseconds: number, value?: T) => Promise<T>`

Returns a Promise after a delay. The delay is the first argument as the value is optional. Eg:

```
    await promises.waitForPromise(5);
    const result = await promises.waitForPromise(5, 'result');

```

#### + `waitForTimeoutOrPromise: <T>(timeout: number, fn: () => Promise<T>) => Promise<T>`

Waits for a Promise to resolve but only for a timeout period. 
If the Promise rejects or the timeout is exceeded, the resulting Promise is rejected. Eg:

```
    await result  = promises.waitForTimeoutOrPromise(5, () => dbRepository.get(id));

```

## SlidingWindow

Writing/sending with a sliding window means that only so many sends can be in progress.
When a send completes when the sliding window is full, another send can be initiated.

Communication is with a `SlidingWindowProducer` that manages the actual sending process.

To be documented. See the micro tests for useful examples of use.

## DeferredPromise

#### + `deferredPromise: <T>() => DeferredPromise<T>`

Creates a Promise in one context that is resolved/rejected in another.
`SlidingWindow` is an example of use, where `new Promise((resolve, reject) => {...})` is insufficient.

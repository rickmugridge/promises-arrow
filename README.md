# `promises-arrow`

`promises-arrow` is a library of of higher order functions, such as `map()` and `filter()`.
These functions take an arrow that produces a Promise.

The functions deal correctly with composing the Promise results in a memory-efficinet manner.

Some versions of these function will run the Promises partially in parallel, allowing up to N of them to be in progress at once.
This works well for Promises that resolve on completion of external activity, such as an HTTP GET.

(Docs to be completed soon.)

# `map()`

# `filter()`

# `forEach()`

# `while()`

# `delayedPromise()`

# `DeferredPromise`

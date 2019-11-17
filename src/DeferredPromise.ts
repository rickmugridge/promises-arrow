// A simple implementation of a Defer, which ES6 Promises don't provide. It's similar to $q.defer().
// It saves the two arguments to the function supplied to the new Promise,
// so that they can be called by another party in the future.
// This is useful when the code responsible for creating the Promise is separated from the code that resolves/rejects it.
// Eg, when synchronising, such as with a sliding window array of messages being sent to kafka, with a
// limit of the number of sends allowed in flight.

export class DeferredPromise<T> {
    private resolving: (T) => void;
    private rejecting: (T) => void;
    public promise = new Promise((resolving, rejecting) => {
        this.resolving = resolving;
        this.rejecting = rejecting;
    });

    resolve(value: T) {
        this.resolving(value);
    }

    reject(value: any) {
        this.rejecting(value);
    }
}
import {assertThat} from "mismatched";
import {promises} from "./promises";

describe("DeferredPromise:", () => {
    it("resolve()s", () => {
        const defer = promises.deferredPromise<number>();
        const promise = defer.promise;
        setTimeout(() =>
            defer.resolve(3), 2);
        return promise.then(() => "OK")
    });

    it("rejects()s", () => {
        const defer = promises.deferredPromise<number>();
        const promise = defer.promise;
        setTimeout(() =>
            defer.reject("error"), 2);
        return promise.catch(e => assertThat(e).is("error"))
    });
});
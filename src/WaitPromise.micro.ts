import {assertThat} from "mismatched";
import {promises} from "./promises";

describe('WaitPromise:', () => {
    let sideEffects: Array<number> = [];

    beforeEach(() => {
        sideEffects = [];
    });
    it("waitForPromise()", () => {
        return promises
            .waitForPromise(1, 1)
            .then(value => assertThat(value).is(1));
    });

    describe("waitForTimeoutOrPromise():", () => {
        it("Promise resolves in time", () => {
            return promises
                .waitForTimeoutOrPromise(1, () => Promise.resolve(44))
                .then(value => assertThat(value).is(44));
        });

        it("Promise does not resolves in time", () => {
            return promises
                .waitForTimeoutOrPromise(1, () => new Promise(() => 1))
                .then(
                    () => fail('unassertThated'),
                    () => undefined);
        });
    });
});

function fail(msg: string) {
    assertThat(msg).is(undefined);
}
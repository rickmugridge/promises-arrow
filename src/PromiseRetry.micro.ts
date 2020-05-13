import {assertThat} from "mismatched";
import {promises} from "./promises";
import {Thespian, TMocked} from "thespian";

const logger = () => undefined;

describe('Promises:', () => {
    describe('retry()', () => {
        let test: TestWithException;

        beforeEach(() => {
            test = new TestWithException();
        });

        class TestWithException {
            public counter = 0;

            run(passOnCallCount: number): Promise<any> {
                this.counter++;
                return passOnCallCount === this.counter ? Promise.resolve(100) : Promise.reject(new Error("ooooops"));
            }
        }

        it('no problem no retry', () => {
            return promises.retryOverExceptions(() => test.run(1), logger, 2, 1)
                .then(result => {
                    assertThat(result).is(100);
                    assertThat(test.counter).is(1);
                });
        });

        it('one problem one retry', () => {
            return promises.retryOverExceptions(() => test.run(2), logger, 2, 1)
                .then(result => {
                    assertThat(result).is(100);
                    assertThat(test.counter).is(2);
                });
        });

        it('error retries then catches', () => {
            return promises.retryOverExceptions(() => test.run(100), logger, 2, 1)
                .catch(e => {
                    assertThat(e.message).is("ooooops");
                    assertThat(test.counter).is(3);
                });
        });

    });

    describe("retryOnTimeout()", () => {
        const delayedPromise = () => promises.waitForPromise(5, 0);
        let thespian: Thespian;
        let fn: TMocked<() => Promise<number>>;

        beforeEach(() => {
            thespian = new Thespian();
            fn = thespian.mock<() => Promise<number>>('fn');
        });

        it("Succeeds immediately", () => {
            fn.setup(f => f()).returns(() => Promise.resolve(100))
            return promises
                .retryOnTimeout(fn.object, logger, 2, 1)
                .then(result => {
                    assertThat(result).is(100);
                    thespian.verify();
                });
        });

        it('Succeeds on the second try', () => {
            fn.setup(f => f()).returns(() => delayedPromise())
            fn.setup(f => f()).returns(() => Promise.resolve(200))
            return promises
                .retryOnTimeout(fn.object, logger, 2, 1)
                .then(result => {
                    assertThat(result).is(200);
                    thespian.verify();
                });
        });

        it('Succeeds on the third try', () => {
            fn.setup(f => f()).returns(() => delayedPromise()).times(2)
            fn.setup(f => f()).returns(() => Promise.resolve(200))
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1)
                .then(result => {
                    assertThat(result).is(200);
                    thespian.verify();
                });
        });

        it('error retries x 2 then catches', () => {
            fn.setup(f => f()).returns(() => delayedPromise()).timesAtLeast(1)
            return promises
                .retryOnTimeout(fn.object, logger, 2, 1)
                .catch(e => {
                    assertThat(e.message).is("timed out");
                    thespian.verify();
                });
        });

        it('third one succeeds, as first takes too long and second fails (acceptably)', () => {
            fn.setup(f => f()).returns(() => delayedPromise());
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error')));
            fn.setup(f => f()).returns(() => Promise.resolve(200));
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .then(result => {
                    assertThat(result).is(200);
                    thespian.verify();
                });
        });

        it('third one succeeds, as first fails (acceptably) and second takes too long', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error')));
            fn.setup(f => f()).returns(() => delayedPromise());
            fn.setup(f => f()).returns(() => Promise.resolve(200));
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .then(result => {
                    assertThat(result).is(200);
                    thespian.verify();
                });
        });

        it('Fails as exception is not allowed', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('wrong error')));
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .catch(e => {
                    assertThat(e.message).is('wrong error');
                    thespian.verify();
                });
        });
     });
});

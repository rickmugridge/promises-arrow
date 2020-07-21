import {assertThat, match} from "mismatched";
import {promises} from "./promises";
import {Thespian, TMocked} from "thespian";
import {fail} from "assert";

const logger = () => undefined;
const promiseForever = () => new Promise<number>(() => {
});

describe('Promises:', () => {
    describe('retryOverExceptions()', () => {
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

        it('first one fails (acceptably)', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error')));
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .then(result => fail('unexpected'), error => {
                    assertThat(error.message).is('error');
                    thespian.verify();
                });
        });

        it('first takes too long and second fails (acceptably)', () => {
            fn.setup(f => f()).returns(() => delayedPromise());
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error')));
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .then(() => fail('unexpected'), error => {
                    assertThat(error.message).is('error');
                    thespian.verify();
                });
        });

        it('Exception is not allowed, so times out', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('wrong error')));
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .catch(e => {
                    assertThat(e.message).is('timed out');
                    thespian.verify();
                });
        });

        it('first fails (unacceptably), second takes too long, and third fails (acceptably)', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('wrong error')));
            fn.setup(f => f()).returns(() => delayedPromise());
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error')));
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .then(() => fail('unexpected'), error => {
                    assertThat(error.message).is('error');
                    thespian.verify();
                });
        });

        it('first fails (unacceptably), but second suceeds', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('wrong error')));
            fn.setup(f => f()).returns(() => Promise.resolve(200))
            return promises
                .retryOnTimeout(fn.object, logger, 3, 1, error => error.message === 'error')
                .then(result => {
                    assertThat(result).is(200);
                    thespian.verify();
                });
        });
    });

    describe("retryOnTimeoutGivingFirstResult()", () => {
        const delayedPromise = () => promises.waitForPromise(5, 0);
        let thespian: Thespian;
        let fn: TMocked<() => Promise<number>>;
        let logger: TMocked<(message: any) => void>;

        beforeEach(() => {
            thespian = new Thespian();
            fn = thespian.mock<() => Promise<number>>('fn');
            logger = thespian.mock<(message: any) => void>('logger')
        });

        it("Succeeds immediately", () => {
            fn.setup(f => f()).returns(() => Promise.resolve(100))
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 2, 5)
                .then(result => {
                    assertThat(result).is(100);
                    thespian.verify();
                });
        });

        it('Times out on the first, but later returns that first value', () => {
            fn.setup(f => f()).returns(() => promises.waitForPromise(3, 100))
            fn.setup(f => f()).returns(() => promises.waitForPromise(3, 200))
            logger.setup(f => f({aim: "retry after timed out", timeout: 2})).returnsVoid()
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 2, 2)
                .then(result => {
                    assertThat(result).is(100);
                    thespian.verify();
                });
        });

        it('Times out twice, but later returns the second value', () => {
            fn.setup(f => f()).returns(() => new Promise(() => {
            }))
            fn.setup(f => f()).returns(() => promises.waitForPromise(4, 200))
            fn.setup(f => f()).returns(() => promises.waitForPromise(4, 300))
            logger.setup(f => f({aim: "retry after timed out", timeout: 2})).returnsVoid()
            logger.setup(f => f({aim: "retry after timed out", timeout: 4})).returnsVoid()
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 3, 2)
                .then(result => {
                    assertThat(result).is(200);
                    thespian.verify();
                });
        });

        it('Times out twice, but later returns the third value', () => {
            fn.setup(f => f()).returns(() => promiseForever())
            fn.setup(f => f()).returns(() => promiseForever())
            fn.setup(f => f()).returns(() => promises.waitForPromise(4, 300))
            logger.setup(f => f({aim: "retry after timed out", timeout: 2})).returnsVoid()
            logger.setup(f => f({aim: "retry after timed out", timeout: 4})).returnsVoid()
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 3, 2)
                .then(result => {
                    assertThat(result).is(300);
                    thespian.verify();
                });
        });

        it('error retries x 2 then catches', () => {
            fn.setup(f => f()).returns(() => delayedPromise()).timesAtLeast(1)
            logger.setup(f => f({aim: "retry after timed out", timeout: 2})).returnsVoid()
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 2, 2)
                .catch(e => {
                    assertThat(e.message).is("timed out");
                    thespian.verify();
                });
        });

        it('Fails repeatedly', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error'))).timesAtLeast(1)
            logger.setup(f => f({aim: 'retry after an exception', error: 'error'})).returnsVoid().times(3)
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 3, 1)
                .then(result => fail('unexpected'), error => {
                    assertThat(error.message).is('error');
                    thespian.verify();
                });
        });

        it('first takes too long and second fails (repeatedly)', () => {
            fn.setup(f => f()).returns(() => delayedPromise());
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error'))).timesAtLeast(1);
            logger.setup(f => f({aim: 'retry after timed out', timeout: match.any()})).returnsVoid()
            logger.setup(f => f({aim: 'retry after an exception', error: 'error'})).returnsVoid().timesAtLeast(1)
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 3, 1)
                .then(() => fail('unexpected'), error => {
                    assertThat(error.message).is('error');
                    thespian.verify();
                });
        });

        it('first fails (unacceptably), but second suceeds', () => {
            fn.setup(f => f()).returns(() => Promise.reject(new Error('error')));
            fn.setup(f => f()).returns(() => Promise.resolve(200))
            logger.setup(f => f({aim: 'retry after an exception', error: 'error'})).returnsVoid()
            return promises
                .retryOnTimeoutGivingFirstResult(fn.object, logger.object, 3, 1)
                .then(result => {
                    assertThat(result).is(200);
                    thespian.verify();
                });
        });
    });
});

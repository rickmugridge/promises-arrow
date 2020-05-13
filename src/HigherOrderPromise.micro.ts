import {assertThat} from "mismatched";
import {promises} from "./promises";

const logger = () => undefined;

describe('HigherOrderPromise:', () => {
    let sideEffects: Array<number> = [];

    beforeEach(() => {
        sideEffects = [];
    });

    describe('while():', () => {
        let continues: Array<number>;
        const funContinue = () => continues.length > 0;
        const fn = () => {
            sideEffects.push(continues.shift()!);
            return Promise.resolve(undefined);
        };

        beforeEach(() => {
            sideEffects = [];
        });

        it('does nothing if not to continue', () => {
            continues = [];
            return promises.while(funContinue, fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('Handles each of the items in turn', () => {
            continues = [1, 2, 303, -1, 7, 9];
            return promises.while(funContinue, fn)
                .then(() => assertThat(sideEffects).is([1, 2, 303, -1, 7, 9]));
        });

        it('Handles a reject in fn', () => {
            const fn2 = () => {
                return Promise.reject(new Error("Bad"));
            };
            continues = [1, 2, 303];
            return promises.while(funContinue, fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });

        it('Handles an exception in fn', () => {
            const fn2 = () => {
                throw new Error("Bad");
            };
            continues = [1, 2, 303];
            return promises.while(funContinue, fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });
    });

    describe('for():', () => {
        const fn = v => {
            sideEffects.push(v);
            return Promise.resolve(v);
        };

        it('does nothing if none left', () => {
            return promises.for(0, 0, 1, fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('does nothing if backwards', () => {
            return promises.for(1, 0, 1, fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('Handles each of the 3 items in turn', () => {
            return promises.for(1, 4, 1, fn)
                .then(() => assertThat(sideEffects).is([1, 2, 3]));
        });

        it('Handles every second of the 8 items in turn', () => {
            return promises.for(1, 8, 2, fn)
                .then(() => assertThat(sideEffects).is([1, 3, 5, 7]));
        });

        it('Handles a reject in fn', () => {
            const fn2 = v => {
                return Promise.reject(new Error("Bad"));
            };
            return promises.for(0, 4, 1, fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });

        it('Handles an exception in fn', () => {
            const fn2 = v => {
                throw new Error("Bad");
            };
            return promises.for(0, 4, 1, fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });
    });

    describe('forEach():', () => {
        const fn = (item: number) => {
            sideEffects.push(item + 1);
            return Promise.resolve(item + 1);
        };

        it('does nothing if no elements in array', () => {
            return promises.forEach([], fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('Handles each of the 3 items in turn', () => {
            return promises.forEach([1, 2, 303], fn)
                .then(() => assertThat(sideEffects).is([2, 3, 304]));
        });

        it('Handles a reject in fn', () => {
            const fn2 = (tem: number) => {
                return Promise.reject(new Error("Bad"));
            };
            return promises.forEach([1, 2, 303], fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });

        it('Handles an exception in fn', () => {
            const fn2 = (tem: number) => {
                throw new Error("Bad");
            };
            return promises.forEach([1, 2, 303], fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });
    });

    describe('forEachWithConstrainedParallelism():', () => {
        const fn = (item: number): Promise<unknown> => {
            sideEffects.push(item + 1);
            return Promise.resolve();
        };

        it('does nothing if no elements in array', () => {
            return promises.forEachWithConstrainedParallelism([], 4, fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('Handles each of the 3 items in turn', () => {
            return promises.forEachWithConstrainedParallelism([1, 2, 303], 3, fn)
                .then(() => assertThat(sideEffects).is([2, 3, 304]));
        });

        it('Handles a reject in fn', () => {
            const fn2 = (tem: number) => {
                return Promise.reject(new Error("Bad"));
            };
            return promises.forEachWithConstrainedParallelism([1, 2, 303], 3, fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });

        it('Handles an exception in fn', () => {
            const fn2 = (tem: number) => {
                throw new Error("Bad");
            };
            return promises.forEachWithConstrainedParallelism([1, 2, 303], 3, fn2)
                .then(() => fail("UnassertThated"))
                .catch(e => {
                });
        });
    });

    describe('map():', () => {
        const fn = (item: number) => {
            sideEffects.push(item + 1);
            return Promise.resolve(item + 1);
        };

        it('does nothing if no elements in array', () => {
            return promises.map([], fn)
                .then(results => {
                    assertThat(results).is([]);
                    assertThat(sideEffects).is([]);
                });
        });

        it('Handles each of the 3 items in turn', () => {
            const items = [1, 2, 303, -7, 0, 20];
            return promises.map(items, fn)
                .then(results => {
                    assertThat(results).is([2, 3, 304, -6, 1, 21]);
                    assertThat(sideEffects).is([2, 3, 304, -6, 1, 21]);
                    assertThat(items).is([1, 2, 303, -7, 0, 20]);
                });
        });

        it('Handles an exception', () => {
            const fn2 = (item: number) => {
                throw new Error("Bad");
            };
            return promises.map([1, 2, 303], fn2)
                .then(results => fail("unassertThated"))
                .catch(e => {
                });
        });
    });

    describe('flatMap():', () => {
        const fn = (item: number) => {
            sideEffects.push(item + 1);
            return Promise.resolve([item + 1]);
        };

        it('does nothing if no elements in array', () => {
            return promises.flatMap([], fn)
                .then(results => {
                    assertThat(results).is([]);
                    assertThat(sideEffects).is([]);
                });
        });

        it('Handles each of the 3 items in turn', () => {
            const items = [1, 2, 303, -7, 0, 20];
            return promises.flatMap(items, fn)
                .then(results => {
                    assertThat(results).is([2, 3, 304, -6, 1, 21]);
                    assertThat(sideEffects).is([2, 3, 304, -6, 1, 21]);
                    assertThat(items).is([1, 2, 303, -7, 0, 20]);
                });
        });

        it('Handles an exception', () => {
            const fn2 = (item: number) => {
                throw new Error("Bad");
            };
            return promises.flatMap([1, 2, 303], fn2)
                .then(results => fail("unassertThated"))
                .catch(e => {
                });
        });
    });

    describe('filter():', () => {
        const positive = (item: number) => {
            return Promise.resolve(item > 0);
        };

        it('does nothing if no elements in array', () => {
            return promises.filter([], positive)
                .then(results => {
                    assertThat(results).is([]);
                });
        });

        it('Handles each of the items in turn, selecting the positive ones', () => {
            const items = [1, 2, 303, -7, 0, 20];
            return promises.filter(items, positive)
                .then(results => {
                    assertThat(results).is([1, 2, 303, 20]);
                    assertThat(items).is([1, 2, 303, -7, 0, 20]);
                });
        });

        it('Handles an exception', () => {
            const positive2 = (item: number) => {
                throw new Error("Bad");
            };
            return promises.filter([1, 2, 303], positive2)
                .then(results => fail("unassertThated"))
                .catch(e => {
                });
        });
    });
});

function fail(msg: string) {
    assertThat(msg).is(undefined);
}
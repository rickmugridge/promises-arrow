import {Promises} from "./Promises";
import {assertThat} from "mismatched";

describe('Promises:', () => {
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
            return Promises.while(funContinue, fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('Handles each of the items in turn', () => {
            continues = [1, 2, 303, -1, 7, 9];
            return Promises.while(funContinue, fn)
                .then(() => assertThat(sideEffects).is([1, 2, 303, -1, 7, 9]));
        });

        it('Handles a reject in fn', () => {
            const fn2 = () => {
                return Promise.reject(new Error("Bad"));
            };
            continues = [1, 2, 303];
            return Promises.while(funContinue, fn2)
                .then(() => fail("Unexpected"))
                .catch(e => {
                });
        });

        it('Handles an exception in fn', () => {
            const fn2 = () => {
                throw new Error("Bad");
            };
            continues = [1, 2, 303];
            return Promises.while(funContinue, fn2)
                .then(() => fail("Unexpected"))
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
            return Promises.for(0, 0, 1, fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('does nothing if backwards', () => {
            return Promises.for(1, 0, 1, fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('Handles each of the 3 items in turn', () => {
            return Promises.for(1, 4, 1, fn)
                .then(() => assertThat(sideEffects).is([1, 2, 3]));
        });

        it('Handles every second of the 8 items in turn', () => {
            return Promises.for(1, 8, 2, fn)
                .then(() => assertThat(sideEffects).is([1, 3, 5, 7]));
        });

        it('Handles a reject in fn', () => {
            const fn2 = v => {
                return Promise.reject(new Error("Bad"));
            };
            return Promises.for(0, 4, 1, fn2)
                .then(() => fail("Unexpected"))
                .catch(e => {
                });
        });

        it('Handles an exception in fn', () => {
            const fn2 = v => {
                throw new Error("Bad");
            };
            return Promises.for(0, 4, 1, fn2)
                .then(() => fail("Unexpected"))
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
            return Promises.forEach([], fn)
                .then(() => assertThat(sideEffects).is([]));
        });

        it('Handles each of the 3 items in turn', () => {
            return Promises.forEach([1, 2, 303], fn)
                .then(() => assertThat(sideEffects).is([2, 3, 304]));
        });

        it('Handles a reject in fn', () => {
            const fn2 = (tem: number) => {
                return Promise.reject(new Error("Bad"));
            };
            return Promises.forEach([1, 2, 303], fn2)
                .then(() => fail("Unexpected"))
                .catch(e => {
                });
        });

        it('Handles an exception in fn', () => {
            const fn2 = (tem: number) => {
                throw new Error("Bad");
            };
            return Promises.forEach([1, 2, 303], fn2)
                .then(() => fail("Unexpected"))
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
            return Promises.map([], fn)
                .then(results => {
                    assertThat(results).is([]);
                    assertThat(sideEffects).is([]);
                });
        });

        it('Handles each of the 3 items in turn', () => {
            const items = [1, 2, 303, -7, 0, 20];
            return Promises.map(items, fn)
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
            return Promises.map([1, 2, 303], fn2)
                .then(results => fail("unexpected"))
                .catch(e => {
                });
        });
    });

    describe('filter():', () => {
        const positive = (item: number) => {
            return Promise.resolve(item > 0);
        };

        it('does nothing if no elements in array', () => {
            return Promises.filter([], positive)
                .then(results => {
                    assertThat(results).is([]);
                });
        });

        it('Handles each of the items in turn, selecting the positive ones', () => {
            const items = [1, 2, 303, -7, 0, 20];
            return Promises.filter(items, positive)
                .then(results => {
                    assertThat(results).is([1, 2, 303, 20]);
                    assertThat(items).is([1, 2, 303, -7, 0, 20]);
                });
        });

        it('Handles an exception', () => {
            const positive2 = (item: number) => {
                throw new Error("Bad");
            };
            return Promises.filter([1, 2, 303], positive2)
                .then(results => fail("unexpected"))
                .catch(e => {
                });
        });
    });
});

function fail(msg:string) {
    assertThat(msg).is(undefined);
}
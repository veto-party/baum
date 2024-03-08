import { CachedFN } from "../../src/implementation/annotation/Cached.js";

describe('Should only run once using annotation', () => {
    it('Should be sync', () => {
        class Test {

            private counter: number = 0;

            @CachedFN(false)
            method() {
                return ++this.counter;
            }
        }

        const data = new Test();

        expect(data.method()).toEqual(1);
        expect(data.method()).toEqual(1);
    });
});

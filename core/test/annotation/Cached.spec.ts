import { CachedFN } from '../../src/implementation/annotation/Cached.js';

describe('Should only run once using annotation', () => {
  it('Should be sync', () => {
    class Test {
      private counter = 0;

      @CachedFN(false)
      method() {
        return ++this.counter;
      }
    }

    const data = new Test();

    expect(data.method()).toEqual(1);
    expect(data.method()).toEqual(1);
  });

  it('Should be async', async () => {
    class Test {
      private counter = 0;

      @CachedFN(true)
      async method() {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return ++this.counter;
      }
    }

    const data = new Test();

    const [ret1, ret2] = await Promise.all([data.method(), data.method()]);

    expect(ret1).toEqual(1);
    expect(ret2).toEqual(1);

    expect(await data.method()).toEqual(1);
  });

  it('multiple instances sync', () => {
    class Test {

      private counter;

      constructor(startValue: number) {
        this.counter = startValue;
      }

      @CachedFN(false)
      method() {
        return ++this.counter;
      }
    }

    const data = new Test(0);
    const data2 = new Test(5);

    expect(data.method()).toEqual(1);
    expect(data.method()).toEqual(1);

    expect(data2.method()).toEqual(6);
    expect(data2.method()).toEqual(6);

    expect(data.method()).toEqual(1);
  });

  it('multiple instances sync', async () => {
    class Test {

      private counter;

      constructor(startValue: number) {
        this.counter = startValue;
      }

      @CachedFN(true)
      async method() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return ++this.counter;
      }
    }

    const data = new Test(0);
    const data2 = new Test(5);

    expect(await data.method()).toEqual(1);
    expect(await data.method()).toEqual(1);

    expect(await data2.method()).toEqual(6);
    expect(await data2.method()).toEqual(6);

    expect(await data.method()).toEqual(1);
  });
});

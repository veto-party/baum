import isEqualOR from 'lodash.isequal';
import isEqualWith from 'lodash.isequalwith';

const isEqual = (a: any, b: any) => isEqualWith(a, b, (subA, subB) => subA === subB || isEqualOR(subA, subB));

type ComputedKeys<T> = keyof T;

const generateKey = (key: string) => `storage__cache__${key}`;

type TypeTuple<T extends any[], Type, R extends Type[] = []> = T['length'] extends 0 ? R : T extends [infer U] ? TypeTuple<[], Type, [...R, Type]> : T extends [infer U, ...infer Rest] ? TypeTuple<Rest, Type, [...R, Type]> | R : never;

export const clearCacheForFN = <T>(scope: T, forCallbackKey: ComputedKeys<T>) => {
  if (forCallbackKey !== undefined) {
    (scope as any)[generateKey(forCallbackKey.toString())] = [];
  }
};

export const CachedFN = <T extends (...args: any[]) => any>(async: ReturnType<T> extends Promise<any> ? true : false, paramsInclude?: [...TypeTuple<Parameters<T>, boolean | undefined>, ...(boolean | undefined)[]]) => {
  return (_target: any, __propertyKey: string, context: TypedPropertyDescriptor<T>) => {
    const previous = context.value;

    if (async) {
      type MapValue = [(value: ReturnType<T>) => any, (error?: any) => any];
      let storedPromises: [[T, ...any[]], MapValue[]][] = [];

      const resolveOrReject =
        <Index extends 0 | 1>(values: MapValue[], index: Index) =>
        (value: Parameters<MapValue[typeof index]>[0]) => {
          values.forEach((promiseTuple) => promiseTuple[index](value));
        };

      context.value = function (this: any, ...givenArgs: Parameters<T>): Promise<ReturnType<T>> {
        let lookupArgs = [...givenArgs];
        if (paramsInclude !== undefined) {
          lookupArgs = lookupArgs.filter((_, index) => [true, undefined].includes(paramsInclude?.[index]));
        }

        this[generateKey(__propertyKey)] ??= [];
        const storage: [(typeof storedPromises)[number][0], ReturnType<T>][] = this[generateKey(__propertyKey)];

        const currentResult = storage.filter((current) => isEqual(current[0].slice(1), lookupArgs)).find((current) => current[0][0] === this);

        if (currentResult?.length === 2) {
          return Promise.resolve(currentResult[1]);
        }

        let promisesTuple = storedPromises.filter((current) => isEqual(current[0].slice(1), lookupArgs)).find((current) => current[0][0] === this);

        if (promisesTuple?.length !== 2) {
          promisesTuple = [[this, ...lookupArgs], []];
          storedPromises.push(promisesTuple);
        }

        const [, promises] = promisesTuple;

        if (promises.length > 0) {
          return new Promise((resolve, reject) => {
            promises.push([resolve, reject]);
          });
        }

        return new Promise<ReturnType<T>>((resolve, reject) => {
          promises.push([resolve, reject]);

          (async (): Promise<ReturnType<T>> => {
            const result = await previous?.bind(this)(...givenArgs);
            storage.push([[this, ...lookupArgs], result]);
            return result;
          })()
            .then(resolveOrReject(promises, 0), resolveOrReject(promises, 1))
            .finally(() => {
              storedPromises = storedPromises.filter(([lookup]) => !(isEqual(lookup.slice(1), lookupArgs) && lookup[0] === this));
            });
        });
      } as any;
    } else {
      context.value = function (this: any, ...givenArgs: Parameters<T>): ReturnType<T> {
        this[generateKey(__propertyKey)] ??= [];
        const storage: [[T, ...any[]], any][] = this[generateKey(__propertyKey)];

        let lookupArgs = [...givenArgs];
        if (paramsInclude !== undefined) {
          lookupArgs = lookupArgs.filter((_, index) => [true, undefined].includes(paramsInclude?.[index]));
        }

        const currentResult = storage.filter((current) => isEqual(current[0].slice(1), lookupArgs)).find((current) => current[0][0] === this);

        if (currentResult) {
          return currentResult[1];
        }

        const result = previous?.bind(this)(...givenArgs);
        storage.push([[this, ...lookupArgs], result]);
        return result;
      } as any;
    }

    Object.defineProperty(context.value, 'length', {
      value: previous?.length
    });
  };
};

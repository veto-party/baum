import isEqual from 'lodash.isequal';

/**
 * This currently does not support async functions.
 * It is guarded by the type.
 *
 * @param async
 * @returns
 */
export const CachedFN = <T extends (...args: any[]) => any>(async: ReturnType<T> extends Promise<any> ? true : false) => {
  return (_target: any, __propertyKey: string, context: TypedPropertyDescriptor<T>) => {
    const previous = context.value;

    if (async) {
      const storage: [Parameters<T>, any][] = [];

      const promises: [(value: ReturnType<T>) => any, (error?: any) => any][] = [];

      const resolveOrReject =
        <Index extends 0 | 1>(index: Index) =>
        (value: Parameters<(typeof promises)[number][typeof index]>[0]) =>
          promises.forEach((promiseTuple) => promiseTuple[index](value));

      context.value = async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
        const currentResult = storage.find((current) => isEqual(current[0], args));

        if (currentResult) {
          return currentResult[1];
        }

        if (promises.length > 0) {
          return new Promise((resolve, reject) => {
            promises.push([resolve, reject]);
          });
        }

        return new Promise<ReturnType<T>>(async (resolve, reject) => {
          promises.push([resolve, reject]);

          (async (): Promise<ReturnType<T>> => {
            const result = previous?.bind(this)(...args);
            storage.push([args, result]);
            return result;
          })().then(resolveOrReject(0), resolveOrReject(1));
        }); //.then(resolveOrReject(0), resolveOrReject(1));
      } as any;
    } else {
      const storage: [Parameters<T>, any][] = [];

      context.value = function (this: any, ...args: Parameters<T>): ReturnType<T> {
        const currentResult = storage.find((current) => isEqual(current[0], args));

        if (currentResult) {
          return currentResult[1];
        }

        const result = previous?.bind(this)(...args);
        storage.push([args, result]);
        return result;
      } as any;
    }

    Object.defineProperty(context.value, 'length', {
      value: previous?.length
    });
  };
};

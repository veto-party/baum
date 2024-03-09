import isEqual from 'lodash.isequal';

const emptySymbol = Symbol(undefined);

export const CachedFN = <T extends (...args: any[]) => any>(async: ReturnType<T> extends Promise<any> ? true : false) => {
  return (_target: any, __propertyKey: string, context: TypedPropertyDescriptor<T>) => {
    const previous = context.value;

    if (async) {
      const storage: [Parameters<T>, any][] = [];

      type MapValue = [(value: ReturnType<T>) => any, (error?: any) => any];
      let storedPromises: [Parameters<T>, MapValue[]][] = [];

      const resolveOrReject =
        <Index extends 0 | 1>(values: MapValue[], index: Index) =>
          (value: Parameters<MapValue[typeof index]>[0]) => {
            values.forEach((promiseTuple) => promiseTuple[index](value));
          };

      context.value = async function (this: any, ...args: Parameters<T>): Promise<ReturnType<T>> {
        const currentResult = storage.find((current) => isEqual(current[0], args));

        if (currentResult) {
          return Promise.resolve(currentResult[1] === emptySymbol ? undefined : currentResult[1]);
        }

        let promisesTuple = storedPromises.find((storedPromise) => isEqual(storedPromise[0], args));

        if (!promisesTuple) {
          promisesTuple = [args, []];
          storedPromises.push(promisesTuple);
        }

        const [, promises] = promisesTuple;

        if (promises.length > 0) {
          return new Promise((resolve, reject) => {
            promises.push([resolve, reject]);
          });
        }

        return new Promise<ReturnType<T>>(async (resolve, reject) => {
          promises.push([resolve, reject]);

          (async (): Promise<ReturnType<T>> => {
            const result = previous?.bind(this)(...args);
            storage.push([args, result ?? emptySymbol]);
            return result;
          })()
            .then(resolveOrReject(promises, 0), resolveOrReject(promises, 1))
            .finally(() => {
              storedPromises = storedPromises.filter(([lookup]) => !isEqual(lookup, args));
            });
        });
      } as any;
    } else {
      const storage: [Parameters<T>, any][] = [];

      context.value = function (this: any, ...args: Parameters<T>): ReturnType<T> {
        const currentResult = storage.find((current) => isEqual(current[0], args));

        if (currentResult) {
          return currentResult[1] === emptySymbol ? undefined : currentResult[1];
        }

        const result = previous?.bind(this)(...args);
        storage.push([args, result ?? emptySymbol]);
        return result;
      } as any;
    }

    Object.defineProperty(context.value, 'length', {
      value: previous?.length
    });
  };
};

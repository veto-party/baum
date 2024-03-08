import { isEqual } from 'lodash';

/**
 * This currently does not support async functions.
 * It is guarded by the type.
 * 
 * @param async 
 * @returns 
 */
export const CachedFN = <T extends (...args: any[]) => any>(async: ReturnType<T> extends Promise<any> ? never : false) => {
    return (_target: any, __propertyKey: string, context: TypedPropertyDescriptor<T>) => {

        if (async) {
            throw new Error("Only sync for now.");
        }

        const storage: [Parameters<T>, any][] = [];

        const previous = context.value;

        context.value = (function (this: any, ...args: Parameters<T>): ReturnType<T> {

            const currentResult = storage.find((current) => isEqual(current[0], args));

            if (currentResult) {
                return currentResult[1];
            }


            const result = previous?.bind(this)(...args);
            storage.push([args, result]);
            return result;
        }) as any;

        Object.defineProperty(context.value, 'length', {
            value: previous?.length
        });
    }
}


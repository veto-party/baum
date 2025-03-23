import { get, isArray, isPlainObject, keys } from "lodash-es"

/**
 * Gets all the keys for an object.
 * Currently does not support recursive objects. (Will hit memory limit on recursive objects)
 * 
 * @param obj 
 */
export const getDeepKeys = (obj: any) => {

    const collectedKeys: string[] = [];
    const keysToCheck = keys(obj);

    do {
        const key = keysToCheck.pop()!;

        const currentObj = get(obj, key);
        if (isPlainObject(currentObj)) {
            keysToCheck.push(...keys(currentObj).map((newKey) => `${key}.${newKey}`));
        } else if (isArray(currentObj)) {
            keysToCheck.push(...Array.from({ length: currentObj.length }).map((index) => `${key}[${index}]`));
        } else {
            collectedKeys.push(key);
        }
    } while (keysToCheck.length > 0);

    return collectedKeys;
}
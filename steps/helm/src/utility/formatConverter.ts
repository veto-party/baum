import set from 'lodash.set';

export const flattenKeys = (obj: any, path: string[] = []): Record<string, any> => {

    const result: Record<string, any> = {};

    const checkObjects: any[] = [];
    const lookups: [string, any][] = Object.entries(obj);

    while (lookups.length > 0) {
        const [key, lookup] = lookups.shift()!;

        if (checkObjects.includes(lookup)) {
            throw new Error("Recursive obj.");
        }
        checkObjects.push(lookup);

        if (typeof lookup !== "object") {
            result[key] = lookup;
            continue;
        }

        lookups.push(...Object.entries(lookup).map(([k, v]) => [`${key}.${k}`, v] as [string, any]));
    }

    return result;
};


const unFlattenKeys = (obj: Record<string, any>) => {
    const result = {};
    Object.entries(obj).forEach(([path, value]) => {
      set(result, path, value);
    });
    return result;
  };

export const formatConverter = (obj: any) => {
    return unFlattenKeys(flattenKeys(obj));
}
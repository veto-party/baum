import { AToken } from "./AToken.js";
import { ArrayToken } from "./implementation/ArrayToken.js";
import { ObjectToken } from "./implementation/ObjectToken.js";

export const to_structured_data = (value: any): ObjectToken|ArrayToken => {

    if (typeof value === "boolean" || typeof value === "number" || typeof value === "string" || typeof value === "symbol" || typeof value === "undefined" || value === null || value instanceof AToken) {
        return value;
    }

    if (Array.isArray(value)) {
        return new ArrayToken(value.map(to_structured_data));
    } else {
        return new ObjectToken(Object.fromEntries(Object.entries(value).map(([k ,v]) => [k, to_structured_data(v)] as const)));
    }
}
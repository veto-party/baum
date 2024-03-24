import { AToken } from "../AToken.js";

export class RawToken extends AToken {
    constructor(
        private value: string
    ) {
        super();
    }

    write(): string {
        return this.value;
    }
}
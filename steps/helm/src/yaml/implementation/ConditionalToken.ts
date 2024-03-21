import { AToken } from "../AToken.js";

export class ConditionalToken extends AToken {
    constructor(
        public condition: string,
        private value: AToken
    ) {
        super();
    }

    write(): string {
        return this.value.write();
    }
    
    get(key: any) {
        return this.value.get(key);
    }
}
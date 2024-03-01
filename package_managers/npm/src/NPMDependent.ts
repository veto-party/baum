import { IDependent } from "@veto-party/baum__core";

export class NPMDependent implements IDependent {

    constructor(
        private name: string,
        private version: string
    ) { }

    getName(): string {
        return this.name;
    }
    getVersion(): string {
        return this.version;
    }

}
import { IDependent } from "@veto-party/baum__core";

export class VirtualDependent implements IDependent {

    constructor(
        private element: string,
        private version: string
    ) {}

    getName() {
        return this.element;
    }

    getVersion() {
        return this.version;
    }

}

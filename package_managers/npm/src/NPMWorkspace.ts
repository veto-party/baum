import { IDependent, IWorkspace } from "@veto-party/baum__core";
import { NPMDependent } from "./NPMDependent.js";

export class NPMWorkspace implements IWorkspace {

    constructor(
        private directory: string,
        private pkgFile: any
    ) { }

    getName(): string {
        return this.pkgFile.name;
    }

    getVersion(): string {
        return this.pkgFile.version;
    }

    getDirectory(): string {
        return this.directory;
    }

    getDynamicDependents(): IDependent[] {
        return Object.entries(this.pkgFile.dependencies).filter(([, version]) => version === "*").map(([name, version]) => new NPMDependent(name, version as string));
    }

}
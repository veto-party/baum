import { IDependent, IWorkspace } from "../../index.js";
import { GenericDependent } from "./GenericDependent.js";
import uniqBy from "lodash.uniqby";

export class GenericWorkspace implements IWorkspace {
    constructor(
        private directory: string,
        private pkgFile: any
    ) { }

    getName(): string {
        return this.pkgFile.name;
    }

    getVersion(): string {
        return this.pkgFile.version ?? '*';
    }

    getDirectory(): string {
        return this.directory;
    }

    getDynamicDependents(): IDependent[] {
        const dependents = [
            Object.entries(this.pkgFile.dependencies ?? {})
                .filter(([, version]) => version === '*')
                .map(([name, version]) => new GenericDependent(name, version as string)),
            Object.entries(this.pkgFile.devDependencies ?? {})
                .filter(([, version]) => version === '*')
                .map(([name, version]) => new GenericDependent(name, version as string)),
            Object.entries(this.pkgFile.optionalDependencies ?? {})
                .filter(([, version]) => version === '*')
                .map(([name, version]) => new GenericDependent(name, version as string)),
            Object.entries(this.pkgFile.peerDependencies ?? {})
                .filter(([, version]) => version === '*')
                .map(([name, version]) => new GenericDependent(name, version as string))
        ].flat();

        return uniqBy(dependents, (d) => `${d.getName()}@${d.getVersion()}`);
    }

    getScriptNames(): string[] {
        return this.pkgFile.scripts ? Object.keys(this.pkgFile.scripts) : [];
    }

    isPublishable(): boolean {
        return this.pkgFile.private !== true;
    }
}

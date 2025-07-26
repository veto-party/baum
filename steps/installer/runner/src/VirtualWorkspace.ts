import { IDependent, IWorkspace } from "@veto-party/baum__core";
import { InferStructure } from "@veto-party/baum__steps__installer__renderer/src/interface/IRenderer.js";
import { dirname } from "node:path";
import { VirtualDependent } from "./VirtualDependent.js";

export class VirtualWorkspace<T> implements IWorkspace {

    private directory: string;

    constructor (
       private packageName: string,
       private packageVersion: string, 
       packagePath: string, 
       private packageContent: any
    ) {
        this.directory = dirname(packagePath);
    }

    getName(): string {
        return this.packageName;
    }
    
    getVersion(): string {
        return this.packageVersion;
    }

    getDirectory(): string {
        return this.directory;
    }

    getFreshWorkspace(): IWorkspace {
        return this;
    }

    getDynamicDependents(): IDependent[] {
        return ['dependencies', 'optionalDependencies', 'devDependencies'].flatMap<IDependent>((depType) => {
            if (typeof this.packageContent?.[depType] !== 'object') {
                return [];
            }

            return Object.entries(this.packageContent[depType]).map<IDependent>(([el, version]) => {
                if (typeof version !== 'string') {
                    throw new Error(`Version is expected to be a string for: ${this.getDirectory()}:${depType}${el}`);
                }
                return new VirtualDependent(el, version);
            });
        })
    }

    getScriptNames(): string[] {
        return [];
    }

    isPublishable(): boolean {
        return false;
    }

    getPackageFile() {
     return this.packageContent;
    }

}

import type { writeFile } from 'fs/promises';

export interface IDependent {
    getName(): string;
    getVersion(): string;
}

export interface IWorkspace {
    getName(): string;
    getVersion(): string;
    getDirectory(): string;
    getDynamicDependents(): IDependent[];
}

export interface IPackageManager {

    getCleanLockFile(): Parameters<typeof writeFile>[1];

    getLockFileName(): string;

    readWorkspace(rootDirectory: string): Promise<IWorkspace[]>;

    disableGlobalWorkspace(): any;

    enableGlobalWorkspace(): any;
} 
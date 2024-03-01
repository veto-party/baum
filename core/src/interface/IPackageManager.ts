
import type { writeFile } from 'fs/promises';

export interface Dependent {
    getName(): string;
    getVersion(): string;
}

export interface Workspace {
    getName(): string;
    getVersion(): string;
    getDirectory(): string;
    getDynamicDependents(): Dependent[];
}

export interface IPackageManager {

    getCleanLockFile(): Parameters<typeof writeFile>[1];

    getLockFileName(): string;

    readWorkspace(rootDirectory: string): Promise<Workspace[]>;

    disableGlobalWorkspace(): any;

    enableGlobalWorkspace(): any;
} 
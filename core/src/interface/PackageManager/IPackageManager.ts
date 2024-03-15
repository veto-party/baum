import type { writeFile } from 'node:fs/promises';

export interface IDependent {
  getName(): string;
  getVersion(): string;
}

export interface IWorkspace {
  getName(): string;
  getVersion(): string;
  getDirectory(): string;
  getFreshWorkspace(): IWorkspace;
  getDynamicDependents(): IDependent[];
  getScriptNames(): string[];
  isPublishable(): boolean;
  getPackageFile(): any;
}

export interface IPackageManager {
  getCleanLockFile(rootDirectory: string, workspace: IWorkspace): Promise<Parameters<typeof writeFile>[1] | undefined>;

  getLockFileName(): string;

  readWorkspace(rootDirectory: string): Promise<IWorkspace[]>;

  disableGlobalWorkspace(rootDirectory: string): any;

  enableGlobalWorkspace(rootDirectory: string): any;

  modifyToRealVersionValue(version: string): string | false | undefined;
}

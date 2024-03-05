import type { writeFile } from 'fs/promises';
import type { IPackageManagerExecutor } from './executor/IPackageManagerExecutor.js';

export interface IDependent {
  getName(): string;
  getVersion(): string;
}

export interface IWorkspace {
  getName(): string;
  getVersion(): string;
  getDirectory(): string;
  getDynamicDependents(): IDependent[];
  getScriptNames(): string[];
  isPublishable(): boolean;
}

export interface IPackageManager {

  getCleanLockFile(rootDirectory: string): Promise<Parameters<typeof writeFile>[1]>;

  getLockFileName(): string;

  readWorkspace(rootDirectory: string): Promise<IWorkspace[]>;

  disableGlobalWorkspace(rootDirectory: string): any;

  enableGlobalWorkspace(rootDirectory: string): any;
}

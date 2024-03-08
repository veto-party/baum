import { IPackageManager } from './IPackageManager.js';
import type { IPackageManagerExecutor } from './executor/IPackageManagerExecutor.js';
import { IExecutablePackageManagerParser } from './executor/IPackageManagerParser.js';

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

export interface IExecutablePackageManager extends IPackageManager {
  getExecutor(): IPackageManagerExecutor;
  getExecutorParser(): IExecutablePackageManagerParser;
}

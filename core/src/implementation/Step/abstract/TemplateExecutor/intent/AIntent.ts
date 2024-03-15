import type { IStep } from '../../../../../index.js';
import type { IExecutionIntent } from '../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';

export abstract class AIntent<T extends any[]> implements IExecutionIntent {
  abstract readonly name: string;

  abstract toGroup(): T;

  getSuccessCodes?: () => number[];

  getPrepareStep?: () => IStep = undefined;
  abstract validate(): void;
}

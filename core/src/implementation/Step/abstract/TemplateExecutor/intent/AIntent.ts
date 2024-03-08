import { IStep } from '../../../../../index.js';
import { IExecutionIntent } from '../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';

export abstract class AIntent<T extends any[]> implements IExecutionIntent {
  abstract toGroup(): T;

  getSuccessCodes?: () => number[];

  getPrepareStep?: () => IStep = undefined;
  abstract validate(): void;
}

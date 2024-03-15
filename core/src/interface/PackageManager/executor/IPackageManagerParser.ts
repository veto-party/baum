import type { IStep } from '../../IStep.js';
import type { IExecutionIntent } from './IPackageManagerExecutor.js';

export interface IExecutablePackageManagerParser {
  parseAbstractSyntax(syntax: IExecutionIntent[]): IStep;
}

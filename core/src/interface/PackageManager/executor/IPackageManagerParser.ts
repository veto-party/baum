import { IStep } from '../../IStep.js';
import { IExecutionIntent } from './IPackageManagerExecutor.js';

export interface IExecutablePackageManagerParser {
  parseAbstractSyntax(syntax: IExecutionIntent[]): IStep;
}

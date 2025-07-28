import type { INameProvider } from '../../../interface/INameProvider.js';

export interface IWritable {
  write(rootDirectory: string, nameProvider: INameProvider): Promise<void> | void;
}

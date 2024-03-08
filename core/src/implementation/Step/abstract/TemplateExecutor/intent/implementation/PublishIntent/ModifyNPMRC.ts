import FileSystem from 'fs';
import Path from 'path';
import { IStep, IWorkspace } from '../../../../../../../index.js';
import { IExecutablePackageManager } from '../../../../../../../interface/PackageManager/IExecutablePackageManager.js';

class ModifyNPMRC implements IStep {
  constructor(private dataToAdd: string) {}

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    FileSystem.appendFileSync(Path.join(workspace.getDirectory(), '.npmrc'), this.dataToAdd);
  }
  clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP: // TODO: Maybe cut out content, since npmrc might not be in the gitignore.
    return Promise.resolve();
  }
}

export { ModifyNPMRC };

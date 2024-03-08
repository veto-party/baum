import FileSystem from 'fs';
import Path from 'path';
import { IStep, IWorkspace } from '../../../../../../../index.js';
import { IExecutablePackageManager } from '../../../../../../../interface/PackageManager/IExecutablePackageManager.js';
import { cat } from 'shelljs';

class ModifyNPMRC implements IStep {

  private hasRun: Map<IWorkspace, undefined> = new Map();
  private previousFileContent: Buffer | undefined;

  constructor(private dataToAdd: string) { }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    this.hasRun.set(workspace, undefined);
    try {
      this.previousFileContent = FileSystem.readFileSync(Path.join(workspace.getDirectory(), '.npmrc'));
    } catch (error) { }

    FileSystem.appendFileSync(Path.join(workspace.getDirectory(), '.npmrc'), this.dataToAdd);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {

    if (!this.hasRun.has(workspace)) {
      return;
    }

    if (this.previousFileContent) {
      FileSystem.writeFileSync(Path.join(workspace.getDirectory(), '.npmrc'), this.previousFileContent);
    } else {
      FileSystem.unlinkSync(Path.join(workspace.getDirectory(), '.npmrc'));
    }
  }
}

export { ModifyNPMRC };

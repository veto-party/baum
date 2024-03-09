import FileSystem from 'fs/promises';
import Path from 'path';
import { IStep, IWorkspace } from '../../../../../../../index.js';
import { IExecutablePackageManager } from '../../../../../../../interface/PackageManager/IExecutablePackageManager.js';

class ModifyNPMRC implements IStep {

  private hasRun: Map<IWorkspace, Symbol> = new Map();
  private previousFileContent: Buffer | undefined;

  constructor(private dataToAdd: string) { }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    this.hasRun.set(workspace, Symbol(workspace.getName()));
    try {
      this.previousFileContent = await FileSystem.readFile(Path.join(workspace.getDirectory(), '.npmrc'));
    } catch (error) { }

    await FileSystem.appendFile(Path.join(workspace.getDirectory(), '.npmrc'), this.dataToAdd);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {

    if (!this.hasRun.has(workspace)) {
      return;
    }

    console.log(`workspace clean: ${workspace.getDirectory()}`);

    if (this.previousFileContent) {
      await FileSystem.writeFile(Path.join(workspace.getDirectory(), '.npmrc'), this.previousFileContent);
    } else {
      await FileSystem.rm(Path.join(workspace.getDirectory(), '.npmrc'));
    }
  }
}

export { ModifyNPMRC };

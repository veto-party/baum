import SyncFileSystem from 'fs';
import Path from 'path';
import FileSystem from 'fs/promises';
import { IStep, IWorkspace } from '../../../../../../../index.js';
import { IExecutablePackageManager } from '../../../../../../../interface/PackageManager/IExecutablePackageManager.js';

class ModifyNPMRC implements IStep {
  private hasRun: Map<IWorkspace, true> = new Map();
  private previousFileContent: Buffer | undefined;

  constructor(private dataToAdd: string | ((workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string) => string | Promise<string>)) { }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    this.hasRun.set(workspace, true);
    try {
      this.previousFileContent = await FileSystem.readFile(Path.join(workspace.getDirectory(), '.npmrc'));
    } catch (error) { }

    await FileSystem.appendFile(Path.join(workspace.getDirectory(), '.npmrc'), typeof this.dataToAdd === "function" ? await this.dataToAdd(workspace, packageManager, rootDirectory) : this.dataToAdd);
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    if (!this.hasRun.has(workspace)) {
      return;
    }

    console.log(`workspace clean: ${workspace.getDirectory()}`);

    if (this.previousFileContent) {
      // We should ensure execution order for modifynpmrc cleanup. (Store when which modifier was applied and make sure that we are not older then the latest revert) (static storage)
      if (SyncFileSystem.existsSync(Path.join(workspace.getDirectory(), '.npmrc'))) {
        await FileSystem.writeFile(Path.join(workspace.getDirectory(), '.npmrc'), this.previousFileContent);
      }
    } else {
      await FileSystem.rm(Path.join(workspace.getDirectory(), '.npmrc'));
    }
  }
}

export { ModifyNPMRC };

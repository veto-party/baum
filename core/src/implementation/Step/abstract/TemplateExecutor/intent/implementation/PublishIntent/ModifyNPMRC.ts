import SyncFileSystem from 'node:fs';
import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IStep, IWorkspace } from '../../../../../../../index.js';
import type { IExecutablePackageManager } from '../../../../../../../interface/PackageManager/IExecutablePackageManager.js';

class ModifyNPMRC implements IStep {
  private hasRun: Map<IWorkspace, true> = new Map();
  private previousFileContent = new Map<IWorkspace, string | undefined>();

  constructor(private dataToAdd: string | ((workspace: IWorkspace, packageManager: IExecutablePackageManager, root: string) => string | Promise<string>)) {}

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    this.hasRun.set(workspace, true);
    try {
      this.previousFileContent.set(workspace, (await FileSystem.readFile(Path.join(workspace.getDirectory(), '.npmrc'))).toString());
    } catch (_error) {}

    await FileSystem.appendFile(Path.join(workspace.getDirectory(), '.npmrc'), typeof this.dataToAdd === 'function' ? await this.dataToAdd(workspace, packageManager, rootDirectory) : this.dataToAdd);
  }

  async clean(workspace: IWorkspace, _packageManager: IExecutablePackageManager, _rootDirectory: string): Promise<void> {
    if (!this.hasRun.has(workspace)) {
      return;
    }

    console.log(`workspace clean: ${workspace.getDirectory()}`);

    if (this.previousFileContent.has(workspace)) {
      // We should ensure execution order for modifynpmrc cleanup. (Store when which modifier was applied and make sure that we are not older then the latest revert) (static storage)
      if (SyncFileSystem.existsSync(Path.join(workspace.getDirectory(), '.npmrc'))) {
        // Buffer is okay, but types have changed, so any cast.
        await FileSystem.writeFile(Path.join(workspace.getDirectory(), '.npmrc'), this.previousFileContent.get(workspace)!);
      }
    } else {
      await FileSystem.rm(Path.join(workspace.getDirectory(), '.npmrc'));
    }
  }
}

export { ModifyNPMRC };

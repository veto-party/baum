import Path from 'path';
import FileSystem from 'fs/promises';
import type { IStep } from '../../../index.js';
import type { IExecutablePackageManager } from '../../../interface/PackageManager/IExecutablePackageManager.js';
import type { IWorkspace } from '../../../interface/PackageManager/IPackageManager.js';

export class CopyAndCleanLockFileStep implements IStep {
  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string) {
    const file = await packageManager.getCleanLockFile(rootDirectory, workspace);
    if (file !== undefined) {
      await FileSystem.writeFile(Path.join(workspace.getDirectory(), packageManager.getLockFileName()), file);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await FileSystem.rm(Path.join(workspace.getDirectory(), packageManager.getLockFileName())).catch(() => {});
  }
}

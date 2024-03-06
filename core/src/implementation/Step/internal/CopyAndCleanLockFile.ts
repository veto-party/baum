import Path from 'path';
import FileSystem from 'fs/promises';
import { IPackageManager, IStep } from '../../../index.js';
import { IWorkspace } from '../../../interface/PackageManager/IPackageManager.js';
import { IExecutablePackageManager } from '../../../interface/PackageManager/IExecutablePackageManager.js';

export class CopyAndCleanLockFileStep implements IStep {
  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string) {
    await FileSystem.writeFile(Path.join(workspace.getDirectory(), packageManager.getLockFileName()), await packageManager.getCleanLockFile(rootDirectory));
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    await FileSystem.rm(Path.join(workspace.getDirectory(), packageManager.getLockFileName()));
  }
}

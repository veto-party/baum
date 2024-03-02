import { IPackageManager, IStep } from "../../../index.js";
import { IWorkspace } from "../../../interface/IPackageManager.js";
import FileSystem from 'fs/promises';
import Path from 'path';

export class CopyAndCleanLockFileStep implements IStep {
    async execute(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string) {
        await FileSystem.writeFile(Path.join(workspace.getDirectory(), packageManager.getLockFileName()), await packageManager.getCleanLockFile(rootDirectory));
    }

    async clean(workspace: IWorkspace, packageManager: IPackageManager, rootDirectory: string): Promise<void> {
        await FileSystem.rm(Path.join(workspace.getDirectory(), packageManager.getLockFileName()));
    }
}
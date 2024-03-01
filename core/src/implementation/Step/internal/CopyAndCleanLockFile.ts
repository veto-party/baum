import { IPackageManager, IStep } from "../../..";
import { IWorkspace } from "../../../interface/IPackageManager";
import FileSystem from 'fs/promises';
import Path from 'path';

export class CopyAndCleanLockFileStep implements IStep {
    async execute(workspace: IWorkspace, packageManager: IPackageManager) {
        await FileSystem.writeFile(Path.join(workspace.getDirectory(), packageManager.getLockFileName()), packageManager.getCleanLockFile());
    }

    async clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void> {
        await FileSystem.rm(Path.join(workspace.getDirectory(), packageManager.getLockFileName()));
    }
}
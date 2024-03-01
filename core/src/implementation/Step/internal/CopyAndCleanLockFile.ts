import { IPackageManager, IStep } from "../../..";
import { Workspace } from "../../../interface/IPackageManager";
import FileSystem from 'fs/promises';
import Path from 'path';

export class CopyAndCleanLockFileStep implements IStep {
    async execute(workspace: Workspace, packageManager: IPackageManager) {
        await FileSystem.writeFile(Path.join(workspace.getDirectory(), packageManager.getLockFileName()), packageManager.getCleanLockFile());
    }

    async clean(workspace: Workspace, packageManager: IPackageManager): Promise<void> {
        await FileSystem.rm(Path.join(workspace.getDirectory(), packageManager.getLockFileName()));
    }
}
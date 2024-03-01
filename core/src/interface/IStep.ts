import { IPackageManager, Workspace } from "./IPackageManager";

export interface IStep {
    execute(workspace: Workspace, packageManager: IPackageManager): Promise<void>;

    clean(workspace: Workspace, packageManager: IPackageManager): Promise<void>;
}
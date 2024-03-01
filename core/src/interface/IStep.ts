import { IPackageManager, IWorkspace } from "./IPackageManager";

export interface IStep {
    execute(workspace: IWorkspace, packageManager: IPackageManager): Promise<void>;

    clean(workspace: IWorkspace, packageManager: IPackageManager): Promise<void>;
}
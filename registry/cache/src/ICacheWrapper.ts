import type { IPackageManager, IStep, IWorkspace } from "@veto-party/baum__core";
import type { ARegistryStep } from "@veto-party/baum__registry";

export interface ICacheWrapper extends IStep {
    registerModifyPackageJSON(step: ARegistryStep): Promise<void>;
    flush(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined): Promise<void>;
}
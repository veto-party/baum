import { IExecutablePackageManager, IStep, IWorkspace, ModifyNPMRC } from "@veto-party/baum__core";

export class NPMRCForSpecifiedRegistryStep implements IStep {

    constructor(
        private registry: string
    ) { }

    private workspaceToStep: Map<IWorkspace, IStep> = new Map();

    async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        if (!this.workspaceToStep.has(workspace)) {
            const dependents = (await workspace.getDynamicDependents()).filter((dependent) => dependent.getName().startsWith("@") && dependent.getName().includes("/"));
            if (dependents.length > 0) {
                this.workspaceToStep.set(workspace, new ModifyNPMRC(dependents.reduce((prev, current) => `
${prev}
${current.getName().substring(current.getName().indexOf("/"))}:registry=${this.registry}

          `, '')));
            }
        }


        return this.workspaceToStep.get(workspace)?.execute(workspace, packageManager, rootDirectory);
    }
    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        return this.workspaceToStep.get(workspace)?.clean(workspace, packageManager, rootDirectory);
    }
} 
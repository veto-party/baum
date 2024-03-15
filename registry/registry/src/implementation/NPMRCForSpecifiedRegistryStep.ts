import { ModifyNPMRC, getDependentWorkspaces } from '@veto-party/baum__core';

export class NPMRCForSpecifiedRegistryStep extends ModifyNPMRC {
  constructor(private registry: string) {
    super(async (workspace, pm, root) => {
      const packages = await pm.readWorkspace(root);

      const checkedDependents = getDependentWorkspaces(workspace, packages, pm);
      return `\n${checkedDependents.map((dependent) => dependent.getName().includes("/") && packages.some((givenPackage) => givenPackage.getName() === dependent.getName()) ? `${dependent.getName().substring(0, dependent.getName().indexOf("/"))}:registry=${this.registry}` : '').filter(Boolean).join("\n")}`;
    });
  }
}

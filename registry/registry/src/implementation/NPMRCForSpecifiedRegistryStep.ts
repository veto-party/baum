import { ModifyNPMRC } from '@veto-party/baum__core';

export class NPMRCForSpecifiedRegistryStep extends ModifyNPMRC {
  constructor(private registry: string) {
    super(async (workspace, pm, root) => {
      const packages = await pm.readWorkspace(root);
      return workspace.getDynamicDependents().map((dependent) => dependent.getName().includes("/") && packages.some((givenPackage) => givenPackage.getName() === dependent.getName()) ? `${dependent.getName().substring(0, dependent.getName().indexOf("/"))}:registry=${this.registry}` : '').filter(Boolean).join("\n");
    })
  }
}

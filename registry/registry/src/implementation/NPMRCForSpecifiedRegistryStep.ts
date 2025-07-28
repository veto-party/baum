import { getDependentWorkspaces, type IWorkspace, ModifyNPMRC } from '@veto-party/baum__core';

export class NPMRCForSpecifiedRegistryStep extends ModifyNPMRC {
  constructor(private registry: string) {
    super(async (workspace, pm, root) => {
      const packages = await pm.readWorkspace(root);
      const checkedDependents: IWorkspace[] = [];
      const currentDependentsToCheck = new Set([workspace]);

      let currentIndex = 0;
      do {
        const newDependents = getDependentWorkspaces(Array.from(currentDependentsToCheck.values())[currentIndex], packages, pm);
        checkedDependents.push(...newDependents);
        newDependents.forEach((dependent) => currentDependentsToCheck.add(dependent));
      } while (currentDependentsToCheck.size > ++currentIndex);

      return `\n${checkedDependents
        .map((dependent) => (dependent.getName().includes('/') && packages.some((givenPackage) => givenPackage.getName() === dependent.getName()) ? `${dependent.getName().substring(0, dependent.getName().indexOf('/'))}:registry=${this.registry}` : ''))
        .filter(Boolean)
        .join('\n')}`;
    });
  }
}

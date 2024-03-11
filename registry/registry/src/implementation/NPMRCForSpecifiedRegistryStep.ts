import { IDependent, IWorkspace, ModifyNPMRC } from '@veto-party/baum__core';
import semver from 'semver';

export class NPMRCForSpecifiedRegistryStep extends ModifyNPMRC {
  constructor(private registry: string) {
    super(async (workspace, pm, root) => {
      const packages = await pm.readWorkspace(root);

      const mappedPackages = packages.reduce<Record<string, IWorkspace[]>>((previous, aPackage) => {
        previous[aPackage.getName()] ??= [];
        previous[aPackage.getName()].push(aPackage);
        return previous;
      }, {});

      // Sort (mutate) arrays.
      Object.values(mappedPackages).forEach((entries) => entries.sort((a, b) => semver.compare(a.getVersion(), b.getVersion()) || semver.compareBuild(a.getVersion(), b.getVersion())));


      const allDependentsToParse = [...workspace.getDynamicDependents()];
      const checkedDependents: Record<string, IDependent> = {};

      const dependentToKey = (dependent: IDependent) => `${dependent.getName()}@${dependent.getVersion()}`;


      while (allDependentsToParse.length > 0) {
        const currentDependent = allDependentsToParse.shift()!;
        if (!mappedPackages[currentDependent.getName()]) {
          continue;
        }

        if (checkedDependents[dependentToKey(currentDependent)]) {
          continue;
        }

        const resolvedVersion = pm.modifyToRealVersionValue(currentDependent.getVersion()) || currentDependent.getVersion();

        const resolvedPackage = mappedPackages[currentDependent.getName()].findLast((workspace, index) => {
          const workspaceVersion = pm.modifyToRealVersionValue(workspace.getVersion()) === "*" ? `${index}.0.0` : pm.modifyToRealVersionValue(workspace.getVersion()) || workspace.getVersion();
          return semver.satisfies(resolvedVersion, workspaceVersion);
        });

        if (!resolvedPackage) {
          continue;
        }

        allDependentsToParse.push(...resolvedPackage.getDynamicDependents());

      }

      return "\n" + Object.values(checkedDependents).map((dependent) => dependent.getName().includes("/") && packages.some((givenPackage) => givenPackage.getName() === dependent.getName()) ? `${dependent.getName().substring(0, dependent.getName().indexOf("/"))}:registry=${this.registry}` : '').filter(Boolean).join("\n");
    })
  }
}

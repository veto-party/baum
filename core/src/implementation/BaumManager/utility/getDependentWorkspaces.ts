import semver from 'semver';
import { IDependent, IPackageManager, IWorkspace } from "../../../index.js";

export const getDependentWorkspaces = (workspace: IWorkspace, others: IWorkspace[], pm: IPackageManager, getPackagesFor: (workspace: IWorkspace) => IDependent[] = () => workspace.getDynamicDependents()) => {

    const mappedPackages = others.reduce<Record<string, IWorkspace[]>>((previous, aPackage) => {
        previous[aPackage.getName()] ??= [];
        previous[aPackage.getName()].push(aPackage);
        return previous;
    }, {});

    // Sort (mutate) arrays.
    Object.values(mappedPackages).forEach((entries) => entries.sort((a, b) => semver.compare(a.getVersion(), b.getVersion()) || semver.compareBuild(a.getVersion(), b.getVersion())));


    const allDependentsToParse = [...workspace.getDynamicDependents()];
    const checkedDependents: Record<string, IWorkspace> = {};

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
            const workspaceVersion = pm.modifyToRealVersionValue(workspace.getVersion()) === "*" ? '0.0.0' : pm.modifyToRealVersionValue(workspace.getVersion()) || workspace.getVersion();
            return semver.satisfies(workspaceVersion, resolvedVersion);
        });

        if (!resolvedPackage) {
            continue;
        }

        checkedDependents[dependentToKey(currentDependent)] = resolvedPackage;
        allDependentsToParse.push(...getPackagesFor(resolvedPackage));
    }

    return Object.values(checkedDependents);
}
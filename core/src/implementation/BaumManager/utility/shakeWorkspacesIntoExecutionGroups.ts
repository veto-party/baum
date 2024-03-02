import { IDependent, IWorkspace } from "../../../interface/IPackageManager.js";
import * as semver from 'semver';

export const shakeWorkspacesIntoExecutionGroups = (workspaces: IWorkspace[]): IWorkspace[][] => {

    let nodes: [name: string, version: string, workspace: IWorkspace, deps: [version: string, dependent: IDependent][], index: number][] = [];

    const dependencyMapping = workspaces.reduce<Record<string, [string, IWorkspace][]>>((previous, workspace) => {
        previous[workspace.getName()] ??= [];

        // TODO: improve sorting
        if (previous[workspace.getName()].some(([version]) => semver.eq(version, workspace.getVersion()))) {
            // TODO: Improve error logging.
            throw new Error("Duplicate package, cannot resolve tree.");
        }

        const index = previous[workspace.getName()].push([workspace.getVersion(), workspace]);
        nodes.push([workspace.getName(), workspace.getVersion(), workspace, workspace.getDynamicDependents().map((dependent) => {
            return [dependent.getVersion(), dependent];
        }), index]);
        return previous;
    }, {});

    // Sort (mutate) arrays.
    Object.values(dependencyMapping).forEach((entries) => entries.sort(([a], [b]) => semver.compare(a, b) || semver.compareBuild(a, b)));

    const withoutDependencies = workspaces.filter((workspace) => {
        return !workspace.getDynamicDependents().some((dependent) => {
            if (!dependencyMapping[dependent.getName()]) {
                return false;
            }

            return semver.satisfies(dependent.getVersion(), workspace.getVersion());
        });
    });


    let checkedDepth = 0;
    let currentDepth = 0;
    const dependenciesToCheck: [string, IWorkspace, number][] = withoutDependencies.map((workspace) => [workspace.getVersion(), workspace, currentDepth]);

    const workspaceGroups: IWorkspace[][] = [[]];

    while (dependenciesToCheck.length > 0) {
        const [sem, dependency, givenDepth] = dependenciesToCheck.shift()!;
        currentDepth++;

        if (checkedDepth < givenDepth) {
            checkedDepth = givenDepth;
            workspaceGroups.push([]);
        }

        workspaceGroups[workspaceGroups.length - 1].push(dependency);

        if (!sem) {
            throw new Error("internal error!");
        }

        nodes = nodes.map((entry) => {

            const [name, version, workspace, deps, index] = entry;
            // TODO: check if it is latest version that satisfies.

            const newDeps = deps.filter(([ver, dependent]) => {
                const arr = dependencyMapping[dependent.getName()] ?? [];
                return (semver.satisfies(ver, dependency.getVersion()) && (index <= arr.length - 2 || !semver.satisfies(arr[index + 1][0], dependency.getVersion())));
            });


            if (newDeps.length === 0) {
                dependenciesToCheck.push([version, workspace, currentDepth]);
            }

            return [name, version, workspace, newDeps, index] as typeof nodes[number];
        }).filter((node) => node[3].length !== 0);
    }

    return workspaceGroups;
}
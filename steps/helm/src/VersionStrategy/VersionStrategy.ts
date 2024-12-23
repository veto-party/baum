import { VersionProviderCallback } from "../HelmGenerator.js";
import semver from 'semver';
import git from 'simple-git';

export class VersionStrategy {
    private constructor() {
        // Private constructor to prevent instantiation from outside the class
    }

    public static createVersionsUsingGitChanges(currentVersions: Record<string, string|undefined>, lastGitHash: string): VersionProviderCallback {
        // Implementation for creating versions using Git changes
        console.log("Creating versions using Git changes...");

        enum VersionStatusUpdateType {
            PATCH = 0,
            MINOR = 1,
            MAJOR = 2
        }

        const versionIncrements: Record<string, VersionStatusUpdateType> = {};
        const minorChangedPackages: Record<string, true|undefined> = {};

        const __incrementVersion = (version: string, update: VersionStatusUpdateType) => {
            switch (update) {
                case VersionStatusUpdateType.PATCH:
                    return semver.inc(version, 'patch')?.toString();
                case VersionStatusUpdateType.MINOR:
                    return semver.inc(version, 'minor')?.toString();
                case VersionStatusUpdateType.MAJOR:
                    return semver.inc(version, 'major')?.toString();
                default:
                    throw new Error(`Version update type not implemented: ${update}`);
            }
        }

        const incrementVersion = (version: string, update: VersionStatusUpdateType) => {
            const newVersion = __incrementVersion(version, update);
            if (newVersion === undefined) {
                throw new Error(`Failed to increment version ${version} by update type ${update}`);
            }

            return newVersion;
        }

        return async (name, workpace, _packageManager, rootDirectory) => {
            if (!workpace) {
                // Handle global (root) module version. (If one other module incremented, this version should also be incremented.)
                const update = Object.values(versionIncrements).sort((a, b) => b - a).at(0);
                let version = currentVersions[name]
                if (update !== undefined && version) {
                    version = incrementVersion(version, update);
                }

                if (!version) {
                    console.log("No version found for name: ", name, '"; Will default to "0.0.0"');
                    version = '0.0.0';
                }

                return version;
            }

            // Handle module-specific versions using git
            const gitInstance = git.default(rootDirectory, {
                baseDir: workpace.getDirectory()
            });

            const diff = await gitInstance.diff({
                from: lastGitHash,
                to: 'HEAD'
            }).catch(() => {
                // We definely have a change since it cannot be computed, probably outside of branches.
                return [null];
            });

            if (diff.length > 0) {
                console.log("Git diff found for name: ", name);
                versionIncrements[name] ??= currentVersions[name] ? VersionStatusUpdateType.PATCH : VersionStatusUpdateType.MAJOR;
                minorChangedPackages[name] = true; // TODO: Add version logic.
            }

            const hasMinorChangeThroughDependent = workpace.getDynamicDependents().some(dependent => {
                return minorChangedPackages[dependent.getName()] ?? false;
            });

            if (hasMinorChangeThroughDependent) {
                versionIncrements[name] ??= currentVersions[name] ? VersionStatusUpdateType.MINOR : VersionStatusUpdateType.MAJOR;
                minorChangedPackages[name] = true; // TODO: Add version logic.
            }

            if (versionIncrements[name] && currentVersions[name]) {
                return incrementVersion(currentVersions[name]!, versionIncrements[name]);
            }

            return "0.0.0";
        };
    }
}
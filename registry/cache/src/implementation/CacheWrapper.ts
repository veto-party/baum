import { type IBaumManagerConfiguration, type IExecutablePackageManager, type IPackageManager, IStep, type IWorkspace, Resolver } from "@veto-party/baum__core";
import type { ICacheWrapper } from "../ICacheWrapper.js";
import type { IVersionStrategy } from "../IVersionStrategy.js";
import type { INameTransformer } from "../INameTransformer.js";
import semver from 'semver';
import type { ARegistryStep } from "@veto-party/baum__registry";

export class CacheWrapper implements ICacheWrapper {

    public constructor(
        private nameTransformer: INameTransformer,
        private versionStrategy: IVersionStrategy,
        private baum: IBaumManagerConfiguration
    ) {
        baum.addCleanup(async () => {
            await this.versionStrategy.getAttachedVersionManager?.()?.flush?.();
        })
    }

    async flush(workspace: IWorkspace, root: string, packageManager: IPackageManager | undefined): Promise<void> {
        const oldVersion = this.versionStrategy.getOldVersionNumber(workspace, root, packageManager);
        const newVersion = this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManager);
        if ((await oldVersion) === (await newVersion)) {
            return;
        }

        await this.versionStrategy.flushNewVersion(workspace, root, packageManager);
    }

    async registerModifyPackageJSON(step: ARegistryStep): Promise<void> {
        const fields = Resolver.dependencyFields.filter((el) => el !== 'devDepdencies');
        step.addModifier()
        step.addModifier(async (file, _versionManager, workspace, packageManger, root) => {

            const workspaces  = await packageManger.readWorkspace(root);

            const [oldVersion, newVersion] = await Promise.all([this.versionStrategy.getOldVersionNumber(workspace, root, packageManger), this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManger)] as const);

            if (oldVersion === newVersion) {
                return;
            }

            file.name = this.nameTransformer.getName(file.name);
            file.version = newVersion;

            const nameMap = new Map<string, IWorkspace[]>();

            for (const workspace of workspaces) {
                nameMap.set(workspace.getName(), [...nameMap.get(workspace.getName()) || [], workspace]);
            }

            for (const field of fields) {
                for (const name in file[field] ?? {}) {
                    const workspace = nameMap.get(name)?.find((el) => semver.satisfies(file[field][name], el.getVersion()));
                    if (!workspace) {
                        continue;
                    }

                    await this.nameTransformer.enableOverrideFor(workspace.getName());
                    file[field][name] = `npm:${this.nameTransformer.getName(workspace.getName())}@${await this.versionStrategy.getCurrentVersionNumber(workspace, root, packageManger)}`;
                }
            }

        });
    }

    async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        /** NO-OP */
    }

    async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
        if (!this.baum.isFailed()) {
            await this.flush(workspace, rootDirectory, packageManager);
        }
    }
    
}
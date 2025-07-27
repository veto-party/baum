import { type IWorkspace, type IPackageManager, CachedFN, clearCacheForFN } from "@veto-party/baum__core";
import type { IVersionStrategy } from "../../IVersionStrategy.js";
import type { ICurrentVersionManager } from "../../ICurrentVersionManager.js";
import type { INameTransformer } from "../../INameTransformer.js";
import semver from 'semver';

export abstract class IncrementalVersionStrategy implements IVersionStrategy {

    private versionStatusUpdates = new Map<IWorkspace, string>();

    constructor(
        protected versionProvider: ICurrentVersionManager,
        protected nameTransformer: INameTransformer,
        protected defaultVersion: string
    ) { }

    getCurrentVersionNumber(workspace: IWorkspace, root: string, packageManger: IPackageManager | undefined): Promise<string> {
        return this.__getCurrentVersionNumber(workspace);
    }

    @CachedFN(true)
    protected async __getCurrentVersionNumber(workspace: IWorkspace): Promise<string> {
        return this.versionStatusUpdates.has(workspace) ? this.versionStatusUpdates.get(workspace) ?? this.defaultVersion : await this.getOldVersionNumber(workspace);
    }

    protected async increment(workspace: IWorkspace, version: string) {
        const result = await semver.compare(await this.__getCurrentVersionNumber(workspace), version);

        if (result === 0) {
            return;
        }

        if (result === -1) {
            this.nameTransformer.enableOverrideFor(workspace.getName());
            this.versionStatusUpdates.set(workspace, version);
            clearCacheForFN(this, '__getCurrentVersionNumber' as any);
            return;
        }

        throw new Error(`Cannot increment version from ${await this.__getCurrentVersionNumber(workspace)} to ${version}, since to is smaller the from.`);
    }

    async getOldVersionNumber(workspace: IWorkspace): Promise<string> {

        const overrideVersion = (await this.versionProvider.getCurrentVersionFor(this.nameTransformer.getOverrideName(workspace.getName())));
        overrideVersion !== undefined && this.nameTransformer.enableOverrideFor(workspace.getName());
        return overrideVersion ?? (await this.versionProvider.getCurrentVersionFor(this.nameTransformer.getDefaultName(workspace.getName()))) ?? this.defaultVersion;
    }

    async flushNewVersion(workspace: IWorkspace): Promise<void> {
        if (this.versionStatusUpdates.has(workspace)) {
            await this.versionProvider.updateCurrentVersionFor(this.nameTransformer.getOverrideName(workspace.getName()), this.versionStatusUpdates.get(workspace)!);
        }
    }

    getAttachedVersionManager() {
        return this.versionProvider
    }
}
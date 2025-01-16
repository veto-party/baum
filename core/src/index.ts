import { shakeWorkspacesIntoExecutionGroups } from './implementation/BaumManager/utility/shakeWorkspacesIntoExecutionGroups.js';

export type { IBaumManager } from './interface/BaumManager/IBaumManager.js';
export type { IBaumManagerConfiguration, IBaumRegistrable } from './interface/BaumManager/IBaumManagerConfiguration.js';
export type { IPackageManager, IDependent, IWorkspace } from './interface/PackageManager/IPackageManager.js';
export type { IExecutablePackageManager } from './interface/PackageManager/IExecutablePackageManager.js';

export type { IStep, ISettableStep } from './interface/IStep.js';
export type { ICloneable } from './interface/ICloneable.js';

export type { IExecutablePackageManagerParser } from './interface/PackageManager/executor/IPackageManagerParser.js';
export type { IPackageManagerExecutor, ICommandIntent, IExecutionIntent, IExecutionIntentBuilder, IInstallIntent, IPublishIntent, IRunIntent } from './interface/PackageManager/executor/IPackageManagerExecutor.js';

export { CachedFN, clearCacheForFN } from './implementation/annotation/Cached.js';
export { RunOnce } from './implementation/annotation/RunOnce.js';

export { TemplateBuilder } from './implementation/Step/abstract/TemplateExecutor/TemplateBuilder.js';
export { ATemplateExecutor, type callbackArgs } from './implementation/Step/abstract/TemplateExecutor/ATemplateExecutor.js';

/** @internal */
export { ModifyNPMRC } from './implementation/Step/abstract/TemplateExecutor/intent/implementation/PublishIntent/ModifyNPMRC.js';
export { CommandStep } from './implementation/Step/CommandStep.js';
export { BaumManager } from './implementation/BaumManager/BaumManager.js';
export { ParallelStep } from './implementation/Step/ParallelStep.js';
export { PKGMStep } from './implementation/Step/PKGMStep.js';
export { GroupStep } from './implementation/Step/GroupStep.js';
export { RetryStep } from './implementation/Step/RetryStep.js';
export { ConditionalStep } from './implementation/Step/ConditionalStep.js';

export { GenericDependent } from './implementation/PackageManager/GenericDependent.js';
export { GenericWorkspace } from './implementation/PackageManager/GenericWorkspace.js';

export { allSettledButFailure, allSettledButNoFailures } from './implementation/BaumManager/utility/allSettledButNoFailure.js';

export { getDependentWorkspaces } from './implementation/BaumManager/utility/getDependentWorkspaces.js';

export { shakeWorkspacesIntoExecutionGroups } from './implementation/BaumManager/utility/shakeWorkspacesIntoExecutionGroups.js';

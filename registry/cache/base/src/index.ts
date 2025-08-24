export type { ICacheWrapper } from './ICacheWrapper.js';
export type { ICurrentVersionManager } from './ICurrentVersionManager.js';
export type { INameTransformer } from './INameTransformer.js';
export type { IVersionStrategy } from './IVersionStrategy.js';
export type { IStorage } from './IStorage.js';
export { CacheWrapper } from './implementation/CacheWrapper.js';
export { StaticNameTransformer } from './implementation/NameProvider/StaticNameTransformer.js';
export { SwitchNameTransformer } from './implementation/NameProvider/SwitchNameTransformer.js';
export { GitVersionStrategy } from './implementation/VersionStrategy/Git.js';
/** @internal */
export { IncrementalVersionStrategy } from './implementation/VersionStrategy/Incremental.js';

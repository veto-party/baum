import type { IWorkspace } from '@veto-party/baum__core';
import type { IFeature, JobFeature, MergeFeatures } from '@veto-party/baum__steps__installer__features';
import type { ARendererManager } from '../../../ARendererManager.js';
import type { HelmRenderer } from '../../HelmRenderer.js';
import type { IImageGenerator } from '../IImageGenerator.js';
import type { IWritable } from '../IWritable.js';
import type { ConfigMapping } from './IConfigMapRenderer.js';
import type { SystemUsageStorage } from './IDeploymentRenderer.js';
import type { SecretMapping } from './ISecretRenderer.js';

export type JobStructure = (typeof HelmRenderer)['buildBaseInstance'] extends (...args: any[]) => ARendererManager<IFeature<infer A0, infer A1, infer A2>, any> ? (MergeFeatures<IFeature<A0, A1, A2>, undefined, JobFeature> extends IFeature<any, any, infer Structure> ? Structure : never) : never;

export interface IJobRendererResult extends IWritable {}

export interface IJobRenderer {
  render(
    workspace: IWorkspace | undefined,
    key: string,
    job: JobStructure,
    map: Map<string | number, ConfigMapping | SecretMapping>,
    // scaling: ScalingStorage | undefined,
    systemUsage: SystemUsageStorage | undefined,
    imageGenerator: IImageGenerator
  ): IJobRendererResult | Promise<IJobRendererResult>;
}

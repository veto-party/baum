import type { IWorkspace } from '@veto-party/baum__core';
import type { IFeature, ScalingFeature, SystemUsageFeature, UpdateStrategy } from '@veto-party/baum__steps__installer__features';
import type { ConfigMapping } from './IConfigMapRenderer.js';
import type { IImageGenerator } from './IImageGenerator.js';
import type { SecretMapping } from './ISecretRenderer.js';
import type { IWritable } from './IWritable.js';

export type ScalingStorage = ScalingFeature extends IFeature<any, any, infer Structure> ? Structure : never;
export type UpdateStorage = UpdateStrategy extends IFeature<any, any, infer Structure> ? Structure : never;
export type SystemUsageStorage = SystemUsageFeature extends IFeature<any, any, infer Structure> ? Structure : never;

export interface IDeploymentRenderResult extends IWritable {}

export interface IDeploymentRenderer {
  render(workspace: IWorkspace, map: Map<string | number, ConfigMapping | SecretMapping>, ports: Set<number>, scaling: ScalingStorage | undefined, update: UpdateStorage | undefined, systemUsage: SystemUsageStorage | undefined, imageGenerator: IImageGenerator): IDeploymentRenderResult | Promise<IDeploymentRenderResult>;
}

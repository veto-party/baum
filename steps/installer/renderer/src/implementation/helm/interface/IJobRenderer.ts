import type { IFeature, JobFeature, MergeFeatures } from '@veto-party/baum__steps__installer__features';
import type { HelmRenderer } from '../HelmRenderer.js';
import type { IWritable } from './IWritable.js';

export type JobStructure = (typeof HelmRenderer)['buildBaseInstance'] extends (...args: any[]) => HelmRenderer<IFeature<infer A0, infer A1, infer A2>> ? (MergeFeatures<IFeature<A0, A1, A2>, undefined, JobFeature> extends IFeature<any, any, infer Structure> ? Structure : never) : never;

export interface IJobRendererResult extends IWritable {}

export interface IJobRenderer {
  render(name: string, job: JobStructure): IJobRendererResult | Promise<IJobRendererResult>;
}

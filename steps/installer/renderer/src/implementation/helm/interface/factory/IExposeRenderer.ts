import type { IWorkspace } from '@veto-party/baum__core';
import type { ExposeFeature, IFeature } from '@veto-party/baum__steps__installer__features';
import type { IWritable } from '../IWritable.js';

export interface IExposeRenderResult extends IWritable {
  getPorts(): Set<number>;
}

export type ExposeStructure = ExposeFeature extends IFeature<any, any, infer Structure> ? (Structure extends Record<string, infer ValueStructure> ? ValueStructure : never) : never;

export interface IExposeRenderer {
  render(workspace: IWorkspace, config: Map<string | number, ExposeStructure> | undefined): IExposeRenderResult;
}

import type { IWorkspace } from '@veto-party/baum__core';
import type { IFeature, ServiceFeature } from '@veto-party/baum__steps__installer__features';
import type { INameProvider } from '../../../../interface/INameProvider.js';
import type { IWritable } from '../IWritable.js';

export type ThirdPartyRendererStorage = typeof ServiceFeature.makeInstance extends () => IFeature<any, any, infer Structure> ? (Structure extends Record<string, any> ? Structure[string] : never) : never;

export interface I3rdPartyRendererResult extends IWritable {
  getConfigMap(resolver: INameProvider): Promise<Map<string, any>>;
}

export interface I3rdPartyRenderer {
  render(workspace: IWorkspace | undefined, dependencies: Map<string | number, ThirdPartyRendererStorage>): I3rdPartyRendererResult | Promise<I3rdPartyRendererResult>;
}

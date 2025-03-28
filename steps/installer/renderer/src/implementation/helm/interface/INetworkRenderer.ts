import type { IWorkspace } from '@veto-party/baum__core';
import type { IFeature, NetworkFeature } from '@veto-party/baum__steps__installer__features';
import type { IWritable } from './IWritable.js';

export type NetworkStorage = NetworkFeature extends IFeature<any, any, infer Structure> ? Structure : never;

export interface INetworkRendererResult extends IWritable {}

export interface INetworkRenderer {
  render(workspace: IWorkspace | undefined, key: string | undefined, network: NetworkStorage): INetworkRendererResult | Promise<INetworkRendererResult>;
}

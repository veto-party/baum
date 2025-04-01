import type { IWorkspace } from '@veto-party/baum__core';
import type { IFeature, VariableFeature } from '@veto-party/baum__steps__installer__features';
import type { IWritable } from '../IWritable.js';

export type IConfigMapStructure = typeof VariableFeature.makeInstance extends () => IFeature<any, any, infer Structure> ? (Structure extends Record<infer Key, infer Value> ? Map<Key, Value> : never) : never;

export type ConfigMappingWithStore = {
  store: string | undefined;
  key: string | number;
  recreate: boolean;
  global?: boolean;
  variable?: undefined;
};

export type StaticConfigMapping = {
  variable: string | number | boolean | Record<any, any> | undefined;
  store?: undefined;
  key?: undefined;
};

export type ConfigMapping =
  | ({
      type: 'variable';
    } & ConfigMappingWithStore)
  | ({
      type: 'variable';
    } & StaticConfigMapping);

export interface IConfigMapRendererResult extends IWritable {
  getResolvedWorkspaceVars(): Map<string | number, ConfigMapping>;
  getValues(): Map<string, any>;
}

export interface IConfigMapNameProvider {
  getNameFor(workspace: IWorkspace | undefined, name?: string): string | Promise<string>;
}

export interface IConfigMapRenderer {
  render(workspace: IWorkspace | undefined, map: Map<IWorkspace | undefined, IConfigMapStructure>, binding: Map<string, string> | undefined, name?: string): IConfigMapRendererResult | Promise<IConfigMapRendererResult>;
}

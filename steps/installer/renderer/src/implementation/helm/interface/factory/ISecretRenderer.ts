import type { IWorkspace } from '@veto-party/baum__core';
import type { ConfigMappingWithStore, IConfigMapStructure } from './IConfigMapRenderer.js';
import type { IWritable } from '../IWritable.js';

export type SecretMapping = {
  type: 'secret';
} & ConfigMappingWithStore;

export interface ISecretRendererResult extends IWritable {
  getResolvedWorkspaceSecrets(): Map<string | number, SecretMapping>;
  getValues(): Map<string, any>;
}

export interface ISecretNameProvider {
  getNameFor(workspace: IWorkspace|undefined, name?: string): string | Promise<string>;
}

export interface ISecretRenderer {
  render(workspace: IWorkspace | undefined, map: Map<IWorkspace | undefined, IConfigMapStructure>, binding: Map<string, string> | undefined, key?: string): ISecretRendererResult | Promise<ISecretRendererResult>;
}

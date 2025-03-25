import type { IWorkspace } from '@veto-party/baum__core';
import type { ConfigMappingWithStore, IConfigMapStructure } from './IConfigMapRenderer.js';
import type { IWritable } from './IWritable.js';

export type SecretMapping = {
  type: 'secret';
} & ConfigMappingWithStore;

export interface ISecretRendererResult extends IWritable {
  getResolvedWorkspaceSecrets(): Map<string, SecretMapping>;
}

export interface ISecretRenderer {
  render<Key>(workspace: IWorkspace | undefined, key: Key | undefined, map: Map<IWorkspace | undefined, IConfigMapStructure>, binding: Map<string, string> | undefined): ISecretRendererResult | Promise<ISecretRendererResult>;
}

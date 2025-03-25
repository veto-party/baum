import type { IWorkspace } from '@veto-party/baum__core';
import type { IConfigMapRendererResult, IConfigMapStructure } from '../interface/IConfigMapRenderer.js';
import type { ISecretRenderer } from '../interface/ISecretRenderer.js';

export class SecretRenderer implements ISecretRenderer {
  render<Key>(workspace: IWorkspace | undefined, key: Key | undefined, map: Map<string | number | undefined, Map<Key | undefined, IConfigMapStructure>>, binding: Map<string, string> | undefined, name: string): IConfigMapRendererResult | Promise<IConfigMapRendererResult> {}
}

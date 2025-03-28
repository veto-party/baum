import type { IWorkspace } from '@veto-party/baum__core';
import type { I3rdPartyRenderer, I3rdPartyRendererResult, ThirdPartyRendererStorage } from '../interface/I3rdPartyRenderer.js';

export class ThirdPartyRenderer implements I3rdPartyRenderer {
  render(workspace: IWorkspace | undefined, dependencies: Map<string | number, ThirdPartyRendererStorage>): I3rdPartyRendererResult | Promise<I3rdPartyRendererResult> {
    return {
      getConfigMap: (): Map<string, any> => {
        return new Map(dependencies.entries().flatMap(([key, values]) => Object.entries(values.properties ?? {}).map(([baseKey, value]) => [`${key}.${baseKey}`, value] as const)));
      },
      write: async (root, resolver) => {}
    };
  }
}

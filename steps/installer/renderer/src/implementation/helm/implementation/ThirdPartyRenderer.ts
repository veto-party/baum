import type { IWorkspace } from '@veto-party/baum__core';
import type { I3rdPartyRenderer, I3rdPartyRendererResult, ThirdPartyRendererStorage } from '../interface/factory/I3rdPartyRenderer.js';
import { HelmRenderer } from '../HelmRenderer.js';
import { INameProvider } from '../../../interface/INameProvider.js';

export class ThirdPartyRenderer implements I3rdPartyRenderer {
  render(workspace: IWorkspace | undefined, dependencies: Map<string | number, ThirdPartyRendererStorage>): I3rdPartyRendererResult | Promise<I3rdPartyRendererResult> {
    return {
      getConfigMap: async (resolver: INameProvider): Promise<Map<string, any>> => {

        const name = await workspace === undefined ? undefined : resolver.getNameByWorkspace(workspace);

        return HelmRenderer.mergeElements(
          new Map(Array.from(dependencies.entries()).flatMap(([key, values]) => Object.entries(values.properties ?? {}).map(([baseKey, value]) => [[name, key, baseKey].filter(Boolean).join('.'), value] as const))),
          new Map(Array.from(dependencies.entries()).map(([key, data]) => [[name, key, data.origin_name_var].filter(Boolean).join('.'), key] as const))
        );
      },
      write: async (root, resolver) => {}
    };
  }
}

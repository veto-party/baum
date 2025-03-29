import FileSystem from 'node:fs/promises';
import { EOL } from 'node:os';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import { merge } from 'lodash-es';
import type { ExposeStructure, IExposeRenderResult, IExposeRenderer } from '../interface/IExposeRenderer.js';
import type { AToken } from '../yaml/AToken.js';
import { RawToken } from '../yaml/implementation/RawToken.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class TraefikExposeRenderer implements IExposeRenderer {
  public constructor(private entryPoint: string | AToken) {}

  private static relativeDomain(domain: string) {
    return new RawToken(`"${domain}{{ .Values.global.host.domain }}"`);
  }

  private static specMatch(domain?: string, path?: string) {
    // TODO: Some kind of escape.
    return new RawToken([domain ? `Host(${domain}{{.Values.global.host.domain}}\`)` : undefined, path ? `PathPrefix(\`${path}\`)` : undefined].filter(Boolean).join(' && '));
  }

  private static buildCORSOption(name: string, cors: Extract<ExposeStructure, { type: 'load-balancer' }>['cors'], origins: any[]) {
    return {
      apiVersion: 'traefik.io/v1alpha1',
      kind: 'Middleware',
      metadata: {
        name
      },
      spec: {
        headers: {
          accessControlAllowMethods: cors?.methods ?? ['*'],
          accessControlAllowHeaders: ['*'],
          accessControlAllowOriginList: origins,
          accessControlMaxAge: 100,
          addVaryHeader: true
        }
      }
    };
  }

  private static buildStripPathPrefixOption(name: string, prefixes: string[]) {
    return {
      apiVersion: 'traefik.io/v1aplha1',
      kind: 'Middleware',
      metadata: {
        name
      },
      spec: {
        stripPrefix: {
          prefixes
        }
      }
    };
  }

  private static buildAddPrefixOption(name: string, prefix: string) {
    return {
      apiVersion: 'traefik.io/v1alpha1',
      kind: 'Middleware',
      metadata: {
        name
      },
      spec: {
        addPrefix: {
          prefix
        }
      }
    };
  }

  render(workspace: IWorkspace, config: Map<string | number, ExposeStructure> | undefined): IExposeRenderResult {
    const cors = (name: string) =>
      Object.fromEntries(
        Array.from(config?.entries?.() ?? [])
          .map(([port, exposed]) => {
            if (exposed.type === 'internal') {
              return;
            }

            const origins: any[] = [];
            const { cors, matcher } = exposed;
            if (cors?.self && matcher?.domain) {
              if (matcher.domainIsAbsolute) {
                origins.push(matcher.domain);
              } else {
                origins.push(TraefikExposeRenderer.relativeDomain(matcher.domain));
              }
            }

            cors?.origins?.forEach((origin) => {
              if (origin.domainIsAbsolute) {
                origins.push(origin.domain);
                return;
              }

              origins.push(TraefikExposeRenderer.relativeDomain(origin.domain));
            });

            return [port, TraefikExposeRenderer.buildCORSOption(`${name}-${port}-cors`, cors, origins)];
          })
          .filter(<T>(value: T | undefined): value is T => value !== undefined)
      );

    const pathFilters = (name: string) =>
      Object.fromEntries(
        Array.from(config?.entries?.() ?? [])
          .map(([port, exposed]) => {
            if (exposed.type === 'internal') {
              return;
            }

            const matchers: any[] = [];

            if (exposed.appendPath) {
              matchers.push(TraefikExposeRenderer.buildAddPrefixOption(`${name}-${port}-path`, exposed.appendPath));
            }

            if (exposed.matcher?.path && !exposed.doNotStripPrefix) {
              matchers.push(TraefikExposeRenderer.buildStripPathPrefixOption(`${name}-${port}-path`, [exposed.matcher.path]));
            }

            if (matchers.length === 0) {
              return;
            }

            return merge({}, ...matchers);
          })
          .filter(<T>(value: T | undefined): value is T => value !== undefined)
      );

    const yaml = (name: string, filters: Record<string, { metadata: { name: string } }[]>[]) => [
      {
        apiVersion: 'traefik.io/v1alpha1',
        kind: 'IngressRoute',
        metadata: {
          name: `${name}-ingress`
        },
        spec: {
          entryPoints: [this.entryPoint],
          routes: config
            ?.entries()
            .map(([port, exposed]) => {
              if (exposed.type === 'internal') {
                return;
              }

              return {
                kind: 'Rule',
                match: TraefikExposeRenderer.specMatch(exposed.matcher?.domain, exposed.matcher?.path),
                services: [
                  {
                    name: `${name}-service`,
                    port: Number(port),
                    passHostHeader: exposed.passHostHeader
                  }
                ],
                middlewares: filters?.flatMap((filter) => Object.values(filter[port.toString()] ?? {}).map((el) => el.metadata.name))
              };
            })
            .filter(Boolean)
        }
      }
    ];

    return {
      getPorts: () => {
        const set = new Set((config?.keys() ?? []).map((el) => Number(el)));

        for (const value of Array.from(set.values())) {
          if (!Number.isInteger(value) || Number.isNaN(value) || !Number.isFinite(value)) {
            set.delete(value);
          }
        }

        return set;
      },
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(root, 'helm', path, 'templates');

        const corsYaml = cors(path);
        const filterYaml = pathFilters(path);

        const exposeYaml = yaml(path, [corsYaml, filterYaml]);

        const fileContent = [Object.values(corsYaml), Object.values(filterYaml), exposeYaml]
          .flat()
          .map(to_structured_data)
          .map((resolved) => resolved.write())
          .join(`${EOL}---${EOL}`);

        await FileSystem.mkdir(filepath, { recursive: true });
        await FileSystem.writeFile(Path.join(filepath, 'ingress.yaml'), fileContent);
      }
    };
  }
}

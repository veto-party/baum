import FileSystem from 'node:fs/promises';
import { EOL } from 'node:os';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import type { ExposeStructure, IExposeRenderer, IExposeRenderResult } from '../../interface/factory/IExposeRenderer.js';
import { RawToken } from '../../yaml/implementation/RawToken.js';
import { to_structured_data } from '../../yaml/to_structured_data.js';

export class GatewayExposeRenderer implements IExposeRenderer {
  private static relativeDomain(domain: string) {
    return new RawToken(`"${domain}{{ .Values.global.host.domain }}"`);
  }

  private static getCORSOrigins(config: Extract<ExposeStructure, { type: 'load-balancer' }>) {
    const origins: any[] = [];

    if (config?.cors?.self && config?.matcher?.domain) {
      if (config?.matcher?.domainIsAbsolute) {
        origins.push(config.matcher.domain);
      } else {
        origins.push(GatewayExposeRenderer.relativeDomain(config.matcher.domain));
      }
    }

    config?.cors?.origins?.forEach((origin) => {
      if (origin.domainIsAbsolute) {
        origins.push(origin.domain);
        return;
      }

      origins.push(GatewayExposeRenderer.relativeDomain(origin.domain));
    });

    return origins;
  }

  render(workspace: IWorkspace, config: Map<string | number, ExposeStructure> | undefined): IExposeRenderResult {
    const gatewayConfigs = (name: string) =>
      Array.from(config?.entries?.() ?? []).map(([port, exposed]) => {
        if (exposed.type === 'internal') {
          return;
        }

        return {
          apiVersion: 'gateway.networking.k8s.io/v1',
          kind: 'HTTPRoute',
          metadata: {
            name: `${name}-httproute-gateway`
          },
          spec: {
            parentRefs: [
              {
                kind: 'Service',
                name: `${name}-service`,
                port
              }
            ],
            hostnames: exposed.matcher?.domain ? [GatewayExposeRenderer.relativeDomain(exposed.matcher?.domain)] : undefined,
            rules: [
              {
                name: `${name}-rule`,
                routeMatch: exposed.matcher?.path
                  ? [
                      {
                        path: exposed.matcher?.path
                      }
                    ]
                  : undefined,
                filters:
                  exposed.doNotStripPrefix || !exposed.matcher?.path
                    ? undefined
                    : [
                        {
                          type: 'URLRewrite',
                          urlRewrite: {
                            path: {
                              type: 'ReplacePrefixMatch',
                              replacePrefixMatch: exposed.matcher.path
                            }
                          }
                        },
                        {
                          type: 'ResponseHeaderModifier',
                          cors: {
                            allowOrigins: GatewayExposeRenderer.getCORSOrigins(exposed),
                            allowMethods: exposed.cors?.methods ?? ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                            allowHeaders: exposed.cors?.headers?.incomming ?? [],
                            exposeHeaders: exposed.cors?.headers?.outgoing ?? [],
                            maxAge: exposed.cors?.maxAge
                          }
                        }
                      ]
              }
            ],
            sessionPersistence: exposed.sticky
              ? {
                  sessionName: exposed.sticky.fieldName,
                  idleTimeout: exposed.sticky.lifetime
                }
              : undefined
          }
        };
      });

    return {
      getPorts: () => {
        const set = new Set(Array.from(config?.keys() ?? []).map((el) => Number(el)));

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

        const fileContent = gatewayConfigs(path)
          .filter(<T>(el: T | undefined): el is T => el !== undefined)
          .flat()
          .map(to_structured_data)
          .map((resolved) => resolved.write())
          .join(`${EOL}---${EOL}`);

        await FileSystem.mkdir(filepath, { recursive: true });
        await FileSystem.writeFile(Path.join(filepath, 'gateway.yaml'), fileContent);
      }
    };
  }
}

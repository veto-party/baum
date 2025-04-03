import FileSystem from 'node:fs/promises';
import Path from 'node:path';
import type { IWorkspace } from '@veto-party/baum__core';
import type { IContainerName } from '../interface/IContainerName.js';
import type { IDeploymentNameProvider } from '../interface/IDeploymentNameProvider.js';
import type { IImageGenerator } from '../interface/IImageGenerator.js';
import type { IMatchLabel } from '../interface/IMatchLabel.js';
import type { ConfigMapping } from '../interface/factory/IConfigMapRenderer.js';
import type { IDeploymentRenderResult, IDeploymentRenderer, ScalingStorage, SystemUsageStorage, UpdateStorage } from '../interface/factory/IDeploymentRenderer.js';
import type { SecretMapping } from '../interface/factory/ISecretRenderer.js';
import { ArrayToken } from '../yaml/implementation/ArrayToken.js';
import { ConditionalToken } from '../yaml/implementation/ConditionalToken.js';
import { ObjectToken } from '../yaml/implementation/ObjectToken.js';
import { to_structured_data } from '../yaml/to_structured_data.js';

export class DeploymentRenderer implements IDeploymentRenderer {
  public constructor(
    private containerNameProvider: IContainerName,
    private labelProvider: IMatchLabel,
    private deploymentNameProvider: IDeploymentNameProvider,
    private secretName = 'pull-secret'
  ) {}

  render(
    workspace: IWorkspace,
    map: Map<string | number, ConfigMapping | SecretMapping>,
    ports: Set<number>,
    scaling: ScalingStorage | undefined,
    update: UpdateStorage | undefined,
    systemUsage: SystemUsageStorage | undefined,
    imageGenerator: IImageGenerator
  ): IDeploymentRenderResult | Promise<IDeploymentRenderResult> {
    const limits = Object.entries(systemUsage?.limit ?? {}).filter(([, value]) => Boolean(value));
    const requests = Object.entries(systemUsage?.requested ?? {}).filter(([, value]) => Boolean(value));

    const yaml = (name: string) => ({
      apiVersion: 'apps/v1',
      kind: 'deployment',
      metadata: {
        name: this.deploymentNameProvider.getName(name)
      },
      spec: {
        replicas: scaling?.minPods ?? 1,
        selector: {
          matchLabels: {
            app: `${name}-depl`
          }
        },
        strategy:
          update?.type === 'RollingUpdate'
            ? {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxSurge: update.maxSurge,
                  maxUnavailable: update.maxUnavailable
                }
              }
            : update?.type === 'Rereate'
              ? {
                  type: update.type
                }
              : undefined,
        template: {
          metadata: {
            labels: {
              app: `${name}-depl`
            }
          },
          spec: {
            imagePullSecrets: new ConditionalToken(
              `if eq .Values.global.registry.type "secret"`,
              new ArrayToken([
                new ObjectToken({
                  name: this.secretName
                })
              ])
            ),
            containers: [
              {
                name: this.containerNameProvider.getForContainer(name),
                image: imageGenerator.generateImage(workspace).image,
                ports: Array.from(ports.values()).map((port) => ({
                  containerPort: port
                })),
                resources: {
                  limits: limits.length > 0 ? Object.fromEntries(limits) : undefined,
                  requests: requests.length > 0 ? Object.fromEntries(requests) : undefined
                },
                nodeSelector: {
                  label: this.labelProvider.getForContainer(name)
                },
                env: Array.from(map.entries()).map(([name, value]) => ({
                  name,
                  ...('store' in value && value.store
                    ? {
                        valueFrom: {
                          [value.type === 'secret' ? 'secretKeyRef' : 'configMapKeyRef']: {
                            name: value.store,
                            key: value.key
                          }
                        }
                      }
                    : {
                        value: value.variable
                      })
                }))
              }
            ]
          }
        }
      }
    });

    return {
      write: async (root, resolver) => {
        const path = await resolver.getNameByWorkspace(workspace);
        const filepath = Path.join(root, 'helm', path, 'templates');

        await FileSystem.mkdir(filepath, { recursive: true });
        await FileSystem.writeFile(Path.join(filepath, 'deployment.yaml'), to_structured_data(yaml(path)).write());
      }
    };
  }
}

import FileSystem from 'node:fs/promises';
import { EOL } from 'node:os';
import Path from 'node:path';
import { CachedFN, type IExecutablePackageManager, type IStep, type IWorkspace } from '@veto-party/baum__core';
import set from 'lodash.set';
import type { ExtendedSchemaType, HelmGeneratorProvider } from './HelmGeneratorProvider.js';
import type { SchemaType } from './types/types.js';
import { buildVariable, getHash } from './utility/buildVariable.js';
import { resolveBindings } from './utility/resolveReference.js';
import { ArrayToken } from './yaml/implementation/ArrayToken.js';
import { ConditionalToken } from './yaml/implementation/ConditionalToken.js';
import { ObjectToken } from './yaml/implementation/ObjectToken.js';
import { RawToken } from './yaml/implementation/RawToken.js';
import { to_structured_data } from './yaml/to_structure_data.js';

export class HelmGenerator implements IStep {
  constructor(
    private helmFileGeneratorProvider: HelmGeneratorProvider,
    private dockerFileGenerator: (workspace: IWorkspace) => string,
    private dockerFileForJobGenerator: (schema: Exclude<SchemaType['job'], undefined>[string], workspace: IWorkspace, job: string) => string,
    private version: string,
    private name = 'root'
  ) {}

  private async writeObjectToFile(root: string, path: string[], obj: any[]) {
    if (obj.length === 0) {
      return;
    }

    const resulting = Path.join(root, ...path);

    try {
      await FileSystem.mkdir(Path.dirname(resulting), {
        recursive: true
      });
    } catch (error) {
      console.warn(error);
    }

    await FileSystem.writeFile(
      resulting,
      obj
        .map(to_structured_data)
        .map((resolved) => resolved.write())
        .join(`${EOL}---${EOL}`)
    );
  }

  private static buildVariablePath(variable: string, sep = '.'): string {
    return variable
      .split('.')
      .map((variable) => variable.replaceAll('-', '_'))
      .join(sep);
  }

  @CachedFN(true)
  async generateGlobalScope(contexts: Map<IWorkspace, ExtendedSchemaType>, context: ExtendedSchemaType, rootDirectory: string) {
    const ChartYAML = {
      apiVersion: 'v2',
      type: 'application',
      name: this.name,
      version: this.version,
      dependencies: [] as any[]
    };

    Object.entries(context.service ?? {})
      .sort(([nameA], [nameB]) => nameA.localeCompare(nameB))
      .forEach(([name, service]) => {
        if (service.is_local) {
          ChartYAML.dependencies.push({
            name: name,
            version: this.version,
            repository: `file://${Path.join('..', 'subcharts', service.workspace.getName().replaceAll('/', '__'))}`
          });
          return;
        }

        if (service.type !== 'global') {
          return;
        }

        ChartYAML.dependencies.push({
          name: service.definition.origin.name,
          version: service.definition.origin.version,
          repository: service.definition.origin.repository,
          alias: name
        });
      });

    await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'Chart.yaml'], [ChartYAML]);

    const valuesYAML: Record<string, any> = {};

    set(valuesYAML, 'global.registry.type', 'local');
    set(valuesYAML, 'global.host.domain', 'localhost');

    const allBindings = Array.from(contexts.values()).flatMap((definition) => Object.entries(resolveBindings(definition.binding ?? {}, definition, context)).filter(([, value]) => value.is_global));

    const finalizedSCopedContext = Array.from(contexts.entries()).reduce((prev, [workspace, schema]) => this.helmFileGeneratorProvider.groupScopes([schema, prev], workspace), {
      variable: {},
      is_service: false
    } as ExtendedSchemaType);

    allBindings.push(...Object.entries(resolveBindings(context.binding ?? {}, finalizedSCopedContext, context)));

    [...Array.from(contexts.values()).map((context) => [context, false] as const), [context, true] as const].forEach(([current, is_global]) => {
      Object.values(current.job ?? {}).forEach((job) => {
        allBindings.push(...Object.entries(resolveBindings(job.binding ?? {}, !is_global ? (job.variable ? [current, job] : current) : current, is_global ? (job.variable ? [context, job] : context) : context, is_global)));
      });
    });

    allBindings.forEach(([key, resolved]) => {
      if ((resolved.is_global || resolved.external) && !resolved.static) {
        set(valuesYAML, (resolved.is_global && !resolved.external ? 'global.' : '') + resolved.referenced, buildVariable(resolved, 'global'));
      }
    });

    Object.entries(context.variable)
      .filter(([, v]) => v.external)
      .forEach(([key, value]) => {
        set(valuesYAML, key, buildVariable(value, 'global'));
      });

    if (Object.keys(valuesYAML).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'values.yaml'], [valuesYAML]);
    }

    const secretsYAML = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name: 'global'
      },
      type: 'Opaque',
      stringData: Object.fromEntries(
        allBindings
          .filter(([, value]) => !value.static && value.secret && value.is_global)
          .map(([key, value]) => {
            return [key, new RawToken(`{{.Values.${HelmGenerator.buildVariablePath(value.referenced, '.')} | quote }}`)];
          })
      )
    };

    if (Object.keys(secretsYAML.stringData).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'templates', 'secret.yaml'], [secretsYAML]);
    }

    const configMapYAML = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name: 'global'
      },
      data: Object.fromEntries(
        allBindings
          .filter(([, value]) => !value.static && !value.secret && value.is_global)
          .map(([key, value]) => {
            return [key, new RawToken(`{{.Values.${value.external ? '' : 'global.'}${HelmGenerator.buildVariablePath(value.referenced, '.')} | quote }}`)];
          })
      )
    };

    if (Object.keys(configMapYAML.data).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'templates', 'configmap.yaml'], [configMapYAML]);
    }

    const jobYAML = Object.entries(context?.job ?? {}).map(([key, entry]) => ({
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: `global-${key}`,
        annotations: {
          'helm.sh/hook': entry.definition?.on ? new RawToken(entry.definition?.on) : new RawToken('post-install, post-upgrade'),
          'helm.sh/hook-delete-policy': new RawToken('hook-succeeded, hook-failed')
        }
      },
      spec: {
        template: {
          spec: {
            restartPolicy: 'OnFailure',
            containers: [
              {
                name: `${key}-container`,
                image: this.dockerFileForJobGenerator({ ...entry, workspace: undefined } as Exclude<SchemaType['job'], undefined>[string], entry.workspace, key),
                env: Object.entries(resolveBindings(entry?.binding ?? {}, [], entry.variable !== undefined ? [entry, context] : context, true)).map(([key, resolved]) => {
                  if (resolved.static) {
                    return {
                      name: key,
                      value: buildVariable(resolved!, 'global')
                    };
                  }

                  if (resolved!.secret) {
                    return {
                      name: key,
                      valueFrom: {
                        secretKeyRef: {
                          name: resolved.is_global ? 'global' : 'global',
                          key
                        }
                      }
                    };
                  }

                  return {
                    name: key,
                    valueFrom: {
                      configMapKeyRef: {
                        name: resolved.is_global ? 'global' : 'global',
                        key
                      }
                    }
                  };
                })
              }
            ],
            imagePullSecrets: new ConditionalToken(
              `if eq .Values.global.registry.type "secret"`,
              new ArrayToken([
                new ObjectToken({
                  name: 'veto-pull-secret'
                })
              ])
            )
          }
        }
      }
    }));

    await this.writeObjectToFile(rootDirectory, ['helm', 'main', 'templates', 'job.yaml'], [...jobYAML]);
  }

  async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    const scopedContext = this.helmFileGeneratorProvider.contexts.get(workspace);
    const globalContext = this.helmFileGeneratorProvider.globalContext;

    if (!scopedContext?.is_service) {
      console.info(`Workspace: ${JSON.stringify(workspace.getName())} is not a service. No helm files will be generated for it.`);
      return;
    }

    await this.generateGlobalScope(this.helmFileGeneratorProvider.contexts, this.helmFileGeneratorProvider.globalContext, rootDirectory);

    const name = scopedContext.alias;

    const ChartYAML = {
      apiVersion: 'v2',
      type: 'application',
      name,
      version: this.version,
      dependencies: [] as any[]
    };

    Object.entries(scopedContext?.service ?? {})
      .sort(([kA], [kB]) => kA.localeCompare(kB))
      .forEach(([k, v]) => {
        if (v.is_local) {
          return;
        }

        ChartYAML.dependencies.push({
          name: v.definition.origin.name,
          version: v.definition.origin.version,
          repository: v.definition.origin.repository,
          alias: k
        });
      });

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'Chart.yaml'], [ChartYAML]);

    const valuesYAML: Record<string, any> = {};

    set(valuesYAML, 'global.registry.type', 'local');
    set(valuesYAML, 'global.host.domain', 'localhost');

    const allBindings = Object.entries(resolveBindings(scopedContext.binding ?? {}, scopedContext, globalContext));

    Object.values(scopedContext.job ?? {}).forEach((job) => {
      allBindings.push(...Object.entries(resolveBindings(job?.binding ?? {}, scopedContext, globalContext)));
    });

    allBindings.forEach(([key, value]) => {
      if (!value!.static && !value.is_global) {
        set(valuesYAML, value.referenced, buildVariable(value, name));
      }
    });

    Object.entries(scopedContext?.variable ?? {})
      .filter(([, variable]) => variable.external)
      .forEach(([key, value]) => {
        if (value.external) {
          set(valuesYAML, key, buildVariable(value, name));
          return;
        }
      });

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'values.yaml'], [valuesYAML]);

    const serviceYAMLInternal = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name
      },
      spec: {
        selector: {
          app: `${name}-depl`
        },
        type: 'ClusterIP',
        ports: Object.entries(scopedContext?.expose ?? {})
          .filter(([, exposed]) => exposed.type === 'internal')
          .map(([port]) => ({
            name: `${name}-${port}`,
            protocol: 'TCP',
            port: Number(port),
            targetPort: Number(port)
          }))
      }
    } as const;

    const serviceYAMLExternal = {
      apiVersion: 'v1',
      kind: 'Service',
      metadata: {
        name: `${name}-ext`
      },
      spec: {
        selector: {
          app: `${name}-depl`
        },
        type: 'ClusterIP',
        ports: Object.entries(scopedContext?.expose ?? {})
          .filter(([, exposed]) => exposed.type === 'load-balancer')
          .map(([port]) => ({
            name: `${name}-${port}`,
            protocol: 'TCP',
            port: Number(port),
            targetPort: Number(port)
          }))
      }
    };

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'templates', 'service.yaml'], [serviceYAMLInternal.spec.ports.length > 0 ? serviceYAMLInternal : undefined, serviceYAMLExternal.spec.ports.length > 0 ? serviceYAMLExternal : undefined].filter(Boolean));

    const ingressYAMLStripPrefixes = Object.entries(scopedContext?.expose ?? {})
      .filter(([, exposed]) => exposed.type === 'load-balancer')
      .map(([port, lbType]) => ({
        apiVersion: 'traefik.io/v1alpha1',
        kind: 'Middleware',
        metadata: {
          name: `${name}-${port}-strip-prefix`
        },
        spec: {
          stripPrefix: {
            prefixes: [lbType.path]
          }
        }
      }));

    const ingressYAMLRoutes = {
      apiVersion: 'traefik.containo.us/v1alpha1',
      kind: 'IngressRoute',
      metadata: {
        name: `${name}--veto-ingress`
      },
      spec: {
        entryPoints: ['websecure'],
        routes: Object.entries(scopedContext?.expose ?? {})
          .filter(([, exposed]) => exposed.type === 'load-balancer')
          .map(([port, exposed]) => ({
            kind: 'Rule',
            match: new RawToken(`Host(\`${exposed.domainPrefix}{{.Values.global.host.domain}}\`) && PathPrefix(\`${exposed.path}\`)`),
            services: [
              {
                name: `${name}-ext`,
                port: Number(port),
                passHostHeader: true
              }
            ],
            middlewares: [
              {
                name: `${name}-${port}-strip-prefix`
              }
            ]
          }))
      }
    };

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'templates', 'ingress.yaml'], [ingressYAMLStripPrefixes, Object.keys(ingressYAMLRoutes.spec.routes).length > 0 ? ingressYAMLRoutes : undefined].filter(Boolean).flat());

    const deploymentYAML = {
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      metadata: {
        name: `${name}-depl`
      },
      spec: {
        replicas: scopedContext.scaling?.minPods ?? 1,
        selector: {
          matchLabels: {
            app: `${name}-depl`
          }
        },
        strategy:
          scopedContext.update_strategy?.type === 'RollingUpdate'
            ? {
                type: 'RollingUpdate',
                rollingUpdate: {
                  maxSurge: scopedContext.update_strategy?.maxSurge,
                  maxUnavailable: scopedContext.update_strategy?.maxUnavailable
                }
              }
            : undefined,
        template: {
          metadata: {
            labels: {
              app: `${name}-depl`
            }
          },
          spec: {
            containers: [
              {
                name: `${name}-${getHash(this.dockerFileGenerator(workspace))}-depl`,
                image: this.dockerFileGenerator(workspace),
                ports: Object.keys(scopedContext?.expose ?? {}).map((port) => ({
                  containerPort: Number(port)
                })),
                resources: !scopedContext.system_usage
                  ? undefined
                  : {
                      limits: !scopedContext.system_usage.limit
                        ? undefined
                        : {
                            cpu: scopedContext.system_usage.limit.cpu,
                            memory: scopedContext.system_usage.limit.memory
                          },
                      requests: !scopedContext.system_usage.requested
                        ? undefined
                        : {
                            cpu: scopedContext.system_usage.requested.cpu,
                            memory: scopedContext.system_usage.requested.memory
                          }
                    },
                env: Object.entries(resolveBindings(scopedContext?.binding ?? {}, scopedContext, globalContext)).map(([key, resolved]) => {
                  const resulting: any = {
                    name: key
                  };

                  if (resolved!.secret) {
                    resulting.valueFrom = {
                      secretKeyRef: {
                        name: resolved.is_global ? 'global' : name,
                        key
                      }
                    };
                  } else if (!resolved!.static) {
                    resulting.valueFrom = {
                      configMapKeyRef: {
                        name: resolved.is_global ? 'global' : name,
                        key
                      }
                    };
                  } else {
                    resulting.value = resolved!.default;
                  }

                  return resulting;
                })
              }
            ],
            imagePullSecrets: new ConditionalToken(
              `if eq .Values.global.registry.type "secret"`,
              new ArrayToken([
                new ObjectToken({
                  name: 'veto-pull-secret'
                })
              ])
            )
          }
        }
      }
    };

    if (scopedContext.update_strategy?.type !== 'RollingUpdate') {
      delete deploymentYAML.spec.strategy;
    }
    deploymentYAML.spec.template.spec.containers.forEach((c) => !c.resources && delete c.resources);

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'templates', 'deployment.yaml'], [deploymentYAML].flat());

    const secretsYAML = {
      apiVersion: 'v1',
      kind: 'Secret',
      metadata: {
        name
      },
      type: 'Opaque',
      stringData: Object.fromEntries(
        allBindings
          .filter(([, value]) => !value.static && value.secret && !value.is_global)
          .map(([key, value]) => {
            return [key, new RawToken(`{{.Values${value.is_global ? 'global.' : ''}${HelmGenerator.buildVariablePath(value.referenced, '.')} | quote }}`)];
          })
      )
    };

    if (Object.keys(secretsYAML.stringData).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'templates', 'secret.yaml'], [secretsYAML]);
    }

    const configMapYAML = {
      apiVersion: 'v1',
      kind: 'ConfigMap',
      metadata: {
        name
      },
      data: Object.fromEntries(
        allBindings
          .filter(([, value]) => !value.static && !value.secret && !value.is_global)
          .map(([key, value]) => {
            return [key, new RawToken(`"{{.Values.${value.is_global ? 'global.' : ''}${HelmGenerator.buildVariablePath(value.referenced, '.')} }}"`)];
          })
      )
    };

    if (Object.keys(configMapYAML.data).length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'templates', 'configmap.yaml'], [configMapYAML]);
    }

    const jobYAML = Object.entries(scopedContext?.job ?? {}).map(([key, entry]) => ({
      apiVersion: 'batch/v1',
      kind: 'Job',
      metadata: {
        name: `${name}-${key}`,
        annotations: {
          'helm.sh/hook': entry.definition?.on ? new RawToken(entry.definition?.on) : new RawToken('post-install, post-upgrade'),
          'helm.sh/hook-delete-policy': new RawToken('hook-succeeded, hook-failed')
        }
      },
      spec: {
        template: {
          spec: {
            restartPolicy: 'OnFailure',
            containers: [
              {
                name: `${key}-container`,
                image: this.dockerFileForJobGenerator({ ...entry, workspace: undefined } as Exclude<SchemaType['job'], undefined>[string], entry.workspace, key),
                env: Object.entries(resolveBindings(entry?.binding ?? {}, entry.variable ? [scopedContext, entry] : scopedContext, globalContext)).map(([key, resolved]) => {
                  if (resolved.static) {
                    return {
                      name: key,
                      value: buildVariable(resolved!, name)
                    };
                  }

                  if (resolved!.secret) {
                    return {
                      name: key,
                      valueFrom: {
                        secretKeyRef: {
                          name: resolved.is_global ? 'global' : name,
                          key
                        }
                      }
                    };
                  }

                  return {
                    name: key,
                    valueFrom: {
                      configMapKeyRef: {
                        name: resolved.is_global ? 'global' : name,
                        key
                      }
                    }
                  };
                })
              }
            ],
            imagePullSecrets: new ConditionalToken(
              `if eq .Values.global.registry.type "secret"`,
              new ArrayToken([
                new ObjectToken({
                  name: 'veto-pull-secret'
                })
              ])
            )
          }
        }
      }
    }));

    await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'templates', 'job.yaml'], [...jobYAML]);

    const configuration = Object.entries(scopedContext.scaling?.configuration ?? {});

    const podAutoScaling = {
      apiVersion: 'autoscaling/v2',
      kind: 'HorizontalPodAutoscaler',
      metadata: {
        name: `${name}-scaler`
      },
      spec: {
        scaleTargetRef: {
          apiVersion: 'apps/v1',
          kind: 'Deployment',
          name: `${name}-${getHash(this.dockerFileGenerator(workspace))}-depl`
        },
        minReplicas: scopedContext.scaling?.minPods ?? 1,
        maxReplicas: scopedContext.scaling?.maxPods,
        metrics: configuration.map(([key, value]) => ({
          type: 'Resource',
          resource: {
            name: key,
            target: {
              type: value.type,
              averageValue: value.average
            }
          }
        }))
      }
    };

    if (configuration.length > 0) {
      await this.writeObjectToFile(rootDirectory, ['helm', 'subcharts', workspace.getName().replaceAll('/', '__'), 'templates', 'pod-autoscaling.yaml'], [podAutoScaling]);
    }
  }

  async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
    // NO-OP
  }
}

import type { IWorkspace } from '@veto-party/baum__core';
import { BaseInstaller, BindingFeature, ExposeFeature, type IFeature, JobFeature, type MergeFeatures, NetworkFeature, ScalingFeature, ServiceFeature, SystemUsageFeature, UpdateStrategy, VariableFeature } from '@veto-party/baum__steps__installer__features';
import type { MergeDeepForToDefinitionStructureWithTupleMerge } from '@veto-party/baum__steps__installer__features/src/abstract/types/MergeDeepForToDefinitionStructureWithTupleMerge.js';
import { get, isEqual, merge, uniq } from 'lodash-es';
import type { INameProvider } from '../../interface/INameProvider.js';
import type { InferStructure, ProjectMetadata } from '../../interface/IRenderer.js';
import type { IFeatureManager, IFilter, IRendererFeatureManager, IRendererManager, InferNewRenderer, InferToFeatureManager } from '../../interface/IRendererManager.js';
import { getDeepKeys } from '../../utility/getDeepKeys.js';
import { ARendererManager } from '../ARendererManager.js';
import { RenderFeatureManager } from '../RenderFeatureManager.js';
import type { ConfigMappingWithStore, IConfigMapRenderer, IConfigMapStructure } from './interface/IConfigMapRenderer.js';
import type { IDeploymentRenderer, ScalingStorage, SystemUsageStorage, UpdateStorage } from './interface/IDeploymentRenderer.js';
import type { ExposeStructure, IExposeRenderer } from './interface/IExposeRenderer.js';
import type { IImageGenerator } from './interface/IImageGenerator.js';
import type { IJobRenderer, JobStructure } from './interface/IJobRenderer.js';
import type { INetworkRenderer, NetworkStorage } from './interface/INetworkRenderer.js';
import type { ISecretRenderer } from './interface/ISecretRenderer.js';
import type { IWritable } from './interface/IWritable.js';
import { ValuesRenderer } from './implementation/ValuesRenderer.js';
import { I3rdPartyRenderer, ThirdPartyRendererStorage } from './interface/I3rdPartyRenderer.js';
import { ChartRenderer } from './implementation/ChartRenderer.js';

type VariableStorageFeature = typeof BaseInstaller.makeInstance extends () => IFeature<infer A0, infer A1, infer A2>
  ? typeof VariableFeature.makeInstance extends () => IFeature<infer B0, infer B1, infer B2>
    ? MergeFeatures<IFeature<A0, A1, A2>, 'properties', IFeature<B0, B1, B2>> extends infer Feature
      ? Feature
      : never
    : never
  : never;

type BindingStorageFeature = typeof BaseInstaller.makeInstance extends () => IFeature<infer A0, infer A1, infer A2> ? (MergeFeatures<IFeature<A0, A1, A2>, 'properties', BindingFeature> extends infer Feature ? Feature : never) : never;

const NOT_FOUND = Symbol('NOT_FOUND');

export class HelmRenderer<T extends IFeature<any, any, any>> extends ARendererManager<T> {
  /**
   * These are the bindings for the given workspace.
   *
   * A binding is a key that maps to a key of a property.
   * It is done this way so that a variable can be refenced multiple times (from multiple bindings).
   */
  public bindingStorage = new Map<IWorkspace, Map<string, string>>();

  /**
   * Properties are a (workspace|undefined) mapping, where undefined represents the global scope.
   * Properties are the values (environment + secret environment), which in turn are consumed by the bindings.
   */
  public propertyStorage = new Map<IWorkspace | undefined, IConfigMapStructure>();

  /**
   * This is the metadata about scaling the containers.
   *
   * It contains info about how mutch and when to scale the container.(s)
   */
  public scalingStorage = new Map<IWorkspace, ScalingStorage>();

  /**
   * This is the metadata about updating the containers.
   *
   * It contains the info on how to update the container.(s)
   */
  public updateStorage = new Map<IWorkspace, UpdateStorage>();

  /**
   * A structure that is an array of networks, which contains the info on how the services are connected.
   */
  public networkStorage = new Map<IWorkspace, NetworkStorage>();

  /**
   * A structure that is an object which contains system limits and requests, which in turn tell kubernetes on how to limit / allocate the ressources for the container(s) / pod(s).
   */
  public systemUsageStorage = new Map<IWorkspace, SystemUsageStorage>();

  /**
   * This is the service mapping it contains a mapping for external helm charts.
   */
  public serviceStorage = new Map<IWorkspace | undefined, Map<string | number, ThirdPartyRendererStorage>>();

  /**
   * Jobs are a (workspace|undefined) mapping, where undefined represents the global scope.
   * Jobs are the complete jobs, with bindings and properties.
   * Bindings and properties are stored twice to make it more easy to work with them.
   *
   * This is called jobs since every (workspace|undefined) can have multiple jobs which are accessed by name.
   */
  public jobStorage = new Map<IWorkspace | undefined, Map<string, JobStructure>>();

  /**
   * Job bindings are a (workspace|undefined)(string) which in turn are used to map the scoped or global variables(evironment + secrets) to a specified job.
   * An entry is not necessarrly presnet when a job storage is present, if this is not present, there are no bindings to a job.
   */
  public jobBindingStorage = new Map<IWorkspace | undefined, Map<string, Map<string, string>>>();

  /**
   * Job properties are a (workspace|undefined)(string) which in turn can be used multiple times.
   * These dependencies can also be accessed by the bindingStorage property.
   *
   * The job somejob is defined and contains a variable called foo.
   * Then you access it using somejob.variable.a.
   */
  public jobPropertyStorage = new Map<IWorkspace | undefined, Map<string, IConfigMapStructure>>();

  /**
   * A structure that is an array of networks, which contains the info on how the jobs are connected to services.
   */
  public jobNetworkStrorage = new Map<IWorkspace | undefined, Map<string, NetworkFeature extends IFeature<any, any, infer Structure> ? Structure : never>>();

  /**
   * A structure that is an object which contains system limits and requests, which in turn tell kubernetes on how to limit / allocate the ressources for the container(s) / pod(s).
   */
  public jobSystemUsageStorage = new Map<IWorkspace | undefined, Map<string, SystemUsageFeature extends IFeature<any, any, infer Structure> ? Structure : never>>();

  /**
   * This is the storage for all the bindings that come from the global storage.
   * It is later used to build the global config map and the global config secret.
   */
  public globalBindingStorage = new Map<string | number, ConfigMappingWithStore>();

  /**
   * Writers are the temporary stored version a yaml file.
   * It is generated successfully, but not yet written to the file system.
   *
   * A writer is usually returned by a renderer.
   * It might contain usefull information for additional steps.
   */
  public writers: IWritable[] = [];

  protected constructor(
    feature: T,
    private secretRenderer: ISecretRenderer,
    private configMapRenderer: IConfigMapRenderer,
    private nameProvider: INameProvider,
    private jobRenderer: IJobRenderer,
    private imageNameGenerator: IImageGenerator,
    private thirdPartyRenderer: I3rdPartyRenderer,
  ) {
    super(feature);
  }

  public static mergeElements<A extends Map<any, any>, B extends Map<any, any>>(a: A, b: B): A extends Map<infer AKey, infer AValue> ? (B extends Map<infer BKey, infer BValue> ? Map<AKey | BKey, AValue | BValue> : never) : never {
    const aSet = new Set(a.keys());
    const bSet = new Set(b.keys());

    const newMap = new Map<any, any>(a.entries());

    aSet.difference(bSet).forEach((el) => {
      if (isEqual(a.get(el), b.get(el))) {
        return;
      }

      console.warn(`UNSAFE: ${el} will be overridden!`);
    });

    bSet.forEach((el) => {
      newMap.set(el, b.get(el)!);
    });

    return newMap as any;
  }

  public static warnAboutDifferences<A extends object, B extends object>(a: A, b: B): MergeDeepForToDefinitionStructureWithTupleMerge<A, B> {
    const keysToCheck = uniq([getDeepKeys(a), getDeepKeys(b)].flat());
    for (const key of keysToCheck) {
      const aValue = get(a, key, NOT_FOUND);
      const bValue = get(b, key, NOT_FOUND);
      if (aValue === NOT_FOUND || bValue === NOT_FOUND || isEqual(aValue, bValue)) {
        continue;
      }

      console.warn(`${key} is overridden`);
    }

    return merge(a, b) as any;
  }

  public static ensurePropertyValueGenerator<SomeMap extends Map<any, any>>(map: SomeMap, generator: SomeMap extends Map<infer Key, infer Value> ? (workspace: Key) => Exclude<Value, undefined> : never) {
    return (key: SomeMap extends Map<infer U, any> ? U : never): SomeMap extends Map<any, infer Value> ? Exclude<Value, undefined> : never => {
      if (!map.has(key)) {
        map.set(key, generator(key));
      }
      return map.get(key)!;
    };
  }

  private static buildVariableStorage<Key>(givenMap: Map<Key | undefined, IConfigMapStructure>, resolver: (...parameters: Parameters<Parameters<IFeatureManager<VariableStorageFeature>['addRenderer']>[0]>) => Key) {
    return (feature: IFeatureManager<VariableStorageFeature>): IFeatureManager<VariableStorageFeature> => {
      const ensurePropertyStorage = HelmRenderer.ensurePropertyValueGenerator(givenMap, () => new Map());
      return feature.addRenderer((metadata, data) => {
        const key = resolver(metadata, data);
        let elem = ensurePropertyStorage(key);
        let globalElem = ensurePropertyStorage(undefined);

        for (const dataset of data) {
          const allVars = Object.entries(dataset.variable ?? ({} as Exclude<typeof dataset.variable, undefined>));
          const [globalVars, otherVars] = allVars.reduce(
            ([globalVars, otherVars], entry) => {
              const [, value] = entry;
              const scope = value.type === 'global' ? globalVars : otherVars;
              scope.push(entry);
              return [globalVars, otherVars];
            },
            [[] as typeof allVars, [] as typeof allVars] as const
          );

          elem = HelmRenderer.mergeElements(elem, new Map(globalVars));
          globalElem = HelmRenderer.mergeElements(globalElem, new Map(otherVars));
        }

        givenMap.set(key, elem);
        givenMap.set(undefined, globalElem);
      });
    };
  }

  private static buildBindingStorage<Key>(givenMap: Map<Key | undefined, Map<string, string>>, resolver: (...parameters: Parameters<Parameters<IFeatureManager<BindingStorageFeature>['addRenderer']>[0]>) => Key) {
    return (feature: IFeatureManager<BindingStorageFeature>): IFeatureManager<BindingStorageFeature> => {
      const ensureBindingStorage = HelmRenderer.ensurePropertyValueGenerator(givenMap, () => new Map());
      return feature.addRenderer((metadata, data) => {
        const key = resolver(metadata, data);
        let binding = ensureBindingStorage(key);
        for (const dataset of data) {
          binding = HelmRenderer.mergeElements(binding, new Map(Object.entries(dataset.binding ?? {})));
        }
        givenMap.set(key, binding);
      });
    };
  }

  private static reduceDistances<Value extends object, Key extends keyof Value>(value: Value[], key: Key): Value[Key] | undefined {
    return value.reduce<Value[Key] | undefined>((a, b) => (a !== undefined ? HelmRenderer.warnAboutDifferences(a as any, b?.[key] !== undefined ? (b[key] as any) : a) : b), value.pop()?.[key]);
  }

  public static buildBaseInstance(secretRenderer: ISecretRenderer, configMapRenderer: IConfigMapRenderer, nameProvider: INameProvider, jobRenderer: IJobRenderer, imageGenerator: IImageGenerator, thirdPartyRenderer: I3rdPartyRenderer) {
    return (
      new HelmRenderer(BaseInstaller.makeInstance(), secretRenderer, configMapRenderer, nameProvider, jobRenderer, imageGenerator, thirdPartyRenderer)
        .ensureFeature('properties' as const, VariableFeature.makeInstance(), function (feature) {
          return HelmRenderer.buildVariableStorage(this.propertyStorage, (metadata) => metadata.project.workspace)(feature);
        })
        .ensureFeature('properties' as const, new BindingFeature(), function (feature) {
          return HelmRenderer.buildBindingStorage(this.bindingStorage, (metadata) => metadata.project.workspace)(feature);
        })
        .ensureFeature('properties' as const, new NetworkFeature(), function (feature) {
          return feature.addRenderer((metadata, data) => {
            const network = HelmRenderer.reduceDistances(data, 'network' as const);
            if (network) {
              this.networkStorage.set(metadata.project.workspace, network);
            }
          });
        })
        // .ensureFeature('properties' as const, new VolumeFeature(), function (feature) {
        //     return feature;
        // })
        .ensureFeature('properties' as const, new SystemUsageFeature(), function (feature) {
          return feature.addRenderer((metadata, data) => {
            const systemUsage = HelmRenderer.reduceDistances(data, 'system_usage' as const);
            if (systemUsage) {
              this.systemUsageStorage.set(metadata.project.workspace, systemUsage);
            }
          });
        })
    );
  }

  public static makeInstance(
    configMapRenderer: IConfigMapRenderer, 
    secretRenderer: ISecretRenderer, 
    deploymentRenderer: IDeploymentRenderer, 
    exposeRenderer: IExposeRenderer, 
    networkRenderer: INetworkRenderer, jobRenderer: IJobRenderer, nameProvider: INameProvider, imageNameGenerator: IImageGenerator, thirdPartyRenderer: I3rdPartyRenderer) {
    const exposeStorage = new Map<IWorkspace, Map<string, ExposeStructure>>();
    const ensureExposeStorage = HelmRenderer.ensurePropertyValueGenerator(exposeStorage, () => new Map());

    const baseRenderer = HelmRenderer.buildBaseInstance(secretRenderer, configMapRenderer, nameProvider, jobRenderer, imageNameGenerator, thirdPartyRenderer);

    const jobStructure = BaseInstaller.makeInstance()
      .appendFeature(`patternProperties["^[a-zA-Z0-9]+$"]` as const, baseRenderer.getGroup())
      .appendFeature(`patternProperties["^[a-zA-Z0-9]+$"]` as const, new JobFeature());

    baseRenderer
      .ensureFeature('properties.job' as const, jobStructure, function (feature) {
        const ensureJobBindings = HelmRenderer.ensurePropertyValueGenerator(this.jobBindingStorage, () => new Map());
        const ensureJobProperties = HelmRenderer.ensurePropertyValueGenerator(this.jobPropertyStorage, () => new Map());
        const ensureJob = HelmRenderer.ensurePropertyValueGenerator(this.jobStorage, () => new Map());

        return feature.addRenderer(async (metadata, structure) => {
          const filteredStructure = new Map<string | undefined, Record<string | number, Exclude<(typeof structure)[number]['job'], undefined>[string][]>>();
          const ensureFilteredStruct = HelmRenderer.ensurePropertyValueGenerator(filteredStructure, () => ({}));

          structure
            .flatMap((obj) => Object.entries(obj.job ?? {}), 1)
            .forEach(([key, value]) => {
              const key2 = value.type === 'global' ? undefined : key;
              ensureFilteredStruct(key2)[key] ??= [];
              ensureFilteredStruct(key2)[key].push(value);
            });

          for (const [key, entries] of filteredStructure.entries()) {
            const workspaceKey = key === undefined ? undefined : metadata.project.workspace;
            for (const [jobKey, structure] of Object.entries(entries)) {
              ensureJob(key === undefined ? undefined : metadata.project.workspace).set(jobKey, merge({}, ...structure));

              const systemUsage = HelmRenderer.reduceDistances(structure, 'system_usage');
              if (systemUsage) {
                this.jobSystemUsageStorage.set(workspaceKey, HelmRenderer.mergeElements(this.jobSystemUsageStorage.get(workspaceKey) ?? new Map(), new Map([[jobKey, systemUsage]])));
              }

              const network = HelmRenderer.reduceDistances(structure, 'network');
              if (network) {
                this.jobNetworkStrorage.set(workspaceKey, HelmRenderer.mergeElements(this.jobNetworkStrorage.get(workspaceKey) ?? new Map(), new Map([[jobKey, network]])));
              }

              const innerRenderer = new RenderFeatureManager<MergeFeatures<VariableStorageFeature, undefined, BindingStorageFeature>>();
              HelmRenderer.buildVariableStorage(ensureJobProperties(workspaceKey), () => jobKey)(innerRenderer);
              HelmRenderer.buildBindingStorage(ensureJobBindings(workspaceKey), () => jobKey)(innerRenderer);
              await innerRenderer.renderFeature(metadata, structure);
            }
          }
        });
      })
      .ensureFeature('properties' as const, new ExposeFeature(), (feature) => {
        return feature.addRenderer((metadata, data) => {
          let storage = ensureExposeStorage(metadata.project.workspace);
          for (const element of data) {
            storage = HelmRenderer.mergeElements(storage, new Map(Object.entries(element.expose ?? {})));
          }

          exposeStorage.set(metadata.project.workspace, storage);
        });
      })
      .ensureFeature('properties' as const, new ScalingFeature(), function (feature) {
        return feature.addRenderer((metadata, data) => {
          const structure = HelmRenderer.reduceDistances(data, 'scaling');

          if (structure) {
            this.scalingStorage.set(metadata.project.workspace, structure);
          }
        });
      })
      .ensureFeature('properties' as const, new UpdateStrategy(), function (feature) {
        return feature.addRenderer((metadata, data) => {
          const structure = HelmRenderer.reduceDistances(data, 'update_strategy');

          if (structure) {
            this.updateStorage.set(metadata.project.workspace, structure);
          }
        });
      })
      .ensureFeature('properties' as const, ServiceFeature.makeInstance(), function (feature) {
        const ensureService = HelmRenderer.ensurePropertyValueGenerator(this.serviceStorage, () => new Map());
        return feature.addRenderer((metadata, data) => {
          for (const dataset of data) {
            const [globals, workspaced] = Object.entries(dataset.service ?? {}).reduce(
              (prev, [key, value]) => {
                prev[value.type === 'global' ? 0 : 1].push([key, value]);
                return prev;
              },
              [[] as [string, Exclude<typeof dataset.service, undefined>[string]][], [] as [string, Exclude<typeof dataset.service, undefined>[string]][]]
            );

            this.serviceStorage.set(metadata.project.workspace, HelmRenderer.mergeElements(ensureService(metadata.project.workspace), new Map(workspaced)));
            this.serviceStorage.set(undefined, HelmRenderer.mergeElements(ensureService(undefined), new Map(globals)));
          }
        });
      });

    return baseRenderer.addRenderer(async function (metadata) {

      this.writers.push(new ChartRenderer().render(metadata.project.workspace, this.serviceStorage.get(metadata.project.workspace) ?? new Map()));

      /**
       * Config map is values.yaml
       */
      let configMap = new Map<string, any>();

      await (async () => {
        if (this.serviceStorage.has(metadata.project.workspace)) {
          const thirdPartyResult = await thirdPartyRenderer.render(metadata.project.workspace, this.serviceStorage.get(metadata.project.workspace)!);
          configMap = HelmRenderer.mergeElements(configMap, thirdPartyResult.getConfigMap());
          this.writers.push(thirdPartyResult);
        }
      })();

      await (async () => {
        const configResult = await configMapRenderer.render(metadata.project.workspace, this.buildPropertyMap(this.propertyStorage, metadata.project.workspace), this.bindingStorage.get(metadata.project.workspace));
        this.writers.push(configResult);
        const secretResult = await secretRenderer.render(metadata.project.workspace, this.propertyStorage, this.bindingStorage.get(metadata.project.workspace));
        this.writers.push(secretResult);
        const portsResult = await exposeRenderer.render(metadata.project.workspace, exposeStorage.get(metadata.project.workspace));
        this.writers.push(portsResult);

        configMap = HelmRenderer.mergeElements(configMap, configResult.getValues());
        configMap = HelmRenderer.mergeElements(configMap, secretResult.getValues());

        const itemsMap = HelmRenderer.mergeElements(await configResult.getResolvedWorkspaceVars(), await secretResult.getResolvedWorkspaceSecrets());

        itemsMap.entries().forEach(([key, entry]) => {
          if ('store' in entry && entry.store && entry.global) {
            this.globalBindingStorage.set(key, entry);
          }
        });

        const deploymentResult = await deploymentRenderer.render(metadata.project.workspace, itemsMap, portsResult.getPorts(), this.scalingStorage.get(metadata.project.workspace), this.updateStorage.get(metadata.project.workspace), this.systemUsageStorage.get(metadata.project.workspace), imageNameGenerator);
        this.writers.push(deploymentResult);
      })();

      await (async () => {
        for (const key in this.jobStorage.get(metadata.project.workspace) ?? {}) {
          const propertyStorage = new Map([[metadata.project.workspace as IWorkspace | undefined, this.jobPropertyStorage.get(metadata.project.workspace)?.get(key) ?? new Map()]]);
          const bindingStorage = this.jobBindingStorage.get(metadata.project.workspace)?.get(key);

          if (!propertyStorage || !bindingStorage) {
            continue;
          }

          const configResult = await configMapRenderer.render(metadata.project.workspace, this.buildPropertyMap(propertyStorage, metadata.project.workspace), bindingStorage, key);
          this.writers.push(configResult);
          const secretResult = await secretRenderer.render(metadata.project.workspace, propertyStorage, bindingStorage, key);
          this.writers.push(secretResult);

          configMap = HelmRenderer.mergeElements(configMap, configResult.getValues());
          configMap = HelmRenderer.mergeElements(configMap, secretResult.getValues());

          const itemsMap = HelmRenderer.mergeElements(await configResult.getResolvedWorkspaceVars(), await secretResult.getResolvedWorkspaceSecrets());

          itemsMap.entries().forEach(([key, entry]) => {
            if ('store' in entry && entry.store && entry.global) {
              this.globalBindingStorage.set(key, entry);
            }
          });

          const jobResult = await jobRenderer.render(
            metadata.project.workspace, 
            key, 
            this.jobStorage.get(metadata.project.workspace)!.get(key)!, 
            HelmRenderer.mergeElements(secretResult.getResolvedWorkspaceSecrets(), configResult.getResolvedWorkspaceVars()),
            this.jobSystemUsageStorage.get(metadata.project.workspace)?.get(key),
            imageNameGenerator
          );
          this.writers.push(jobResult);
        }
      })();

      this.writers.push(await (new ValuesRenderer()).render(metadata.project.workspace, configMap));
    });
  }

  public async render(projectMetadata: Omit<ProjectMetadata, 'workspace'>, structure: Map<IWorkspace, InferStructure<T>[]>): Promise<void> {
    await super.render(projectMetadata, structure);

    this.writers.push(new ChartRenderer().renderGlobal(Array.from(this.serviceStorage.keys()).filter((value): value is IWorkspace => value !== undefined), this.serviceStorage.get(undefined) ?? new Map()));

    let configMap = new Map<string, any>();

    await (async () => {
      const binding = new Map(
        this.globalBindingStorage
          .entries()
          .map(([key, value]) => [key, typeof value.store === 'string' ? value.key : undefined] as const)
          .filter((entry): entry is readonly [string, string] => entry[1] !== undefined)
      );

      const allValues = this.jobPropertyStorage.get(undefined)?.values?.()?.toArray?.();
      const values = allValues?.reduce?.((a, b) => HelmRenderer.mergeElements(a, b), allValues?.shift?.()!);
      const propertyStorage = values ? new Map([[undefined as IWorkspace | undefined, HelmRenderer.mergeElements(this.propertyStorage.get(undefined)!, values)]] as const) : this.propertyStorage;

      const secretResult = await this.secretRenderer.render(undefined, propertyStorage, binding);
      this.writers.push(secretResult);

      const configResult = await this.configMapRenderer.render(undefined, this.buildPropertyMap(propertyStorage, undefined), binding);
      this.writers.push(configResult);

      configMap = HelmRenderer.mergeElements(configMap, configResult.getValues());
      configMap = HelmRenderer.mergeElements(configMap, secretResult.getValues());
    })();

    await (async () => {
      for (const key in this.jobStorage.get(undefined) ?? {}) {
        const propertyStorage = new Map([[undefined as IWorkspace | undefined, this.jobPropertyStorage.get(undefined)?.get(key) ?? new Map()]]);
        const bindingStorage = this.jobBindingStorage.get(undefined)?.get(key);

        if (!propertyStorage || !bindingStorage) {
          continue;
        }

        const configResult = await this.configMapRenderer.render(undefined, this.buildPropertyMap(propertyStorage, undefined), bindingStorage, key);
        this.writers.push(configResult);
        const secretResult = await this.secretRenderer.render(undefined, propertyStorage, bindingStorage, key);
        this.writers.push(secretResult);

        configMap = HelmRenderer.mergeElements(configMap, configResult.getValues());
        configMap = HelmRenderer.mergeElements(configMap, secretResult.getValues());

        const itemsMap = HelmRenderer.mergeElements(await configResult.getResolvedWorkspaceVars(), await secretResult.getResolvedWorkspaceSecrets());

        itemsMap.entries().forEach(([key, entry]) => {
          if ('store' in entry && entry.store && entry.global) {
            this.globalBindingStorage.set(key, entry);
          }
        });

        const jobResult = await this.jobRenderer.render(
          undefined, 
          key, 
          this.jobStorage.get(undefined)!.get(key)!, 
          HelmRenderer.mergeElements(secretResult.getResolvedWorkspaceSecrets(), configResult.getResolvedWorkspaceVars()),
          this.jobSystemUsageStorage.get(undefined)?.get(key),
          this.imageNameGenerator
        );
        this.writers.push(jobResult);
      }
    })();

    await (async () => {
      if (this.serviceStorage.has(undefined)) {
        const thirdPartyResult = await this.thirdPartyRenderer.render(undefined, this.serviceStorage.get(undefined)!);
        configMap = HelmRenderer.mergeElements(configMap, thirdPartyResult.getConfigMap());
        this.writers.push(thirdPartyResult);
      }
    })();


    this.writers.push(await (new ValuesRenderer()).render(undefined, configMap));

    for (const writer of this.writers) {
      writer.write(projectMetadata.rootDirectory, this.nameProvider);
    }
  }

  public buildPropertyMap(properties: Map<IWorkspace | undefined, IConfigMapStructure>, givenWorkspace: IWorkspace | undefined): Map<IWorkspace | undefined, IConfigMapStructure> {
    const ensureJob = HelmRenderer.ensurePropertyValueGenerator(this.jobPropertyStorage, () => new Map());
    const ensureKey = HelmRenderer.ensurePropertyValueGenerator(properties, () => new Map());
    const ensureService = HelmRenderer.ensurePropertyValueGenerator(this.serviceStorage, () => new Map());

    const propertyMap = new Map([[givenWorkspace, ensureKey(givenWorkspace)]]);

    const mergeWithWorkspace = (workspace: IWorkspace | undefined) => {
      propertyMap.set(
        workspace,
        HelmRenderer.mergeElements(
          ensureKey(workspace),
          new Map(
            ensureJob(workspace)
              .entries()
              .flatMap(([baseKey, value]) => value.entries().map(([key, v]) => [`${baseKey}.${key}`, v] as const))
          )
        )
      );
      propertyMap.set(
        workspace,
        HelmRenderer.mergeElements(
          ensureKey(workspace),
          new Map(
            ensureService(workspace)
              .entries()
              .flatMap(([baseKey, value]) => Object.entries(value.properties ?? {}).map(([key, v]) => [`${baseKey}.${key}`, {
                type: 'scoped',
                default: v as any,
              }] as const))
          )
        )
      );
    }

    if (this.jobPropertyStorage.get(givenWorkspace)) {
      mergeWithWorkspace(givenWorkspace);
    }

    if (givenWorkspace) {
      mergeWithWorkspace(undefined);
    }

    return propertyMap;
  }

  ensureFeature<WritePath, Feature extends IFeature<any, any, any>>(
    writePath: WritePath,
    feature: Feature,
    creator: (this: HelmRenderer<MergeFeatures<T, WritePath, Feature>>, rendererGenerator: InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>) => InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>,
    filter?: IFilter<InferNewRenderer<WritePath, IFeatureManager<T>, Feature> extends IRendererManager<infer NewFeature> ? NewFeature : never>
  ): HelmRenderer<MergeFeatures<T, WritePath, Feature>> {
    return super.ensureFeature(writePath, feature, creator as any, filter) as any;
  }

  protected createSelf<U extends IFeature<any, any, any>>(feature: U): ARendererManager<U> {
    const helm = new HelmRenderer(feature, this.secretRenderer, this.configMapRenderer, this.nameProvider, this.jobRenderer, this.imageNameGenerator, this.thirdPartyRenderer);
    helm.featureCache = new Map(this.featureCache) as any;
    return helm as any;
  }

  protected createFeatureManager(_: T): IRendererFeatureManager<T> {
    return new RenderFeatureManager<T>();
  }
}

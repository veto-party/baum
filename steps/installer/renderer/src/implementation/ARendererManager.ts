import { createHash } from 'node:crypto';
import { CachedFN, type IWorkspace } from '@veto-party/baum__core';
import { GroupFeature, type IFeature, type MergeFeatures } from '@veto-party/baum__steps__installer__features';
import type { InferStructure, ProjectMetadata } from '../interface/IRenderer.js';
import type { IFeatureManager, IFilter, IRendererFeatureManager, IRendererManager, InferNewRenderer, InferToFeatureManager } from '../interface/IRendererManager.js';
import { RenderFeatureManager } from './RenderFeatureManager.js';
import { uniq} from 'lodash-es';

export abstract class ARendererManager<T extends IFeature<any, any, any>, Self> extends RenderFeatureManager<T, Self> implements IRendererManager<T, Self> {
  protected featureCache = new Map<
    ReturnType<typeof this.getCacheKey>,
    {
      renderer: IRendererFeatureManager<T, Self>;
      filter?: IFilter<T>;
    }
  >();

  protected features: ReturnType<typeof this.getCacheKey>[] = [];

  protected constructor(protected groupFeature: T) {
    super();
  }

  protected abstract createSelf<U extends IFeature<any, any, any>>(feature: U): ARendererManager<U, Self>;
  protected abstract createFeatureManager(feature: T): IRendererFeatureManager<T, Self>;

  @CachedFN(false)
  private getCacheKey(writePath: any, feature: IFeature<any, any, any>) {
    return { writePath, feature }; 
  }

  ensureFeature<WritePath, Feature extends IFeature<any, any, any>>(
    writePath: WritePath,
    feature: Feature,
    creator: (this: Self, rendererGenerator: InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T, Self>, Feature>>) => InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T, Self>, Feature>>,
    filter?: IFilter<InferNewRenderer<WritePath, IFeatureManager<T, Self>, Feature> extends IRendererManager<infer NewFeature, Self> ? NewFeature : never>
  ): ARendererManager<MergeFeatures<T, WritePath, Feature>, Self> {
    if (this.featureCache.has(this.getCacheKey(writePath, feature))) throw new Error('renderer for type is already given');

    if (!(this.groupFeature instanceof GroupFeature)) {
      throw new Error('Expected a group feature.');
    }

    const self = this.createSelf<MergeFeatures<T, WritePath, Feature>>(this.groupFeature.appendFeature(writePath, feature) as any);
    const renderer = creator.call(self as any, this.createFeatureManager(feature as any) as any);

    self.featureCache.set(this.getCacheKey(writePath, feature), { renderer, filter } as any);
    self.features.push(this.getCacheKey(writePath, feature));
    return self as any;
  }

  getGroup(): T {
    return this.groupFeature;
  }

  static resolveFilter<T extends IFeature<any, any, any>>(filter: IFilter<T>) {
    if (typeof filter === 'function') return filter;
    return filter.filter;
  }

  async render(projectMetadata: Omit<ProjectMetadata, 'workspace'>, structure: Map<IWorkspace, InferStructure<T>[]>) {
    for (const [workspace, givenStructure] of structure.entries()) {
      for (const key of uniq(this.features)) {
        const { renderer, filter } = this.featureCache.get(key)!;
        const metadata = {
          project: {
            ...projectMetadata,
            workspace
          }
        };

        if (filter && !ARendererManager.resolveFilter(filter)(givenStructure)) {
          return;
        }

        await renderer.renderFeature(metadata, [...givenStructure], this);
      }
    }

    for (const [workspace, givenStructure] of structure.entries()) {
      for (const key of uniq(this.features)) {
        const { renderer, filter } = this.featureCache.get(key)!;
        const metadata = {
          project: {
            ...projectMetadata,
            workspace
          }
        };

        if (filter && !ARendererManager.resolveFilter(filter)(givenStructure)) {
          return;
        }

        await this.renderFeature(metadata, [...givenStructure], this);
      }
    }
  }
}

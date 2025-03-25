import { createHash } from 'node:crypto';
import type { IWorkspace } from '@veto-party/baum__core';
import { GroupFeature, type IFeature, type MergeFeatures } from '@veto-party/baum__steps__installer__features';
import type { InferStructure, ProjectMetadata } from '../interface/IRenderer.js';
import type { IFeatureManager, IFilter, IRendererFeatureManager, IRendererManager, InferNewRenderer, InferToFeatureManager } from '../interface/IRendererManager.js';
import { RenderFeatureManager } from './RenderFeatureManager.js';

export abstract class ARendererManager<T extends IFeature<any, any, any>> extends RenderFeatureManager<T> implements IRendererManager<T> {
  protected featureCache = new Map<
    string,
    {
      renderer: IRendererFeatureManager<T>;
      filter?: IFilter<T>;
    }
  >();

  protected constructor(protected groupFeature: T) {
    super();
  }

  // Create a stable hash from the filter function
  private static hashFilter(filter: <U extends InferStructure<any>>(obj: U[]) => boolean): string {
    const serializedFilter = filter.toString(); // Convert filter function to string
    return createHash('sha256').update(serializedFilter).digest('hex'); // Generate a hash of the function's string
  }

  private static createFilterKey(filter?: IFilter<any>): string {
    if (filter === undefined) return 'no_filter';
    if (typeof filter === 'function') return `func_${ARendererManager.hashFilter(filter)}`;
    return `str_${filter.key}`;
  }

  // Create a stable key based on feature and filter
  private static createFeatureKey<T extends IFeature<any, any, any>>(feature: T, filter?: IFilter<T>, custom?: string): string {
    return [Object.getPrototypeOf(feature).name, ARendererManager.createFilterKey(filter), custom].filter(Boolean).join('_');
  }

  protected abstract createSelf<U extends IFeature<any, any, any>>(feature: U): ARendererManager<U>;
  protected abstract createFeatureManager(feature: T): IRendererFeatureManager<T>;

  ensureFeature<WritePath, Feature extends IFeature<any, any, any>>(
    writePath: WritePath,
    feature: Feature,
    creator: (this: ARendererManager<MergeFeatures<T, WritePath, Feature>>, rendererGenerator: InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>) => InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>,
    filter?: IFilter<InferNewRenderer<WritePath, IFeatureManager<T>, Feature> extends IRendererManager<infer NewFeature> ? NewFeature : never>
  ): ARendererManager<MergeFeatures<T, WritePath, Feature>> {
    const key = ARendererManager.createFeatureKey(feature, filter);
    if (this.featureCache.has(key)) throw new Error('renderer for type is already given');

    if (!(this.groupFeature instanceof GroupFeature)) {
      throw new Error('Expected a group feature.');
    }

    const self = this.createSelf<MergeFeatures<T, WritePath, Feature>>(this.groupFeature.appendFeature(writePath, feature) as any);
    const renderer = creator.call(self, this.createFeatureManager(feature as any) as any);

    self.featureCache.set(key, { renderer, filter } as any);
    return self;
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
      for (const { renderer, filter } of this.featureCache.values()) {
        const metadata = {
          project: {
            ...projectMetadata,
            workspace
          }
        };

        if (filter && !ARendererManager.resolveFilter(filter)(givenStructure)) {
          return;
        }

        await Promise.all([this.renderFeature(metadata, [...givenStructure]), renderer.renderFeature(metadata, [...givenStructure])]);
      }
    }
  }
}

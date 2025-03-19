import { GroupFeature, IFeature, MergeFeatures } from "@veto-party/baum__steps__installer__features";
import type { IFilter, InferNewRenderer, InferToFeatureManager, InferToRendererManager, IFeatureManager, IRendererManager, IRendererFEatureManager } from "../interface/IRendererManager.js";
import type { InferStructure, RendererMetadata } from "../interface/IRenderer.js";
import { createHash } from "node:crypto";
import { RenderFeatureManager } from "./RenderFeatureManager.js";


export abstract class ARendererManager<T extends IFeature<any, any, any>> extends RenderFeatureManager<T> implements IRendererManager<T> {
    protected featureCache = new Map<string, {
        renderer: IRendererFEatureManager<T>;
        filter?: IFilter<T>;
    }>();

    protected constructor(
        protected groupFeature: T
    ) {
        super();
    }

    // Create a stable hash from the filter function
    private static hashFilter(filter: <U extends InferStructure<any>>(obj: U[]) => boolean): string {
        const serializedFilter = filter.toString();  // Convert filter function to string
        return createHash('sha256').update(serializedFilter).digest('hex');  // Generate a hash of the function's string
    }

    private static createFilterKey(filter?: IFilter<any>): string {
        if (filter === undefined) return "no_filter";
        if (typeof filter === "function") return `func_${ARendererManager.hashFilter(filter)}`;
        return `str_${filter.key}`;
    }

    // Create a stable key based on feature and filter
    private static createFeatureKey<T extends IFeature<any, any, any>>(
        feature: T,
        filter?: IFilter<T>,
        custom?: string
    ): string {
        return [Object.getPrototypeOf(feature).name, ARendererManager.createFilterKey(filter), custom].filter(Boolean).join('_');
    }


    protected abstract createSelf<U extends IFeature<any, any, any>>(feature: U): ARendererManager<U>;
    protected abstract createFeatureManager(feature: T): IRendererFEatureManager<T>;

    ensureFeature<
        WritePath, 
        Feature extends IFeature<any, any, any>
    >(
            writePath: WritePath, 
            feature: Feature,
            creator: (rendererGenerator: InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>) => InferToFeatureManager<InferNewRenderer<WritePath, IFeatureManager<T>, Feature>>,
            filter?: IFilter<InferNewRenderer<WritePath, IFeatureManager<T>, Feature> extends IRendererManager<infer NewFeature> ? NewFeature : never> 
    ): IRendererManager<MergeFeatures<T, WritePath, Feature>> {

        const key = ARendererManager.createFeatureKey(feature, filter);
        if (this.featureCache.has(key)) throw new Error('renderer for type is already given');

        const renderer = creator(this.createFeatureManager(feature as any) as any);

        if (!(this.groupFeature instanceof GroupFeature)) {
            throw new Error('Expected a group feature.');
        }

        const self = this.createSelf<MergeFeatures<T, WritePath, Feature>>(this.groupFeature.appendFeature(writePath, feature) as any);
        (self as any).featureCache.set(key, { renderer, filter } as any);
        return self;
    }

    getGroup() {
        return this.groupFeature;
    }

    static resolveFilter<T extends IFeature<any, any, any>>(filter: IFilter<T>) {
        if (typeof filter === "function") return filter;
        return filter.filter;
    }

    render(metadata: RendererMetadata, structure: InferStructure<T>[]) {
        
        this.featureCache.forEach(({ renderer, filter }) => {

            if (filter && !ARendererManager.resolveFilter(filter)(structure)) {
                return;
            }

            renderer.render(metadata, structure);

        });

        super.render(metadata, structure);

    }
}
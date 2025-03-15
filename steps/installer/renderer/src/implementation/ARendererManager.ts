import type { GroupFeature, IFeature } from "@veto-party/baum__steps__installer__features";
import type { IFilter, InferNewRenderer, IRendererFeatureManager, IRendererManager } from "../interface/IRendererManager.js";
import type { InferStructure } from "../interface/IRenderer.js";
import { createHash } from "node:crypto";


export abstract class ARendererManager<T extends GroupFeature<any, any, any>> implements IRendererManager<T> {
    protected featureCache = new Map<string, {
        renderer: IRendererFeatureManager<T>;
        filter?: IFilter<T>;
    }>();

    protected constructor(
        protected groupFeature: T
    ) {

    }

    // Create a stable hash from the filter function
    private static hashFilter(filter: <U extends InferStructure<any>>(obj: U) => boolean): string {
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


    protected abstract createSelf<U extends ARendererManager<any>|unknown>(feature: U extends ARendererManager<infer GroupFeature> ? GroupFeature : GroupFeature<any, any, any>): U extends unknown ? ARendererManager<any> : U;
    protected abstract createFeatureManager(feature: T): IRendererFeatureManager<T>;

    async ensureFeature<
        WritePath extends string|undefined, 
        Feature extends IFeature<any, any, any>
    >(
            writePath: WritePath extends undefined ? undefined : WritePath, 
            feature: Feature,
            creator: (rendererGenerator: InferNewRenderer<WritePath, IRendererManager<T>, Feature>) => InferNewRenderer<WritePath, IRendererManager<T>, Feature>|Promise<InferNewRenderer<WritePath, IRendererManager<T>, Feature>>,
            filter?: IFilter<InferNewRenderer<WritePath, IRendererManager<T>, Feature> extends IRendererManager<infer NewFeature> ? NewFeature : never> 
    ): Promise<InferNewRenderer<WritePath, IRendererManager<T>, Feature>> {

        const key = ARendererManager.createFeatureKey(feature, filter);
        if (this.featureCache.has(key)) throw new Error('renderer for type is already given');

        const renderer = await creator(this.createFeatureManager(feature as any));

        const self = this.createSelf<InferNewRenderer<WritePath, IRendererManager<T>, Feature>>(this.groupFeature.appendFeature(writePath, feature));
        self.featureCache.set(key, { renderer, filter } as any);
        return self;
    }

    getGroup() {
        return this.groupFeature;
    }

    static resolveFilter<T extends IFeature<any, any, any>>(filter: IFilter<T>) {
        if (typeof filter === "function") return filter;
        return filter.filter;
    }

    render<U extends InferStructure<T>>(structure: U) {
        
        this.featureCache.forEach(({ renderer, filter }) => {

            if (filter && !ARendererManager.resolveFilter(filter)(structure)) {
                return;
            }

            renderer.render(structure);

        });

    }
}
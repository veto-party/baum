
import { IFeature } from '@veto-party/baum__steps__installer__features';

export type InferStructure<T> = T extends IFeature<any, any, infer U> ? U : never;



export interface IRenderer<T extends IFeature<any, any, any>> {
    render<U extends InferStructure<T>>(structure: U): Promise<any>|any;
}
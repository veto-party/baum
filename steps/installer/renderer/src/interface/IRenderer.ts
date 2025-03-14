
import { FromSchema } from "json-schema-to-ts";
import { IFeature } from '@veto-party/baum__steps__installer__features';


export interface IRenderer<T extends Record<string, any>|{}> {
    render<U extends T>(feature: IFeature<U, undefined, FromSchema<U>>): Promise<any>|any;
}
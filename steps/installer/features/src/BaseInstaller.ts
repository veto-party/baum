
import { FromSchema } from "json-schema-to-ts";
import { GroupFeature } from "./abstract/GroupFeature/GroupFeature.js";
import { definition } from "./definition.js";
import { VariableFeature } from "./implementation/Variable/Variable.js";
import { BindingFeature } from "./implementation/Binding/Binding.js";
import { ExposeFeature } from "./implementation/Expose/Expose.js";
import { ScalingFeature } from "./implementation/Scaling/ScalingFeature.js";
import { SystemUsageFeature } from "./implementation/SystemUsageFeature/SystemUsageFeature.js";
import { NetworkFeature } from "./implementation/Network/NetworkFeature.js";
import { UpdateStrategy } from "./implementation/UpdateStrategyFeature/UpdateStrategyFeature.js";
import { ServiceFeature } from "./implementation/Service/ServiceFeature.js";
import { VolumeFeature } from "./implementation/Volume/Volume.js";

export class BaseInstaller<T extends typeof definition = typeof definition> extends GroupFeature<T, undefined, FromSchema<T>> {
    public constructor(value: T =  definition as T)  {
        super(value, undefined);
    }

    protected do_construct(value: any) {
        return new BaseInstaller(value);
    }

    public static makeInstance() {
        const installer = (new BaseInstaller(definition))

        return installer;
    }
}
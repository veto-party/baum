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

export class BaseInstaller<T extends typeof definition = typeof definition> extends GroupFeature<T, never, FromSchema<T>> {
    protected constructor(value: any)  {
        super(value, undefined);
    }

    public static makeInstance() {
        const installer = (new BaseInstaller(definition))
            .appendFeature('items.properties', VariableFeature.makeInstance())
            .appendFeature('items.properties', new BindingFeature())
            .appendFeature('items.oneOf[1].properties', new ExposeFeature())
            .appendFeature('items.oneOf[1].properties', new ScalingFeature())
            .appendFeature('items.oneOf[1].properties', new SystemUsageFeature())
            .appendFeature('items.oneOf[1].properties', new NetworkFeature())
            .appendFeature('items.oneOf[1].properties', new UpdateStrategy())
            .appendFeature('items.oneOf[1].properties', ServiceFeature.makeInstance());

        const data = installer.getSchema();
        return installer;
    }
}
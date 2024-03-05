import { GroupStep } from "../../../../../../../index.js";
import { IPublishIntent } from "../../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js";
import { AIntent } from "../../AIntent.js";
import zod from 'zod';
import { ModifyNPMRC } from "./ModifyNPMRC.js";

const publishIntentValidation = zod.object({
    registry: zod.string().url().optional(),
    token: zod.string().optional(),
    forcePublic: zod.boolean().optional(),
});

class PublishIntent extends AIntent implements IPublishIntent {

    constructor(
        private registry?: string | [registry: string, authToken: string],
        private token?: string,
        private forcePublic: boolean = false
    ) {
        super();
    }

    setAuthorization(token: string): IPublishIntent {
        return new PublishIntent(this.registry, token, this.forcePublic);
    }

    setRegistry(registry?: string | [registry: string, authToken: string]): IPublishIntent {
        return new PublishIntent(registry, this.token, this.forcePublic);
    }

    setForcePublic(force?: boolean | undefined): IPublishIntent {
        return new PublishIntent(this.registry, this.token, force);
    }

    validate(): void {
        const result = publishIntentValidation.safeParse(this);

        if (!result.success) {
            throw result.error;
        }
    }

    getPrepareStep = () => {
        if (!Array.isArray(this.registry)) {
            return new GroupStep([]); // For now return empty step. // TODO: This could be undefined to improve performance.
        }

        const url = new URL(this.registry[0]);

        return new ModifyNPMRC(`
//${url.toString().substring(url.protocol.length)}:authToken="${this.registry[1]}"
//${url.toString().substring(url.protocol.length)}:always-auth=true
`);
    };

    toStingGroup(): string[] {
        return [Array.isArray(this.registry) ? this.registry[0] : this.registry!, this.forcePublic ? 'public' : undefined].filter((value): value is string => typeof value === "string");
    }
}

export { PublishIntent }
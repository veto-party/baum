import zod from "zod";
import { ICommandIntent } from "../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js";
import { AIntent } from "../AIntent.js";

const commandIntentValidator = zod.object({
    command: zod.string().min(1),
    parameters: zod.string().optional()
})

class CommandIntent extends AIntent implements ICommandIntent {

    constructor(
        private command?: string,
        private parameters?: string
    ) {
        super();
    }

    setCommand(command: string): ICommandIntent {
        return new CommandIntent(command, this.parameters);
    }

    toStingGroup(): string[] {
        this.validate();
        return [this.command!, this.parameters].filter((item): item is string => typeof item === "string");
    }

    setParameters(parameters: string): ICommandIntent {
        return new CommandIntent(this.command, parameters);
    }

    validate(): void {
        const result = commandIntentValidator.safeParse(this);
        if (!result.success) {
            throw result.error;
        }
    }

}

export { CommandIntent };
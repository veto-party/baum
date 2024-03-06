import { satisfies } from "semver";
import { GroupStep, IStep } from "../../../../index.js";
import { IExecutionIntent, IExecutionIntentBuilder } from "../../../../interface/PackageManager/executor/IPackageManagerExecutor.js";
import { IExecutablePackageManagerParser } from "../../../../interface/PackageManager/executor/IPackageManagerParser.js";
import { CommandStep } from "../../CommandStep.js";
import { AIntent } from "./intent/AIntent.js";
import { CommandIntent } from "./intent/implementation/CommandIntent.js";
import { InstallIntent } from "./intent/implementation/InstallIntent.js";
import { PublishIntent } from "./intent/implementation/PublishIntent/PublishIntent.js";
import { RunIntent } from "./intent/implementation/RunIntent.js";

const stepMapping = {
    'run': RunIntent,
    'publish': PublishIntent,
    'command': CommandIntent,
    'install': InstallIntent,
};

stepMapping satisfies Record<keyof IExecutionIntentBuilder, any>;

type callbackArgs = { [K in keyof typeof stepMapping]: InstanceType<(typeof stepMapping)[K]> extends {
    toGroup(): infer U
} ? U extends any[] ? [K, ...U] : never : never }[keyof typeof stepMapping]

abstract class ATemplateExecutor implements IExecutablePackageManagerParser {

    constructor(
        private templates: Record<keyof IExecutionIntentBuilder, (...args: callbackArgs) => string>
    ) { }

    private mapToBasicString(step: IExecutionIntent): keyof IExecutionIntentBuilder {
        switch (true) {
            case step instanceof PublishIntent:
                return 'publish';
            case step instanceof CommandIntent:
                return 'command';
            case step instanceof InstallIntent:
                return 'install';
            case step instanceof RunIntent:
                return 'run';
        }

        throw new Error("got unmapped or custom intent, this is currently not supported.");
    }

    parseAbstractSyntax(syntax: IExecutionIntent[]): IStep {
        // TODO: find option to make this parallel.
        return new GroupStep(syntax.map((step) => {

            if (!(step instanceof AIntent)) {
                throw new Error("This class only supported AIntent instances.");
            }

            return new CommandStep(this.templates[this.mapToBasicString(step)](this.mapToBasicString(step), step.toGroup()), undefined, (code) => (step.getSuccessCodes?.() ?? []).includes(code!));
        }))
    }
}

export default ATemplateExecutor;
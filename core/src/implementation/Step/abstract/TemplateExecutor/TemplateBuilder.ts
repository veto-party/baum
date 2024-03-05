import { IStep } from "../../../../index.js";
import { ICommandIntent, IExecutionIntent, IExecutionIntentBuilder, IInstallIntent, IPublishIntent, IRunIntent } from "../../../../interface/PackageManager/executor/IPackageManagerExecutor.js";
import { IExecutablePackageManagerParser } from "../../../../interface/PackageManager/executor/IPackageManagerParser.js";
import { CommandIntent } from "./intent/implementation/CommandIntent.js";
import { InstallIntent } from "./intent/implementation/InstallIntent.js";
import { PublishIntent } from "./intent/implementation/PublishIntent/PublishIntent.js";
import { RunIntent } from "./intent/implementation/RunIntent.js";



class TemplateBuilder implements IExecutionIntentBuilder {
    publish(): IPublishIntent {
        return new PublishIntent();
    }
    run(): IRunIntent {
        return new RunIntent();
    }
    command(): ICommandIntent {
        return new CommandIntent();
    }

    install(): IInstallIntent {
        return new InstallIntent()
    }
}

export default TemplateBuilder;
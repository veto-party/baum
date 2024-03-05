import { IStep } from "../../../../../index.js";
import { IExecutionIntent } from "../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js";

export abstract class AIntent implements IExecutionIntent {
    abstract toStingGroup(): string[];

    getSuccessCodes?: () => number[];

    getPrepareStep?: () => IStep = undefined;
    abstract validate(): void;
}
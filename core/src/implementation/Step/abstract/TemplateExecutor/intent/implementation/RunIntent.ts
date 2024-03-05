import { IRunIntent } from "../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js";
import { AIntent } from "../AIntent.js";
import zod from 'zod';

const runIntentValidator = zod.object({
    successCode: zod.array(zod.number()),
    step: zod.string(),
    parameters: zod.string().optional()
});

class RunIntent extends AIntent implements IRunIntent {

    constructor(
        private successCodes: number[] = [0],
        private step?: string,
        private parameters?: string
    ) {
        super();
    }

    getSuccessCodes = () => {
        return this.successCodes;
    }

    setSuccessCodes(codes: number[]): IRunIntent {
        return new RunIntent(codes, this.step, this.parameters);
    }

    setRunStep(step: string): IRunIntent {
        return new RunIntent(this.successCodes, step, this.parameters);
    }

    setParameters(parameters: string): IRunIntent {
        return new RunIntent(this.successCodes, this.step, parameters);
    }

    validate(): void {
        const result = runIntentValidator.safeParse(this);
        if (!result.success) {
            throw result.error;
        }
    }

    toStingGroup(): string[] {
        return [this.step, this.parameters].filter((value): value is string => typeof value === "string");
    }
}

export { RunIntent }
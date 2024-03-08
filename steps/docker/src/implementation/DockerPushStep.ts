import { ADockerStep } from "./ADockerStep.js";

export class DockerPushStep extends ADockerStep {
    constructor(
        subCommand: string,
        cwd: string,
        processValidation: (code: number | null) => boolean = (code) => code === 0
    ) {
        super(`push ${subCommand},`, cwd, processValidation);
    }
}
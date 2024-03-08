import { CommandStep, RunOnce } from "@veto-party/baum__core";

@RunOnce()
export class StartupStep extends CommandStep {
    constructor(
        port: string,
        cwd: string
    ) {
        super(`docker run --rm -d -p ${port}:4873 --name verdaccio registry:2.`, cwd);
    }
}
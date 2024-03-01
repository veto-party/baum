import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default (manager) => {
    manager.setRootDirectory(__dirname);
    manager.setPackageManager(new PNPM());

    manager.addExecutionStep("prepare", new ParalelExecutionGroup([new PKMExecution("test", { ingngoreErrorCodes: [] }), new PKMExecution("build")])).addExecutionStep("push", new PushTask());
    manager.addExecutionStep("test", new ExectutionGroup([new PKMExecution('test', { ignoreErrorCodes: [] })])).addExecutionStep("build").addExecutionStep("push", new PushTask(), ["build", "test"]).addExecutionGroup("")
}

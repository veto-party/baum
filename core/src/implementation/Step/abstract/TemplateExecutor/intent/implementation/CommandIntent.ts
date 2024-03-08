import zod from 'zod';
import { ICommandIntent } from '../../../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';
import { AIntent } from '../AIntent.js';

const commandIntentValidator = zod.object({
  command: zod.string(),
  parameters: zod.string().optional()
});

class CommandIntent extends AIntent<[string] | [string, string]> implements ICommandIntent {
  constructor(
    private command?: string,
    private parameters?: string
  ) {
    super();
  }

  setCommand(command: string): ICommandIntent {
    return new CommandIntent(command, this.parameters);
  }

  toGroup(): [string] | [string, string] {
    this.validate();

    if (this.parameters) {
      return [this.command!, this.parameters];
    }

    return [this.command!];
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

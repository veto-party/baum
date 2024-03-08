import { GroupStep, IStep } from '../../../../index.js';
import { IExecutionIntent, IExecutionIntentBuilder } from '../../../../interface/PackageManager/executor/IPackageManagerExecutor.js';
import { IExecutablePackageManagerParser } from '../../../../interface/PackageManager/executor/IPackageManagerParser.js';
import { CommandStep } from '../../CommandStep.js';
import { AIntent } from './intent/AIntent.js';
import { CommandIntent } from './intent/implementation/CommandIntent.js';
import { InstallIntent } from './intent/implementation/InstallIntent.js';
import { PublishIntent } from './intent/implementation/PublishIntent/PublishIntent.js';
import { RunIntent } from './intent/implementation/RunIntent.js';

const stepMapping = {
  run: RunIntent,
  publish: PublishIntent,
  command: CommandIntent,
  install: InstallIntent
};

stepMapping satisfies Record<keyof IExecutionIntentBuilder, any>;

export type callbackArgs = {
  [K in keyof typeof stepMapping]: InstanceType<(typeof stepMapping)[K]> extends {
    toGroup(): infer U;
  }
    ? U extends any[]
      ? U
      : never
    : never;
};

export type CallbackType = {
  [K in keyof callbackArgs]: [K, callbackArgs[K]];
}[keyof callbackArgs];

export abstract class ATemplateExecutor implements IExecutablePackageManagerParser {
  constructor(private executable: (...args: CallbackType) => string) {}

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

    throw new Error('got unmapped or custom intent, this is currently not supported.');
  }

  parseAbstractSyntax(syntax: IExecutionIntent[]): IStep {
    return new GroupStep(
      syntax.flatMap((step) => {
        if (!(step instanceof AIntent)) {
          throw new Error('This class only supported AIntent instances.');
        }

        const command = new CommandStep(this.executable(this.mapToBasicString(step), step.toGroup()), undefined, (code) => (step.getSuccessCodes?.() ?? [0]).includes(code!));
        const intent = step.getPrepareStep?.();

        if (intent) {
          return [intent, command];
        }

        return command;
      })
    );
  }
}

import { ATemplateExecutor, GroupStep, IExecutablePackageManager, IExecutionIntent, IStep, IWorkspace, callbackArgs } from '@veto-party/baum__core';
import ejs from 'ejs';

const ifSet = (variableName: string, templateStr: string) => `<%- ${variableName} ? include('file', { "$$template": "${Buffer.from(templateStr).toString('base64')}"}) : "" %>`;

const raw_commands: Record<keyof callbackArgs, string> = {
  command: `pnpm dlx <%= package %><%= command %> ${ifSet('parameters', '-- <%= parameters %>')}`,
  install: 'pnpm <%= type == "ci" ? "install --no-frozen-lockfile" : type %>',
  publish: `pnpm publish --no-git-checks ${ifSet('registry', '--registry=<%= registry %>')} ${ifSet('access', 'access=<%= access %>')}`,
  run: `pnpm run <%= command %> ${ifSet('parameters', '<%= parameters %>')}`
};

const to_object: { [K in keyof callbackArgs]: (...args: callbackArgs[K]) => any } = {
  command: (command, parameters?: string) => ({ command, parameters }),
  install: (type: string) => ({ type }),
  publish: (registry, access?: string) => ({ registry, access }),
  run: (command, parameters?: string) => ({ command, parameters })
} as const;

let blockPromise: Promise<void> | undefined;
let blockNumberCounter = 0;
let blockNumber = 0;

export class PNPMExecutor extends ATemplateExecutor {
  constructor() {
    super((name, ...rest) => {
      const params = (to_object[name] as (...args: any[]) => any)(...rest);

      return ejs.compile(raw_commands[name], { client: true })(params, undefined, (path, givenData) => {
        return ejs.render(Buffer.from(givenData!.$$template, 'base64').toString(), params);
      });
    });
  }

  parseAbstractSyntax(syntax: IExecutionIntent[]): IStep {
    return new GroupStep(syntax.map((syntax) => {
      if (syntax.name === "install") {
        const step = super.parseAbstractSyntax([syntax]);

        // https://github.com/pnpm/pnpm/issues/941 (only one install per time, other things are not supported.)
        return new class implements IStep {

          private async awaitBlock() {

            const currentNo = ++blockNumberCounter;

            while (blockNumber < currentNo) {
              if (blockPromise) {
                this.awaitBlockCycle();
              } else {
                await new Promise((resolve) => setTimeout(resolve, 100));
              }
            }
          }

          private async awaitBlockCycle() {
            await new Promise<void>((resolve) => {
              blockPromise = blockPromise?.then(resolve, resolve);
              if (blockPromise === undefined) {
                resolve();
              }
            })
          }

          async execute(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
            await this.awaitBlock();
            blockPromise = step.execute(workspace, packageManager, rootDirectory);
            await this.awaitBlockCycle();
            blockNumber++;
          }

          async clean(workspace: IWorkspace, packageManager: IExecutablePackageManager, rootDirectory: string): Promise<void> {
            await this.awaitBlock();
            blockPromise = step.clean(workspace, packageManager, rootDirectory);
            await this.awaitBlockCycle();
            blockNumber++;
          }
        }
      }

      return super.parseAbstractSyntax([syntax]);
    }))
  }
}

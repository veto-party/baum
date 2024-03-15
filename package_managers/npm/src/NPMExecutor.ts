import { ATemplateExecutor, type callbackArgs } from '@veto-party/baum__core';
import ejs from 'ejs';

const ifSet = (variableName: string, templateStr: string) => `<%- ${variableName} ? include('file', { "$$template": "${Buffer.from(templateStr).toString('base64')}"}) : "" %>`;

const raw_commands: Record<keyof callbackArgs, string> = {
  command: `npx <%= package %><%= command %> ${ifSet('parameters', '-- <%= parameters %>')}`,
  install: 'npm <%= type %>',
  publish: `npm publish ${ifSet('registry', '--registry=<%= registry %>')} ${ifSet('access', 'access=<%= access %>')}`,
  run: `npm run <%= command %> ${ifSet('parameters', '-- <%= parameters %>')}`
};

const to_object: { [K in keyof callbackArgs]: (...args: callbackArgs[K]) => any } = {
  command: (command, parameters?: string) => ({ command, parameters }),
  install: (type: string) => ({ type }),
  publish: (registry, access?: string) => ({ registry, access }),
  run: (command, parameters?: string) => ({ command, parameters })
} as const;

export class NPMExecutor extends ATemplateExecutor {
  constructor() {
    super((name, ...rest) => {
      const params = (to_object[name] as (...args: any[]) => any)(...rest);

      return ejs.compile(raw_commands[name], { client: true })(params, undefined, (path, givenData) => {
        return ejs.render(Buffer.from(givenData!.$$template, 'base64').toString(), params);
      });
    });
  }
}

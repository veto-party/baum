import { ATemplateExecutor, callbackArgs } from "@veto-party/baum__core";
import ejs from 'ejs';

const ifSet = (variableName: string, templateStr: string) => `<%= ${variableName} !== undefined ? "${ejs.render(templateStr, { [variableName]: variableName })}" : "" %>`;

const raw_commands: Record<keyof callbackArgs, string> = {
    command: `npx <%= package %><%= command %> ${ifSet('parameters', "-- <%= parameters %>")}`,
    install: 'npm <%= type %>',
    publish: `npm publish ${ifSet('registry', '--registry=<%= registry %>')} ${ifSet('access', "access=<%= access %>")}`,
    run: `npm run <%= command %> ${ifSet('parameters', '-- <%= parameters %>')}`
}
const to_object: { [K in keyof callbackArgs]: (...args: callbackArgs[K]) => any } = {
    command: (command, parameters?: string) => ({ command, parameters }),
    install: (type: string) => ({ type }),
    publish: (registry, access?: string) => ({ registry, access }),
    run: (command, parameters?: string) => ({ command, parameters })
} as const;

export class NPMExecutor extends ATemplateExecutor {

    constructor() {
        super((name, ...rest) => {
            return ejs.render(raw_commands[name], (to_object[name] as (...args: any[]) => any)(...rest));
        });
    }

    private doExecute() {

    }
}

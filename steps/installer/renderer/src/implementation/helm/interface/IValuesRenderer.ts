import { IWorkspace } from "@veto-party/baum__core";
import { IWritable } from "./IWritable.js";

export interface IValuesRendererResult extends IWritable {

}

export interface IValuesRenderer {
    render(worspace: IWorkspace, dataMap: Map<string, any>): IValuesRendererResult|Promise<IValuesRendererResult>;
}
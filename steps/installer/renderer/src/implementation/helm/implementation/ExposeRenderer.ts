import { IWorkspace } from "@veto-party/baum__core";
import { ExposeStructure, IExposeRenderer, IExposeRenderResult } from "../interface/IExposeRenderer.js";

export class ExposeRenderer implements IExposeRenderer {
    render(workspace: IWorkspace, config: Map<string | number, ExposeStructure> | undefined): IExposeRenderResult {
        
        return {
            getPorts: () => {
                const set = new Set((config?.keys() ?? []).map((el) => Number(el)));

                for (const value of Array.from(set.values())) {
                    if (!Number.isInteger(value) || Number.isNaN(value) || !Number.isFinite(value)) {
                        set.delete(value);
                    }
                }

                return set;
            },
            write: () => {
                throw new Error('Not implemented.');
            }
        }
    }
}
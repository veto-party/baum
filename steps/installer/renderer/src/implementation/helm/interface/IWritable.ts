import { INameProvider } from "../../../interface/INameProvider.js";

export interface IWritable {
    write(nameProvider: INameProvider): Promise<void> | void;
}
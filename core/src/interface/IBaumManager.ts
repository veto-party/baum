import { IBaumManagerConfiguration } from "./IBaumManagerConfiguration";

export interface IBaumManager extends IBaumManagerConfiguration {
    run(): Promise<void>;
}

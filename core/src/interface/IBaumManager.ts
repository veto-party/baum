import { IBaumManagerConfiguration } from "./IBaumManagerConfiguration.js";

export interface IBaumManager extends IBaumManagerConfiguration {
    run(): Promise<void>;
}
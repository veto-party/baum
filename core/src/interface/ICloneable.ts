import { IStep } from "./IStep.js";

export interface ICloneable<self extends IStep = IStep> {
  clone(): self;
}
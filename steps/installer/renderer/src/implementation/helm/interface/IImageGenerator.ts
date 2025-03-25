import type { IWorkspace } from '@veto-party/baum__core';

type Image = {
  image: string;
};

export interface IImageGenerator {
  generateImage(workspace: IWorkspace): Image;
}

import { isNumber, toPath } from 'lodash-es';

export const toHelmPathWithPossibleIndex = (value: string) => {
  const parts = toPath(value);

  const mapPart = (previous: string | undefined, part: string) => {
    if (isNumber(part)) {
      return `(index ${previous ?? '.'} ${part})`;
    }

    return [previous, part].filter(Boolean).join('.');
  };

  return parts.reduce(mapPart, undefined);
};

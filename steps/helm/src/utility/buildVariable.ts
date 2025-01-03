import Crypto from 'node:crypto';
import FS from 'node:fs';
import Path from 'node:path';
import { CachedFN } from '@veto-party/baum__core';
import { snakeCase } from 'change-case';
import type { ExtendedSchemaType } from '../HelmGeneratorProvider.js';

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi';
const generatePassword = (len: number) => {
  let sb = '';
  for (let i = 0; i < len; i++) sb += chars.charAt(Crypto.randomInt(chars.length));
  return sb.toString();
};

/**
class required for caching decorator
*/
// biome-ignore lint/complexity/noStaticOnlyClass: we need the annation.
class VariablePrepareLogic {
  @CachedFN(false)
  static prepareVariable(variableDefinition: Exclude<ExtendedSchemaType['variable'], undefined>[string], scopeName: string) {
    if (variableDefinition.file) {
      if (!Path.isAbsolute(variableDefinition.file)) {
        if (variableDefinition.ref !== undefined) {
          throw new Error('Should not have to resolve a ref. not possible here.');
        }

        if (!variableDefinition.sourcePath) {
          throw new Error('Source path is missing go generate relative path.');
        }
        variableDefinition.file = Path.join(variableDefinition.sourcePath, variableDefinition.file);
      }

      variableDefinition.default = FS.readFileSync(variableDefinition.file).toString();
      return;
    }

    if (variableDefinition.generated) {
      variableDefinition.default = generatePassword(variableDefinition.generated);
      return;
    }

    if (variableDefinition.type === 'scoped-name') {
      if (variableDefinition.case === 'snake') {
        variableDefinition.default = snakeCase(scopeName);
      } else {
        variableDefinition.default = scopeName;
      }

      return;
    }
  }
}

export const buildVariable = (variableDefinition: Exclude<ExtendedSchemaType['variable'], undefined>[string], scopeName: string) => {
  const clone = {
    ...variableDefinition,
    binding: {},
    ref: undefined as any
  };

  VariablePrepareLogic.prepareVariable(clone, scopeName);

  variableDefinition.default = clone.default;

  return variableDefinition.default;
};

export const getHash = (value: string) => {
  return Crypto.createHash('sha1').update(value).digest('base64').replaceAll('/', 'S').replaceAll('+', 'P').replaceAll('=', 'G').toLowerCase().substring(0, 8);
};

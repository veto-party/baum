import Crypto from 'node:crypto';
import type { ExtendedSchemaType } from '../HelmGeneratorProvider.js';
import FS from 'fs';
import Path from 'path';
import { CachedFN } from '@veto-party/baum__core';

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi';
const generatePassword = (len: number) => {
  let sb = '';
  for (let i = 0; i < len; i++) sb += chars.charAt(Crypto.randomInt(chars.length));
  return sb.toString();
};


/**
class required for caching decorator
*/
class VariablePrepareLogic {
  @CachedFN(false)
  static prepareVariable(variableDefinition: Exclude<ExtendedSchemaType['variable'], undefined>[string], scopeName: string) {
    if (variableDefinition.file) {
      if (!Path.isAbsolute(variableDefinition.file)) {

        if (variableDefinition.ref !== undefined) {
          throw new Error("Should not have to resolve a ref. not possible here.");
        }

        if (!variableDefinition.sourcePath) {
          throw new Error("Source path is missing go generate relative path.");
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
        variableDefinition.default = scopeName.replaceAll('-', '_'); // TODO: camelCase to snake_case
      } else {
        variableDefinition.default = scopeName;
      }

      return;
    }
  }
}

export const buildVariable = (variableDefinition: Exclude<ExtendedSchemaType['variable'], undefined>[string], scopeName: string) => {
  VariablePrepareLogic.prepareVariable(variableDefinition, scopeName);
  return variableDefinition.default;
};

export const getHash = (value: string) => {
  return Crypto.createHash('sha1').update(value).digest('base64').replaceAll('/', 'S').replaceAll('+', 'P').replaceAll('=', 'G').toLowerCase().substring(0, 8);
};

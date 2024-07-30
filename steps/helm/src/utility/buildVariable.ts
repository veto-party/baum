import Crypto from 'node:crypto';
import type { ExtendedSchemaType } from '../HelmGeneratorProvider.js';

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi';
const generatePassword = (len: number) => {
  let sb = '';
  for (let i = 0; i < len; i++) sb += chars.charAt(Crypto.randomInt(chars.length));
  return sb.toString();
};

export const buildVariable = (variableDefinition: Partial<Exclude<ExtendedSchemaType['variable'], undefined>[string]>, scopeName: string) => {
  if (variableDefinition.type === 'scoped-name') {
    if (variableDefinition.case === 'snake') {
      return scopeName.replaceAll('-', '_'); // TODO: camelCase to snake_case
    }

    return scopeName;
  }

  if (variableDefinition.generated) {
    variableDefinition.default = generatePassword(variableDefinition.generated);
  }

  return variableDefinition.default;
};

const doHash = (value: string | number) => {
  let hash = 7;

  if (typeof value === 'number') {
    value = value.toString(32);
  }

  for (let i = 0; i < value.length; i++) {
    hash = (hash + value.charCodeAt(i)) / 2;
  }

  return hash;
};

export const getHash = (value: string) => {
  let hash: string | number = value;
  do {
    hash = doHash(hash);
  } while (hash.toString(16).length > 6);

  return Buffer.from(hash.toString(32)).toString('base64').replaceAll('=', '');
};

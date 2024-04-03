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

export const getHash = (value: string) => {
  let hash = 7;
  for (let i = 0; i < value.length; i++) {
    hash = hash * 31 + value.charCodeAt(i);
  }

  const hexHash = hash.toString(16);
  return hexHash.substring(0, Math.min(6, hexHash.length - 1));
}

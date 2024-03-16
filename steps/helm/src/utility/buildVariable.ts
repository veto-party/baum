import Crypto from 'node:crypto';
import type { VariableType } from '../types/types.js';

const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghi';
const generatePassword = (len: number) => {
  let sb = '';
  for (let i = 0; i < len; i++) sb += chars.charAt(Crypto.randomInt(chars.length));
  return sb.toString();
};

const buildVariableBase = (variableDefinition: VariableType, scopeName: string) => {
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

export const buildVariable = (variableDefinition: VariableType, scopeName: string) => {
  const varDefinition = buildVariableBase(variableDefinition, scopeName);

  if (typeof varDefinition === 'string') {
    return `"${varDefinition}"`;
  }

  if (varDefinition === true) {
    return 'true';
  }

  if (varDefinition === false) {
    return 'false';
  }

  return varDefinition;
};

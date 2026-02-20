import { getValueByDotNotationUtility } from './dot-notation-access.utility';

describe('getValueByDotNotation', () => {
  const testObject = {
    some: 'value',
    nested: {
      some: 'value',
      deeper: {
        some: 'value',
      },
    },
  };

  it('should return null for null input object', () => {
    expect(getValueByDotNotationUtility(null, 'some.path')).toBeNull();
  });

  it('should return null for null path', () => {
    expect(getValueByDotNotationUtility(testObject, null)).toBeNull();
  });

  it('should return null for undefined path', () => {
    expect(getValueByDotNotationUtility(testObject, undefined)).toBeNull();
  });

  it('should return null for empty path', () => {
    expect(getValueByDotNotationUtility(testObject, '')).toBeNull();
  });

  it('should return null for non-existent path', () => {
    expect(getValueByDotNotationUtility(testObject, 'non.existent.path')).toBeNull();
  });

  it('should return value for simple path', () => {
    expect(getValueByDotNotationUtility(testObject, 'some')).toBe('value');
  });

  it('should return value for nested path', () => {
    expect(getValueByDotNotationUtility(testObject, 'nested.some')).toBe('value');
  });

  it('should return value for deeply nested path', () => {
    expect(getValueByDotNotationUtility(testObject, 'nested.deeper.some')).toBe('value');
  });

  it('should throw for non-object input', () => {
    expect(() => getValueByDotNotationUtility('not an object', 'some.path')).toThrow();
  });
});

export const getValueByDotNotationUtility = (obj: any, path: string | null | undefined): any => {
  if (!obj || !path) {
    return null;
  }

  if (typeof obj !== 'object') {
    throw new Error('Input value must be an object');
  }

  const indices = path.split('.');
  const result = indices.reduce((current, key) => {
    // recursively access nested properties
    if (current && current[key] !== undefined) {
      return current[key];
    }
    return null;
  }, obj);

  return result;
};

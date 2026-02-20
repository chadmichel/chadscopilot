import { IdDisplayPipe } from './id-display.pipe';

describe('IdDisplayPipe', () => {
  const pipe = new IdDisplayPipe();

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null input', () => {
    expect(pipe.transform('')).toBe('');
  });

  it('should return first part of guid', () => {
    expect(pipe.transform('123e4567-e89b-12d3-a456-426614174000')).toBe(
      '123e4567'
    );
  });

  it('should return full string if no hyphens', () => {
    expect(pipe.transform('abc123')).toBe('abc123');
  });
});

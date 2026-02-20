import { MediumDatePipe } from './medium-date.pipe';

describe('MediumDatePipe', () => {
  let pipe: MediumDatePipe;

  beforeEach(() => {
    pipe = new MediumDatePipe();
  });

  it('should create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should format Date object correctly', () => {
    const date = new Date(2025, 7, 3); // August 3, 2025 (month is 0-indexed)
    expect(pipe.transform(date)).toBe('8/3/2025');
  });

  it('should format date string correctly', () => {
    const dateString = '2025-08-03T12:00:00.000Z'; // Use a specific time to avoid timezone issues
    expect(pipe.transform(dateString)).toBe('8/3/2025');
  });

  it('should handle single digit month and day', () => {
    const date = new Date(2025, 0, 5); // January 5, 2025
    expect(pipe.transform(date)).toBe('1/5/2025');
  });

  it('should handle double digit month and day', () => {
    const date = new Date(2025, 11, 25); // December 25, 2025
    expect(pipe.transform(date)).toBe('12/25/2025');
  });

  it('should return empty string for null', () => {
    expect(pipe.transform(null)).toBe('');
  });

  it('should return empty string for undefined', () => {
    expect(pipe.transform(undefined)).toBe('');
  });

  it('should return empty string for invalid date', () => {
    expect(pipe.transform('invalid-date')).toBe('');
  });

  it('should handle empty string', () => {
    expect(pipe.transform('')).toBe('');
  });
});

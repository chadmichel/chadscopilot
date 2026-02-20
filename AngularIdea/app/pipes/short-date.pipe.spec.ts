import { ShortDatePipe } from './short-date.pipe';

describe('ShortDatePipe', () => {
  let pipe: ShortDatePipe;

  beforeEach(() => {
    pipe = new ShortDatePipe();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  })

  it('create an instance', () => {
    expect(pipe).toBeTruthy();
  });

  it('should return empty string for null input', () => {
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('')).toBe('');
  });

  it('should display "moments ago" for dates within last 10 minutes', () => {
    const now = new Date();
    jest.setSystemTime(now);

    // 5 minutes ago
    const recent = new Date(now.getTime() - 5 * 60 * 1000);
    expect(pipe.transform(recent)).toBe('moments ago');
  });

  it('should display "hours ago" for dates within last 24 hours', () => {
    const now = new Date();
    jest.setSystemTime(now);

    // 2 hours ago
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    expect(pipe.transform(twoHoursAgo)).toBe('2 hours ago');

    // 1 hour ago
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000);
    expect(pipe.transform(oneHourAgo)).toBe('1 hour ago');
  });

  it('should display "days ago" for dates within last week', () => {
    const now = new Date();
    jest.setSystemTime(now);

    // 3 days ago
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(threeDaysAgo)).toBe('3 days ago');

    // 1 day ago
    const oneDayAgo = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
    expect(pipe.transform(oneDayAgo)).toBe('1 day ago');
  });

  it('should display standard date format for older dates', () => {
    const now = new Date(2023, 5, 15); // June 15, 2023
    jest.setSystemTime(now);

    const oldDate = new Date(2023, 5, 1); // June 1, 2023 (14 days ago)
    expect(pipe.transform(oldDate)).toBe('6/1/2023');
  });
});

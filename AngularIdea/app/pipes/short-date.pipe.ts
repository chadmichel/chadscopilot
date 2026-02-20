import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'shortDate',
  standalone: true,
})
export class ShortDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = this.parseDate(value);
    const now = new Date();

    if (isNaN(date.getTime())) {
      return '';
    }

    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMs < 0) {
      if (diffDays < 0) {
        return `${diffDays * -1} days from now`;
      }
      return 'in the future';
    } else {
      // Within last 10 minutes
      if (diffMinutes < 10) {
        return 'moments ago';
      }

      if (diffHours < 1) {
        return `${diffMinutes} minutes ago`;
      }

      // Within last 24 hours
      if (diffHours < 24) {
        return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      }

      // Within last week (7 days)
      if (diffDays < 7) {
        return diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
      }

      // Otherwise, show standard date format
      return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
    }
  }

  /**
   * Parse date string, handling date-only strings (YYYY-MM-DD) as local dates
   * to avoid timezone conversion issues
   */
  private parseDate(value: string | Date): Date {
    if (value instanceof Date) {
      return value;
    }

    // Check if it's a date-only string (YYYY-MM-DD)
    const dateOnlyMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnlyMatch) {
      // Parse as local date to avoid UTC conversion
      const year = parseInt(dateOnlyMatch[1], 10);
      const month = parseInt(dateOnlyMatch[2], 10) - 1; // months are 0-indexed
      const day = parseInt(dateOnlyMatch[3], 10);
      return new Date(year, month, day);
    }

    // For other formats, use standard parsing
    return new Date(value);
  }
}

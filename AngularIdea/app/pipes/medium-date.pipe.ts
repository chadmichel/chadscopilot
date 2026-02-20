import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'mediumDate',
  standalone: true,
})
export class MediumDatePipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    if (!value) return '';

    const date = this.parseDate(value);

    if (isNaN(date.getTime())) {
      return '';
    }

    // Format as M/D/YYYY (e.g., "8/3/2025")
    const month = date.getMonth() + 1; // getMonth() returns 0-11
    const day = date.getDate();
    const year = date.getFullYear();

    return `${month}/${day}/${year}`;
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

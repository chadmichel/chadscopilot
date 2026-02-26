import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeAgo',
  standalone: true,
})
export class TimeAgoPipe implements PipeTransform {
  transform(value: Date | string): string {
    if (!value) return '';

    // Convert input to Date if it's a string
    const date = typeof value === 'string' ? new Date(value) : value;

    // Get current time
    const now = new Date();

    // Calculate time difference in seconds
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    // Define time intervals in seconds
    const intervals = {
      year: 31536000,
      month: 2592000,
      week: 604800,
      day: 86400,
      hour: 3600,
      minute: 60,
      second: 1,
    };

    // Return appropriate time ago string
    if (diff < 5) {
      return 'just now';
    } else if (diff < intervals.minute) {
      return `${diff} seconds ago`;
    } else if (diff < intervals.hour) {
      const minutes = Math.floor(diff / intervals.minute);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    } else if (diff < intervals.day) {
      const hours = Math.floor(diff / intervals.hour);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    } else if (diff < intervals.week) {
      const days = Math.floor(diff / intervals.day);
      return `${days} ${days === 1 ? 'day' : 'days'} ago`;
    } else if (diff < intervals.month) {
      const weeks = Math.floor(diff / intervals.week);
      return `${weeks} ${weeks === 1 ? 'week' : 'weeks'} ago`;
    } else if (diff < intervals.year) {
      const months = Math.floor(diff / intervals.month);
      return `${months} ${months === 1 ? 'month' : 'months'} ago`;
    } else {
      const years = Math.floor(diff / intervals.year);
      return `${years} ${years === 1 ? 'year' : 'years'} ago`;
    }
  }
}

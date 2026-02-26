import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'timeFormat',
  standalone: true,
})
export class TimeFormatPipe implements PipeTransform {
  /**
   * Transform time string in HH:MM or HH:MM:SS format to h:MM AM/PM format
   * Example: "14:30" -> "2:30 PM", "09:00" -> "9:00 AM", "14:30:45" -> "2:30 PM"
   */
  transform(value: string | null | undefined): string {
    if (!value) return '';

    // Match HH:MM:SS or HH:MM format
    const match = value.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return value; // Return original if not in expected format

    const hours = parseInt(match[1], 10);
    const minutes = match[2];

    // Validate time range (hours 0-23, minutes 0-59)
    if (hours > 23 || parseInt(minutes, 10) > 59) {
      return value; // Return original if invalid time
    }

    // Convert to 12-hour format
    const isPM = hours >= 12;
    let displayHours = hours % 12;
    if (displayHours === 0) {
      displayHours = 12;
    }

    const period = isPM ? 'PM' : 'AM';
    return `${displayHours}:${minutes} ${period}`;
  }
}

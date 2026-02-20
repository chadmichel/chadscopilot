import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'numbercleanup',
  standalone: true,
})
export class NumberCleanup implements PipeTransform {
  transform(value: number | string): number {
    if (!value) return 0;

    // Convert value to a number if it's a string
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    return Math.trunc(numValue);
  }
}

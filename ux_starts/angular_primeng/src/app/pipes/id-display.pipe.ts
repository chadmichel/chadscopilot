import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'idDisplay',
  standalone: true, // This is crucial
})
export class IdDisplayPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';

    const parts = value.split('-');
    if (parts.length > 0) {
      return parts[0];
    }
    return value;
  }
}

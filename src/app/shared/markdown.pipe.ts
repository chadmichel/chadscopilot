import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true,
})
export class MarkdownPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  transform(value: string, hideCodeBlocks: boolean = false): SafeHtml {
    if (!value) return '';
    let processed = value;
    if (hideCodeBlocks) {
      // Very simple regex to hide JSON code blocks specifically or all code blocks
      processed = value.replace(/```json[\s\S]*?```/g, '');
      processed = processed.trim();
    }
    const html = marked.parse(processed, { async: false }) as string;
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}

import {
  Component,
  Input,
  ViewChild,
  ElementRef,
  AfterViewInit,
  AfterViewChecked,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from './chat.service';
import { MarkdownPipe } from '../shared/markdown.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.css',
})
export class ChatComponent implements AfterViewInit, AfterViewChecked {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  @ViewChild('chatInput') private chatInput!: ElementRef<HTMLTextAreaElement>;
  @Input() workspaceId: string = 'global';
  @Input() folderPath: string = '';
  @Input() contextProvider: (() => string) | null = null;
  @Input() hideJson: boolean = false;

  userInput = '';
  isLoading = false;

  constructor(public chatService: ChatService) { }

  ngAfterViewInit(): void {
    this.adjustTextareaHeight();
  }

  ngAfterViewChecked(): void {
    this.scrollToBottom();
  }

  async sendMessage(): Promise<void> {
    const message = this.userInput.trim();
    if (!message || this.isLoading) return;

    this.userInput = '';
    setTimeout(() => this.adjustTextareaHeight());
    this.isLoading = true;

    try {
      let fullMessage = message;
      if (this.contextProvider) {
        const context = this.contextProvider();
        if (context) {
          fullMessage = `${context}\n\nUser request: ${message}`;
        }
      }
      await this.chatService.sendMessage(fullMessage, this.workspaceId, this.folderPath || undefined, message);
    } finally {
      this.isLoading = false;
    }
  }

  async uploadFile(): Promise<void> {
    if (this.isLoading) return;

    const filters = [
      { name: 'Projects', extensions: ['json', 'csv', 'xlsx', 'txt', 'mpp', 'pdf', 'docx', 'xml'] },
      { name: 'All Files', extensions: ['*'] }
    ];

    const filePath = await this.chatService.selectFile(filters);
    if (!filePath) return;

    this.isLoading = true;
    try {
      let finalFilePath = filePath;
      let displayMessage = `Attached file: ${filePath.split(/[\\/]/).pop()}`;

      if (filePath.toLowerCase().endsWith('.mpp')) {
        const result = await this.chatService.convertMppToXml(filePath);
        if (result.success && result.xmlPath) {
          finalFilePath = result.xmlPath;
          displayMessage = `Attached MS Project file: ${filePath.split(/[\\/]/).pop()} (transpiled to XML)`;
        } else {
          throw new Error('Failed to convert MPP file: ' + (result.error || 'Unknown error'));
        }
      }

      const content = await this.chatService.readFile(finalFilePath);
      if (content === null) {
        throw new Error('Could not read file');
      }

      const fileName = filePath.split(/[\\/]/).pop();
      let context = '';
      if (this.contextProvider) {
        context = this.contextProvider() + '\n\n';
      }

      const prompt = `${context}The user has uploaded a file named "${fileName}". 
Here is its content (XML/Text):
---
${content.substring(0, 100000)} ${content.length > 100000 ? '...[truncated due to size]' : ''}
---
Please analyze this file and help me update the project plan based on it. If it's a project file, extract activities, resources, and dates.`;

      await this.chatService.sendMessage(prompt, this.workspaceId, this.folderPath || undefined, displayMessage);
    } catch (err: any) {
      alert(`Error uploading file: ${err.message}`);
    } finally {
      this.isLoading = false;
    }
  }

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  adjustTextareaHeight(): void {
    const textarea = this.chatInput.nativeElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  private scrollToBottom(): void {
    try {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch {
      // element not ready
    }
  }
}

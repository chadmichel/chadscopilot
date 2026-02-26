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

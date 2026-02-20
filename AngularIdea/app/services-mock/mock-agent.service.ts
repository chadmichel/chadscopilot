import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject, Subject } from 'rxjs';
import { delay } from 'rxjs/operators';
import {
  AgentConversationDto,
  AgentChatResponse,
  AgentCapabilities,
  CreateConversationResponse,
  AgentMessage,
} from '../dto/agent.dto';
import { QueryResult } from '../components/common-dto/query.dto';

@Injectable({
  providedIn: 'root',
})
export class MockAgentService {
  private mockConversations: Map<string, AgentConversationDto> = new Map();
  private conversationIdCounter = 1;

  // WebSocket state (mock)
  private isConnectedSubject = new BehaviorSubject<boolean>(true);
  private streamingTextSubject = new BehaviorSubject<string>('');
  private isStreamingSubject = new BehaviorSubject<boolean>(false);
  private currentToolSubject = new BehaviorSubject<string | null>(null);
  private errorSubject = new Subject<string>();
  private conversationCreatedSubject = new Subject<{
    conversationId: string;
    title: string;
  }>();
  private chatCompleteSubject = new Subject<{
    conversationId: string;
    message: string;
    toolsUsed: string[];
  }>();

  // Public observables
  isConnected$ = this.isConnectedSubject.asObservable();
  streamingText$ = this.streamingTextSubject.asObservable();
  isStreaming$ = this.isStreamingSubject.asObservable();
  currentTool$ = this.currentToolSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  conversationCreated$ = this.conversationCreatedSubject.asObservable();
  chatComplete$ = this.chatCompleteSubject.asObservable();

  constructor() {
    // Initialize with some mock conversations
    this.initializeMockData();
  }

  private initializeMockData(): void {
    const mockConv1: AgentConversationDto = {
      id: 'conv-1',
      title: 'Getting started with members',
      status: 'active',
      messages: [
        {
          role: 'user',
          content: 'How many contacts do we have?',
          timestamp: new Date('2024-01-15T10:00:00'),
        },
        {
          role: 'assistant',
          content: 'You currently have 156 contacts in the system.',
          timestamp: new Date('2024-01-15T10:00:05'),
          toolsUsed: ['get_contact_count'],
        },
      ],
      messageCount: 2,
      lastMessageAt: new Date('2024-01-15T10:00:05'),
      createdAt: new Date('2024-01-15T10:00:00'),
      updatedAt: new Date('2024-01-15T10:00:05'),
    };

    const mockConv2: AgentConversationDto = {
      id: 'conv-2',
      title: 'Event planning help',
      status: 'active',
      messages: [
        {
          role: 'user',
          content: 'What events do we have coming up?',
          timestamp: new Date('2024-01-14T14:00:00'),
        },
        {
          role: 'assistant',
          content:
            'You have 3 events scheduled in the next 7 days:\n1. Weekly Team Meeting - Tomorrow at 10:00 AM\n2. Member Orientation - Friday at 2:00 PM\n3. Annual Gala - Saturday at 6:00 PM',
          timestamp: new Date('2024-01-14T14:00:10'),
          toolsUsed: ['get_upcoming_events'],
        },
      ],
      messageCount: 2,
      lastMessageAt: new Date('2024-01-14T14:00:10'),
      createdAt: new Date('2024-01-14T14:00:00'),
      updatedAt: new Date('2024-01-14T14:00:10'),
    };

    this.mockConversations.set('conv-1', mockConv1);
    this.mockConversations.set('conv-2', mockConv2);
  }

  getConversations(): Observable<QueryResult<AgentConversationDto>> {
    const items = Array.from(this.mockConversations.values()).map((conv) => ({
      id: conv.id!,
      item: conv,
    }));

    return of({
      items,
      total: items.length,
      skip: 0,
      take: 100,
    }).pipe(delay(300));
  }

  getConversation(id: string): Observable<AgentConversationDto> {
    const conv = this.mockConversations.get(id);
    if (conv) {
      return of(conv).pipe(delay(200));
    }
    throw new Error('Conversation not found');
  }

  getConversationMessages(conversationId: string): Observable<AgentMessage[]> {
    const conv = this.mockConversations.get(conversationId);
    return of(conv?.messages || []).pipe(delay(200));
  }

  createConversation(title?: string): Observable<CreateConversationResponse> {
    const id = `conv-${++this.conversationIdCounter}`;
    const newConv: AgentConversationDto = {
      id,
      title: title || 'New Conversation',
      status: 'active',
      messages: [],
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockConversations.set(id, newConv);

    return of({ conversation: newConv }).pipe(delay(300));
  }

  chat(conversationId: string, message: string): Observable<AgentChatResponse> {
    const conv = this.mockConversations.get(conversationId);
    if (!conv) {
      throw new Error('Conversation not found');
    }

    // Add user message
    conv.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // Generate mock response
    const mockResponse = this.generateMockResponse(message);

    // Add assistant message
    conv.messages.push({
      role: 'assistant',
      content: mockResponse.message,
      timestamp: new Date(),
      toolsUsed: mockResponse.toolsUsed,
    });

    conv.messageCount = conv.messages.length;
    conv.lastMessageAt = new Date();
    conv.updatedAt = new Date();

    // Update title if it's the first message
    if (conv.messages.length === 2 && conv.title === 'New Conversation') {
      conv.title = message.substring(0, 50) + (message.length > 50 ? '...' : '');
    }

    return of({
      message: mockResponse.message,
      conversationId,
      toolsUsed: mockResponse.toolsUsed,
    }).pipe(delay(1000));
  }

  quickChat(message: string): Observable<AgentChatResponse> {
    const id = `conv-${++this.conversationIdCounter}`;
    const mockResponse = this.generateMockResponse(message);

    const newConv: AgentConversationDto = {
      id,
      title: message.substring(0, 50) + (message.length > 50 ? '...' : ''),
      status: 'active',
      messages: [
        {
          role: 'user',
          content: message,
          timestamp: new Date(),
        },
        {
          role: 'assistant',
          content: mockResponse.message,
          timestamp: new Date(),
          toolsUsed: mockResponse.toolsUsed,
        },
      ],
      messageCount: 2,
      lastMessageAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockConversations.set(id, newConv);

    return of({
      message: mockResponse.message,
      conversationId: id,
      toolsUsed: mockResponse.toolsUsed,
    }).pipe(delay(1000));
  }

  archiveConversation(id: string): Observable<void> {
    const conv = this.mockConversations.get(id);
    if (conv) {
      conv.status = 'archived';
    }
    return of(undefined).pipe(delay(200));
  }

  deleteConversation(id: string): Observable<void> {
    this.mockConversations.delete(id);
    return of(undefined).pipe(delay(200));
  }

  getCapabilities(): Observable<AgentCapabilities> {
    return of({
      tools: [
        { name: 'search_contacts', description: 'Search contacts by name, email, or phone' },
        { name: 'get_contact', description: 'Get detailed contact information' },
        { name: 'create_contact', description: 'Create a new contact' },
        { name: 'get_upcoming_events', description: 'Get events in the next N days' },
        { name: 'send_message', description: 'Send a message to a contact' },
      ],
      model: 'claude-sonnet-4-20250514',
    }).pipe(delay(200));
  }

  private generateMockResponse(message: string): {
    message: string;
    toolsUsed: string[];
  } {
    const lowerMessage = message.toLowerCase();

    if (lowerMessage.includes('contact') && lowerMessage.includes('how many')) {
      return {
        message: 'You currently have 156 contacts in the system.',
        toolsUsed: ['get_contact_count'],
      };
    }

    if (lowerMessage.includes('event') && lowerMessage.includes('upcoming')) {
      return {
        message:
          'You have 3 events scheduled in the next 7 days:\n1. Weekly Team Meeting - Tomorrow at 10:00 AM\n2. Member Orientation - Friday at 2:00 PM\n3. Annual Gala - Saturday at 6:00 PM',
        toolsUsed: ['get_upcoming_events'],
      };
    }

    if (lowerMessage.includes('search') && lowerMessage.includes('contact')) {
      return {
        message:
          "I found 5 contacts matching your search:\n1. John Smith (john@example.com)\n2. Jane Doe (jane@example.com)\n3. Bob Johnson (bob@example.com)",
        toolsUsed: ['search_contacts'],
      };
    }

    if (lowerMessage.includes('create') && lowerMessage.includes('contact')) {
      return {
        message:
          "I've created a new contact with the information you provided. The contact ID is abc123.",
        toolsUsed: ['create_contact'],
      };
    }

    if (lowerMessage.includes('send') && lowerMessage.includes('message')) {
      return {
        message: "I've sent the message to the specified contact(s).",
        toolsUsed: ['send_message'],
      };
    }

    // Default response
    return {
      message: `I understand you're asking about "${message.substring(0, 50)}". I'm a mock agent, so I can simulate responses for common queries about contacts, events, and messages. Try asking me things like:\n\n- "How many contacts do we have?"\n- "What upcoming events do we have?"\n- "Search for contacts named John"\n- "Create a contact for Jane Doe"`,
      toolsUsed: [],
    };
  }

  // WebSocket mock methods
  connectWebSocket(): void {
    this.isConnectedSubject.next(true);
  }

  startConversationWs(title?: string): void {
    const id = `conv-${++this.conversationIdCounter}`;
    const newConv: AgentConversationDto = {
      id,
      title: title || 'New Conversation',
      status: 'active',
      messages: [],
      messageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.mockConversations.set(id, newConv);
    this.conversationCreatedSubject.next({ conversationId: id, title: newConv.title });
  }

  chatWs(conversationId: string, message: string): void {
    const conv = this.mockConversations.get(conversationId);
    if (!conv) {
      this.errorSubject.next('Conversation not found');
      return;
    }

    // Add user message
    conv.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    this.isStreamingSubject.next(true);
    this.streamingTextSubject.next('');

    // Simulate streaming response
    const mockResponse = this.generateMockResponse(message);
    const tokens = mockResponse.message.split(' ');
    let currentIndex = 0;

    const streamInterval = setInterval(() => {
      if (currentIndex < tokens.length) {
        const currentText = this.streamingTextSubject.value;
        this.streamingTextSubject.next(
          currentText + (currentIndex > 0 ? ' ' : '') + tokens[currentIndex]
        );
        currentIndex++;
      } else {
        clearInterval(streamInterval);
        this.isStreamingSubject.next(false);

        // Add assistant message
        conv.messages.push({
          role: 'assistant',
          content: mockResponse.message,
          timestamp: new Date(),
          toolsUsed: mockResponse.toolsUsed,
        });

        conv.messageCount = conv.messages.length;
        conv.lastMessageAt = new Date();

        this.chatCompleteSubject.next({
          conversationId,
          message: mockResponse.message,
          toolsUsed: mockResponse.toolsUsed,
        });
      }
    }, 50);
  }

  getHistoryWs(conversationId: string): void {
    // Mock implementation - would emit history event
  }

  disconnectWebSocket(): void {
    this.isConnectedSubject.next(false);
  }

  isWebSocketConnected(): boolean {
    return this.isConnectedSubject.value;
  }

  resetStreamingText(): void {
    this.streamingTextSubject.next('');
  }

  ngOnDestroy(): void {
    this.disconnectWebSocket();
  }
}


import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ItemListComponent } from '../../components/item-list/item-list.component';
import { ItemListConfig } from '../../components/item-list/item-list.types';
import { AgentService } from '../../services/agent.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-agent-list',
  standalone: true,
  imports: [CommonModule, ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class AgentListComponent {
  listConfig: ItemListConfig = {
    header: 'Agent Conversations',
    supportsAdd: true,
    supportsEdit: true,
    supportsDelete: true,
    defaultSortField: 'lastMessageAt',
    enableSearch: true,
    columns: [
      {
        field: 'title',
        header: 'Title',
        type: 'text',
        sortable: true,
      },
      {
        field: 'messageCount',
        header: 'Messages',
        type: 'number',
        sortable: true,
        mobileHide: true,
      },
      {
        field: 'status',
        header: 'Status',
        type: 'text',
        sortable: true,
        mobileHide: true,
      },
      {
        field: 'lastMessageAt',
        header: 'Last Activity',
        type: 'date',
        format: 'short',
        sortable: true,
      },
      {
        field: 'createdAt',
        header: 'Created',
        type: 'date',
        format: 'short',
        sortable: true,
        mobileHide: true,
      },
    ],
    dataService: {
      parseParams: (params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
      }),
      loadItems: (params) => this.agentService.getConversations(),
      deleteItem: (params, item) =>
        this.agentService.deleteConversation(item.id),
    },
    onEdit: (item) => {
      this.router.navigate(['/', 'agent', item.id]);
    },
    onAdd: () => {
      this.createNewConversation();
    },
  };

  constructor(
    private agentService: AgentService,
    private authService: AuthService,
    private router: Router
  ) {}

  private createNewConversation(): void {
    this.agentService.createConversation().subscribe({
      next: (response: any) => {
        // Handle both wrapped and unwrapped response formats
        const conversation = response.conversation || response;
        const conversationId = conversation.id || conversation.conversationId;
        if (conversationId) {
          this.router.navigate(['/', 'agent', conversationId]);
        } else {
          console.error('No conversation ID in response:', response);
        }
      },
      error: (err) => {
        console.error('Failed to create conversation:', err);
      },
    });
  }
}


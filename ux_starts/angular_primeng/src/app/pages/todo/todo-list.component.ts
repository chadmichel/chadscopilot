import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ItemListComponent } from '../../components/item-list/item-list.component';
import { ItemListConfig } from '../../components/item-list/item-list.types';
import { TodoService } from '../../services/todo.service';

@Component({
  selector: 'app-todo-list',
  standalone: true,
  imports: [ItemListComponent],
  template: `<pb-item-list [config]="listConfig"></pb-item-list>`,
})
export class TodoListComponent {
  listConfig: ItemListConfig = {
    header: 'Todo List',
    supportsAdd: true,
    supportsEdit: false,
    supportsDelete: true,
    enableSearch: true,
    columns: [
      { field: 'title', header: 'Title', type: 'text', sortable: true },
      { field: 'completedLabel', header: 'Done', type: 'text', sortable: true },
      { field: 'createdAt', header: 'Created', type: 'date', format: 'shortDate', sortable: true, mobileHide: true },
    ],
    dataService: {
      parseParams: (_params, queryParams) => ({
        skip: queryParams['skip'] || 0,
        take: queryParams['take'] || 10,
        filter: queryParams['filter'] || '',
      }),
      loadItems: (params) => this.todoService.getTodos(params),
      deleteItem: (_params, item) => this.todoService.deleteTodo(item.id),
    },
    onAdd: async () => {
      const title = window.prompt('New todo');
      if (!title?.trim()) return;
      await firstValueFrom(this.todoService.createTodo(title.trim()));
      this.refresh();
    },
    onRowClick: async (item) => {
      await firstValueFrom(this.todoService.toggleTodo(item.id));
      this.refresh();
    },
    customToolbarItems: [
      {
        label: 'Clear completed',
        icon: 'pi-trash',
        onClick: async () => {
          await firstValueFrom(this.todoService.clearCompleted());
          this.refresh();
        },
        styleClass: 'p-button-outlined',
      },
      {
        label: 'Seed sample',
        icon: 'pi-plus',
        onClick: async () => {
          await firstValueFrom(this.todoService.seedSampleTodos());
          this.refresh();
        },
        styleClass: 'p-button-text',
      },
    ],
  };

  constructor(
    private todoService: TodoService,
    private router: Router,
    private route: ActivatedRoute,
  ) {}

  private refresh() {
    // ItemListComponent reloads when query params change.
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { _r: Date.now() },
      queryParamsHandling: 'merge',
    });
  }
}


import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TodoDto } from '../dto/todo.dto';
import { ProcessResult, QueryOptions, QueryResult } from '../components/common-dto/query.dto';

type StoredTodo = { id: string; item: TodoDto };

@Injectable({
  providedIn: 'root',
})
export class TodoService {
  private readonly STORAGE_KEY = 'todos';

  getTodos(query: QueryOptions): Observable<QueryResult<any>> {
    const skip = Number(query.skip ?? 0);
    const take = Number(query.take ?? 10);
    const filter = (query.filter ?? '').toString().trim().toLowerCase();

    const all = this.readAll()
      .slice()
      .sort((a, b) => (b.item.createdAt || '').localeCompare(a.item.createdAt || ''));

    const filtered = filter
      ? all.filter((t) => t.item.title.toLowerCase().includes(filter))
      : all;

    const page = filtered.slice(skip, skip + take).map((t) => ({
      id: t.id,
      item: {
        ...t.item,
        completedLabel: t.item.completed ? 'Yes' : 'No',
      },
    }));

    return of({
      items: page,
      total: filtered.length,
      skip,
      take,
    });
  }

  createTodo(title: string): Observable<ProcessResult> {
    const trimmed = title.trim();
    if (!trimmed) {
      return of({ id: '', success: false, message: 'Title is required' });
    }

    const now = new Date().toISOString();
    const id = this.newId();
    const todo: StoredTodo = {
      id,
      item: {
        title: trimmed,
        completed: false,
        createdAt: now,
        updatedAt: now,
      },
    };

    const todos = this.readAll();
    todos.unshift(todo);
    this.writeAll(todos);

    return of({ id, success: true, message: 'Todo created' });
  }

  toggleTodo(id: string): Observable<ProcessResult> {
    const todos = this.readAll();
    const idx = todos.findIndex((t) => t.id === id);
    if (idx < 0) return of({ id, success: false, message: 'Todo not found' });

    const now = new Date().toISOString();
    const current = todos[idx];
    todos[idx] = {
      ...current,
      item: {
        ...current.item,
        completed: !current.item.completed,
        updatedAt: now,
      },
    };
    this.writeAll(todos);

    return of({ id, success: true, message: 'Todo updated' });
  }

  deleteTodo(id: string): Observable<ProcessResult> {
    const todos = this.readAll();
    const next = todos.filter((t) => t.id !== id);
    this.writeAll(next);
    return of({ id, success: true, message: 'Todo deleted' });
  }

  clearCompleted(): Observable<ProcessResult> {
    const todos = this.readAll();
    const next = todos.filter((t) => !t.item.completed);
    this.writeAll(next);
    return of({ id: '', success: true, message: 'Completed todos cleared' });
  }

  seedSampleTodos(): Observable<ProcessResult> {
    const existing = this.readAll();
    if (existing.length > 0) {
      return of({ id: '', success: true, message: 'Todos already exist' });
    }

    const now = Date.now();
    const samples = ['Review base components', 'Wire up Todo list', 'Pick a theme'].map(
      (title, i): StoredTodo => ({
        id: this.newId(),
        item: {
          title,
          completed: false,
          createdAt: new Date(now - i * 60_000).toISOString(),
          updatedAt: new Date(now - i * 60_000).toISOString(),
        },
      }),
    );

    this.writeAll(samples);
    return of({ id: '', success: true, message: 'Sample todos created' });
  }

  private readAll(): StoredTodo[] {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as StoredTodo[]) : [];
    } catch {
      return [];
    }
  }

  private writeAll(todos: StoredTodo[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(todos));
  }

  private newId(): string {
    // crypto.randomUUID is supported in modern browsers.
    const anyCrypto = globalThis.crypto as any;
    if (anyCrypto?.randomUUID) return anyCrypto.randomUUID();
    return `todo_${Math.random().toString(16).slice(2)}_${Date.now()}`;
  }
}


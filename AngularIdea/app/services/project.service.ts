import { Injectable } from '@angular/core';
import { Observable, map, of } from 'rxjs';
import { QueryOptions, QueryResult } from '../components/common-dto/query.dto';
import { ProjectDto } from '../dto/project.dto';
import { applyQueryOptions } from '../utilities/apply-query.utility';
import { ProcessResult, QueryResultItem } from '../components/common-dto/query.dto';
import { LocalStoreService } from './local-store.service';

@Injectable({
  providedIn: 'root',
})
export class ProjectService {
  constructor(private store: LocalStoreService) {}

  getProjects(queryParams: QueryOptions): Observable<QueryResult<ProjectDto>> {
    this.store.ensureSeeded();
    const snap =
      this.store.getProjectsSnapshot() ||
      ({
        items: [],
        total: 0,
        take: 200,
        skip: 0,
      } satisfies QueryResult<ProjectDto>);
    return of(applyQueryOptions(snap, queryParams));
  }

  getProject(id: string): Observable<ProjectDto> {
    this.store.ensureSeeded();
    const snap = this.store.getProjectsSnapshot();
    const found = snap?.items?.find((it) => it.id === id);
    if (found) {
      return of({ id: found.id, ...(found.item as any) } as any);
    }
    return of({ id, name: id, status: 'backlog' } as any);
  }

  createProject(project: Partial<ProjectDto>): Observable<ProcessResult> {
    this.store.ensureSeeded();

    const id = this.store.generateId('project');
    const now = new Date().toISOString();
    const dto: ProjectDto = {
      name: project.name || 'New Project',
      key: project.key,
      description: project.description,
      status: (project.status as any) || 'backlog',
      createdAt: now,
      updatedAt: now,
    };

    this.upsertProjectInCache(id, dto);
    this.safeSetLastProjectId(id);
    return of({ success: true, id, message: 'Saved locally' });
  }

  updateProject(id: string, project: Partial<ProjectDto>): Observable<ProcessResult> {
    this.store.ensureSeeded();
    const snap = this.store.getProjectsSnapshot();
    const existing = snap?.items?.find((it) => it.id === id)?.item as any;
    const now = new Date().toISOString();
    const dto: ProjectDto = {
      ...(existing || {}),
      ...(project as any),
      updatedAt: now,
    };

    this.upsertProjectInCache(id, dto);
    this.safeSetLastProjectId(id);
    return of({ success: true, id, message: 'Saved locally' });
  }

  deleteProject(id: string): Observable<ProcessResult> {
    this.store.removeFromCollection(this.store.projectsKey, id);
    return of({ success: true, id, message: 'Deleted locally' });
  }

  private upsertProjectInCache(id: string, project: ProjectDto): void {
    this.store.upsertIntoCollection(this.store.projectsKey, id, project);
  }

  private safeSetLastProjectId(id: string): void {
    try {
      localStorage.setItem('whenisdone_last_project_id', id);
    } catch {
      // ignore
    }
  }

  // IDs are generated client-side via LocalStoreService
}


import { inject } from '@angular/core';
import { Routes, ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { ChatComponent } from './chat/chat.component';
import { TasksComponent } from './pages/tasks.component';
import { WorkspacesComponent } from './pages/workspaces.component';
import { WorkspaceDetailComponent } from './pages/workspace-detail.component';
import { CalendarComponent } from './pages/calendar.component';
import { ToolsComponent } from './pages/tools.component';
import { ToolConfigureComponent } from './pages/tool-configure.component';
import { PreferencesComponent } from './pages/preferences.component';
import { MermaidBuilderComponent } from './pages/mermaid-builder.component';
import { PlanEditorComponent } from './pages/plan-editor.component';
import { WorkProcessRunnerComponent } from './pages/work-process-runner.component';
import { UXDesignRunnerComponent } from './pages/ux-design-runner.component';
import { WorkspaceService } from './services/workspace.service';

export const workspaceTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) => {
  const id = route.paramMap.get('id');
  const workspaceService = inject(WorkspaceService);
  const workspace = workspaceService.getWorkspace(id!);
  if (workspace) {
    return `Workspaces | ${workspace.name}`;
  }
  return 'Workspace Detail';
};

export const routes: Routes = [
  { path: '', redirectTo: 'agent', pathMatch: 'full' },
  { path: 'agent', component: ChatComponent, title: 'Agent' },
  { path: 'tasks', component: TasksComponent, title: 'Tasks' },
  { path: 'workspaces', component: WorkspacesComponent, title: 'Workspaces' },
  { path: 'workspaces/:id', component: WorkspaceDetailComponent, title: workspaceTitleResolver },
  { path: 'calendar', component: CalendarComponent, title: 'Calendar' },
  { path: 'tools', component: ToolsComponent, title: 'Tools' },
  { path: 'tools/:id', component: ToolConfigureComponent, title: 'Configure Tool' },
  { path: 'preferences', component: PreferencesComponent, title: 'Preferences' },
  { path: 'mermaid-builder', component: MermaidBuilderComponent, title: 'Mermaid Builder' },
  { path: 'plan-editor', component: PlanEditorComponent, title: 'Plan Editor' },
  { path: 'work-process-runner', component: WorkProcessRunnerComponent, title: 'Work Process Runner' },
  { path: 'ux-design-runner', component: UXDesignRunnerComponent, title: 'UX Design Runner' },
];

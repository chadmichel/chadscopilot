import { Routes } from '@angular/router';
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

export const routes: Routes = [
  { path: '', redirectTo: 'agent', pathMatch: 'full' },
  { path: 'agent', component: ChatComponent },
  { path: 'tasks', component: TasksComponent },
  { path: 'workspaces', component: WorkspacesComponent },
  { path: 'workspaces/:id', component: WorkspaceDetailComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'tools', component: ToolsComponent },
  { path: 'tools/:id', component: ToolConfigureComponent },
  { path: 'preferences', component: PreferencesComponent },
  { path: 'mermaid-builder', component: MermaidBuilderComponent },
  { path: 'plan-editor', component: PlanEditorComponent },
];

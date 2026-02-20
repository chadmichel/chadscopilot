import { Routes } from '@angular/router';
import { ChatComponent } from './chat/chat.component';
import { TasksComponent } from './pages/tasks.component';
import { ProjectsComponent } from './pages/projects.component';
import { ProjectDetailComponent } from './pages/project-detail.component';
import { CalendarComponent } from './pages/calendar.component';
import { ToolsComponent } from './pages/tools.component';
import { PreferencesComponent } from './pages/preferences.component';

export const routes: Routes = [
  { path: '', redirectTo: 'agent', pathMatch: 'full' },
  { path: 'agent', component: ChatComponent },
  { path: 'tasks', component: TasksComponent },
  { path: 'projects', component: ProjectsComponent },
  { path: 'projects/:id', component: ProjectDetailComponent },
  { path: 'calendar', component: CalendarComponent },
  { path: 'tools', component: ToolsComponent },
  { path: 'preferences', component: PreferencesComponent },
];

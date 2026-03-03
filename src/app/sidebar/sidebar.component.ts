import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { WorkspaceService } from '../services/workspace.service';
import { map } from 'rxjs';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.css',
})
export class SidebarComponent {
  private workspaceService = inject(WorkspaceService);
  collapsed = false;

  sections$ = this.workspaceService.lastWorkspaceId$.pipe(
    map(lastWorkspaceId => [
      {
        title: 'Main',
        items: [
          { label: 'Agent', route: '/agent', icon: 'agent' },
          { label: 'Tasks', route: '/tasks', icon: 'tasks' },
          {
            label: 'Workspaces',
            route: lastWorkspaceId ? `/workspaces/${lastWorkspaceId}` : '/workspaces',
            icon: 'workspaces',
          },
          { label: 'Calendar', route: '/calendar', icon: 'calendar' },
          { label: 'Time', route: '/time', icon: 'time' },
        ],
      },
      {
        title: 'Settings',
        items: [
          { label: 'Tools', route: '/tools', icon: 'tools' },
          { label: 'Preferences', route: '/preferences', icon: 'preferences' },
          { label: 'Backup / Restore', route: '/backup', icon: 'backup' },
        ],
      },
    ])
  );

  toggle(): void {
    this.collapsed = !this.collapsed;
  }
}

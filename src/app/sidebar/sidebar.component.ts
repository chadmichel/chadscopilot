import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

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
  collapsed = false;

  get sections(): NavSection[] {
    const lastProjectId = localStorage.getItem('chadscopilot_last_project_id');
    return [
      {
        title: 'Main',
        items: [
          { label: 'Agent', route: '/agent', icon: 'agent' },
          { label: 'Tasks', route: '/tasks', icon: 'tasks' },
          {
            label: 'Projects',
            route: lastProjectId ? `/projects/${lastProjectId}` : '/projects',
            icon: 'projects',
          },
          { label: 'Calendar', route: '/calendar', icon: 'calendar' },
        ],
      },
      {
        title: 'Settings',
        items: [
          { label: 'Tools', route: '/tools', icon: 'tools' },
          { label: 'Preferences', route: '/preferences', icon: 'preferences' },
        ],
      },
    ];
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
  }
}

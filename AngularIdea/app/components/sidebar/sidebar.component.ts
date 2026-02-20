import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { RippleModule } from 'primeng/ripple';
import { filter } from 'rxjs/operators';

export interface SidebarMenuItem {
  label: string;
  icon: string;
  routerLink?: string[];
  command?: () => void;
  badge?: string;
  badgeClass?: string;
}

export interface SidebarMenuSection {
  title: string;
  items: SidebarMenuItem[];
}

export interface SidebarUserInfo {
  name: string;
  role: string;
  initials: string;
  avatarUrl?: string;
}

export type SidebarSyncState = 'ok' | 'pending' | 'syncing' | 'offline' | 'error' | 'mock';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    TooltipModule,
    AvatarModule,
    RippleModule,
  ],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <!-- Logo Section -->
      <div class="sidebar-logo">
        <!-- When expanded: non-interactive logo -->
        <div class="logo-container" *ngIf="!collapsed">
          <div class="logo-icon">
            <i class="pi pi-check-square"></i>
          </div>
          <div class="logo-text">
            <span class="logo-title">WhenIsDone</span>
            <span class="logo-subtitle">Tasks</span>
          </div>
        </div>
        
        <!-- When collapsed: clickable logo button to expand -->
        <button 
          *ngIf="collapsed"
          class="logo-expand-btn"
          (click)="toggleCollapse()"
          pTooltip="Expand sidebar"
          tooltipPosition="right"
        >
          <div class="logo-icon">
            <i class="pi pi-check-square"></i>
          </div>
        </button>

        <!-- Collapse button (only when expanded) -->
        <button 
          *ngIf="!collapsed"
          class="collapse-btn"
          (click)="toggleCollapse()"
          pTooltip="Collapse"
          tooltipPosition="right"
        >
          <i class="pi pi-angle-left"></i>
        </button>
      </div>

      <!-- Navigation Sections -->
      <nav class="sidebar-nav">
        <div *ngFor="let section of menuSections" class="nav-section">
          <div class="section-title" *ngIf="!collapsed">{{ section.title }}</div>
          <div class="section-divider" *ngIf="collapsed"></div>
          
          <ul class="nav-list">
            <li *ngFor="let item of section.items" class="nav-item">
              <a
                *ngIf="item.routerLink"
                [routerLink]="item.routerLink"
                routerLinkActive="active"
                [routerLinkActiveOptions]="{ exact: item.routerLink[0] === '/home' || item.routerLink[0] === '/' }"
                class="nav-link"
                pRipple
                [pTooltip]="collapsed ? item.label : ''"
                tooltipPosition="right"
              >
                <i class="nav-icon pi {{ item.icon }}"></i>
                <span class="nav-label" *ngIf="!collapsed">{{ item.label }}</span>
                <span *ngIf="item.badge && !collapsed" class="nav-badge" [ngClass]="item.badgeClass || 'badge-default'">
                  {{ item.badge }}
                </span>
              </a>
              <button
                *ngIf="!item.routerLink && item.command"
                class="nav-link nav-button"
                (click)="item.command()"
                pRipple
                [pTooltip]="collapsed ? item.label : ''"
                tooltipPosition="right"
              >
                <i class="nav-icon pi {{ item.icon }}"></i>
                <span class="nav-label" *ngIf="!collapsed">{{ item.label }}</span>
              </button>
            </li>
          </ul>
        </div>
      </nav>

      <!-- User Profile Section -->
      <div class="sidebar-user" *ngIf="userInfo">
        <div class="user-container" (click)="onUserClick()">
          <p-avatar
            *ngIf="userInfo.avatarUrl"
            [image]="userInfo.avatarUrl"
            shape="circle"
            size="normal"
            styleClass="user-avatar"
          ></p-avatar>
          <p-avatar
            *ngIf="!userInfo.avatarUrl"
            [label]="userInfo.initials"
            shape="circle"
            size="normal"
            styleClass="user-avatar"
          ></p-avatar>
          <div class="user-info" *ngIf="!collapsed">
            <span class="user-name">{{ userInfo.name }}</span>
            <span class="user-role">{{ userInfo.role }}</span>
            <div
              class="sync-status"
              *ngIf="syncLabel"
              [ngClass]="'state-' + syncState"
            >
              <span class="sync-dot"></span>
              <span class="sync-text">{{ syncLabel }}</span>
            </div>
          </div>
          <i class="pi pi-ellipsis-v user-menu-icon" *ngIf="!collapsed"></i>
        </div>
      </div>
    </aside>
  `,
  styles: [`
    .sidebar {
      display: flex;
      flex-direction: column;
      width: 260px;
      height: 100vh;
      background: var(--sidebar-bg);
      color: #fff;
      position: fixed;
      left: 0;
      top: 0;
      z-index: 1000;
      transition: width 0.3s ease;
      overflow: hidden;
    }

    .sidebar.collapsed {
      width: 72px;
    }

    /* Logo Section */
    .sidebar-logo {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1.25rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      position: relative;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .logo-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      background: var(--sidebar-accent);
      border-radius: 10px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .logo-icon i {
      font-size: 1.25rem;
      color: var(--sidebar-accent-contrast);
    }

    .logo-expand-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      margin: 0 auto;
    }

    .logo-expand-btn:hover .logo-icon {
      transform: scale(1.08);
      box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.3);
    }

    .logo-expand-btn:focus {
      outline: none;
    }

    .logo-expand-btn:focus .logo-icon {
      box-shadow: 0 0 0 3px rgba(45, 212, 191, 0.4);
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .logo-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: #fff;
    }

    .logo-subtitle {
      font-size: 0.875rem;
      font-weight: 400;
      color: rgba(255, 255, 255, 0.7);
    }

    .collapse-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      border-radius: 6px;
      color: rgba(255, 255, 255, 0.7);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .collapse-btn:hover {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }


    /* Navigation */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      overflow-x: hidden;
      padding: 1rem 0;
    }

    .nav-section {
      margin-bottom: 1.5rem;
    }

    .section-title {
      padding: 0 1.25rem;
      margin-bottom: 0.5rem;
      font-size: 0.6875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: rgba(255, 255, 255, 0.5);
    }

    .section-divider {
      height: 1px;
      margin: 0.5rem 1rem;
      background: rgba(255, 255, 255, 0.1);
    }

    .nav-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .nav-item {
      padding: 0 0.75rem;
    }

    .nav-link {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.625rem 0.75rem;
      margin-bottom: 2px;
      border-radius: 8px;
      color: rgba(255, 255, 255, 0.75);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
    }

    .nav-link:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }

    .nav-link.active {
      background: rgba(45, 212, 191, 0.15);
      color: #2dd4bf;
    }

    .nav-link.active .nav-icon {
      color: #2dd4bf;
    }

    .nav-icon {
      font-size: 1.125rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
    }

    .nav-label {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-badge {
      margin-left: auto;
      padding: 0.125rem 0.5rem;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 4px;
    }

    .badge-default {
      background: rgba(255, 255, 255, 0.2);
      color: #fff;
    }

    .badge-success {
      background: #22c55e;
      color: #fff;
    }

    .badge-warning {
      background: #f59e0b;
      color: #fff;
    }

    .nav-button {
      font-family: inherit;
    }

    /* User Section */
    .sidebar-user {
      padding: 1rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
    }

    .user-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s ease;
    }

    .user-container:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    :host ::ng-deep .user-avatar {
      flex-shrink: 0;
      background: var(--sidebar-accent) !important;
      color: var(--sidebar-accent-contrast) !important;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-width: 0;
    }

    .user-name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.6);
    }

    .user-menu-icon {
      color: rgba(255, 255, 255, 0.5);
      font-size: 0.875rem;
    }

    /* Scrollbar styling */
    .sidebar-nav::-webkit-scrollbar {
      width: 4px;
    }

    .sidebar-nav::-webkit-scrollbar-track {
      background: transparent;
    }

    .sidebar-nav::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 2px;
    }

    .sidebar-nav::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    /* Collapsed state adjustments */
    .collapsed .sidebar-logo {
      justify-content: center;
      padding: 1.25rem 0.75rem;
    }

    .collapsed .nav-item {
      padding: 0 0.5rem;
    }

    .collapsed .nav-link {
      justify-content: center;
      padding: 0.75rem;
    }

    .collapsed .user-container {
      justify-content: center;
      padding: 0.5rem;
    }

    .sync-status {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-top: 0.35rem;
      font-size: 0.75rem;
      color: rgba(255, 255, 255, 0.75);
    }

    .sync-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.45);
      box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.18);
      flex: 0 0 auto;
    }

    .state-ok .sync-dot {
      background: #22c55e;
    }
    .state-pending .sync-dot {
      background: #f59e0b;
    }
    .state-syncing .sync-dot {
      background: #38bdf8;
      animation: pulseSync 1s ease-in-out infinite;
    }
    .state-offline .sync-dot {
      background: #94a3b8;
    }
    .state-error .sync-dot {
      background: #ef4444;
    }
    .state-mock .sync-dot {
      background: #a78bfa;
    }

    @keyframes pulseSync {
      0% {
        transform: scale(1);
        opacity: 0.9;
      }
      50% {
        transform: scale(1.25);
        opacity: 1;
      }
      100% {
        transform: scale(1);
        opacity: 0.9;
      }
    }
  `]
})
export class SidebarComponent {
  @Input() menuSections: SidebarMenuSection[] = [];
  @Input() userInfo: SidebarUserInfo | null = null;
  @Input() collapsed = false;
  @Input() syncLabel: string = '';
  @Input() syncState: SidebarSyncState = 'ok';
  
  @Output() collapsedChange = new EventEmitter<boolean>();
  @Output() userClicked = new EventEmitter<void>();

  constructor(private router: Router) {}

  toggleCollapse() {
    this.collapsed = !this.collapsed;
    this.collapsedChange.emit(this.collapsed);
  }

  onUserClick() {
    this.userClicked.emit();
  }
}


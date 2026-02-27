import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { RippleModule } from 'primeng/ripple';
import { filter } from 'rxjs/operators';
import { BabyIconComponent, BusIconComponent } from '../icons';

export interface SidebarMenuItem {
  label: string;
  icon: string;
  customIcon?: 'baby' | 'bus'; // Add support for custom SVG icons
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
    BabyIconComponent,
    BusIconComponent,
  ],
  template: `
    <aside class="sidebar" [class.collapsed]="collapsed">
      <!-- Logo Section -->
      <div class="sidebar-logo">
        <!-- When expanded: non-interactive logo -->
        <div class="logo-container" *ngIf="!collapsed">
          <div class="logo-icon">
            <i class="pi pi-book"></i>
          </div>
          <div class="logo-text">
            <span class="logo-title">Base</span>
            <span class="logo-subtitle">Starter</span>
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
            <i class="pi pi-book"></i>
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
                <app-baby-icon *ngIf="item.customIcon === 'baby'" class="nav-icon" size="20"></app-baby-icon>
                <app-bus-icon *ngIf="item.customIcon === 'bus'" class="nav-icon" size="20"></app-bus-icon>
                <i *ngIf="!item.customIcon" class="nav-icon pi {{ item.icon }}"></i>
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
                <app-baby-icon *ngIf="item.customIcon === 'baby'" class="nav-icon" size="20"></app-baby-icon>
                <app-bus-icon *ngIf="item.customIcon === 'bus'" class="nav-icon" size="20"></app-bus-icon>
                <i *ngIf="!item.customIcon" class="nav-icon pi {{ item.icon }}"></i>
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
      background: linear-gradient(
        180deg,
        var(--app-sidebar-bg-start, #0b1f3a) 0%,
        var(--app-sidebar-bg-end, #07162b) 100%
      );
      color: var(--app-sidebar-text, #ffffff);
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
      border-bottom: 1px solid var(--app-sidebar-border);
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
      background: var(--app-accent);
      border-radius: 10px;
      flex-shrink: 0;
      transition: all 0.2s ease;
    }

    .logo-icon i {
      font-size: 1.25rem;
      color: var(--app-accent-contrast);
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
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 30%, transparent);
    }

    .logo-expand-btn:focus {
      outline: none;
    }

    .logo-expand-btn:focus .logo-icon {
      box-shadow: 0 0 0 3px color-mix(in srgb, var(--app-accent) 40%, transparent);
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .logo-title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--app-sidebar-text);
    }

    .logo-subtitle {
      font-size: 0.875rem;
      font-weight: 400;
      color: var(--app-sidebar-muted);
    }

    .collapse-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      background: color-mix(in srgb, var(--app-sidebar-text) 10%, transparent);
      border: none;
      border-radius: 6px;
      color: var(--app-sidebar-muted);
      cursor: pointer;
      transition: all 0.2s ease;
      flex-shrink: 0;
    }

    .collapse-btn:hover {
      background: color-mix(in srgb, var(--app-sidebar-text) 20%, transparent);
      color: var(--app-sidebar-text);
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
      color: var(--app-sidebar-muted);
    }

    .section-divider {
      height: 1px;
      margin: 0.5rem 1rem;
      background: var(--app-sidebar-border);
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
      color: color-mix(in srgb, var(--app-sidebar-text) 75%, transparent);
      text-decoration: none;
      font-size: 0.9375rem;
      font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;
      border: none;
      background: transparent;
      width: 100%;
      text-align: left;
      position: relative;
      overflow: hidden;
    }

    /* colorful accent strip */
    .nav-link::before {
      content: '';
      position: absolute;
      left: 0;
      top: 8px;
      bottom: 8px;
      width: 3px;
      border-radius: 999px;
      background: linear-gradient(
        180deg,
        var(--app-accent),
        color-mix(in srgb, var(--app-accent) 45%, #ffffff)
      );
      opacity: 0;
      transform: translateX(-6px);
      transition: opacity 0.2s ease, transform 0.2s ease;
    }

    /* subtle colorful glow */
    .nav-link::after {
      content: '';
      position: absolute;
      inset: 0;
      background: radial-gradient(
        100% 120% at 0% 50%,
        color-mix(in srgb, var(--app-accent) 18%, transparent) 0%,
        transparent 55%
      );
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
    }

    .nav-link:hover {
      background: color-mix(in srgb, var(--app-sidebar-text) 8%, transparent);
      color: var(--app-sidebar-text);
    }

    .nav-link:hover::before {
      opacity: 0.9;
      transform: translateX(0);
    }

    .nav-link:hover::after {
      opacity: 1;
    }

    .nav-link.active {
      background: linear-gradient(
        90deg,
        color-mix(in srgb, var(--app-accent) 18%, transparent),
        color-mix(in srgb, var(--app-sidebar-text) 6%, transparent)
      );
      color: var(--app-sidebar-text);
      box-shadow:
        0 0 0 1px color-mix(in srgb, var(--app-accent) 25%, transparent),
        0 10px 24px -18px color-mix(in srgb, var(--app-accent) 45%, transparent);
    }

    .nav-link.active .nav-icon {
      color: var(--app-accent);
    }

    .nav-link.active::before {
      opacity: 1;
      transform: translateX(0);
    }

    .nav-link.active::after {
      opacity: 1;
    }

    .nav-icon {
      font-size: 1.125rem;
      width: 24px;
      text-align: center;
      flex-shrink: 0;
      position: relative;
    }

    /* colorful icon chip */
    .nav-link .nav-icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 10px;
      background: color-mix(in srgb, var(--app-accent) 12%, transparent);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 18%, transparent);
      transition: background 0.2s ease, box-shadow 0.2s ease, transform 0.2s ease;
    }

    .nav-link:hover .nav-icon {
      background: color-mix(in srgb, var(--app-accent) 18%, transparent);
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 26%, transparent),
        0 10px 18px -18px color-mix(in srgb, var(--app-accent) 60%, transparent);
      transform: translateY(-0.5px);
    }

    .nav-link.active .nav-icon {
      background: color-mix(in srgb, var(--app-accent) 24%, transparent);
      box-shadow:
        inset 0 0 0 1px color-mix(in srgb, var(--app-accent) 36%, transparent),
        0 12px 22px -18px color-mix(in srgb, var(--app-accent) 70%, transparent);
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
      background: color-mix(in srgb, var(--app-sidebar-text) 20%, transparent);
      color: var(--app-sidebar-text);
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
      border-top: 1px solid var(--app-sidebar-border);
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
      background: color-mix(in srgb, var(--app-sidebar-text) 8%, transparent);
    }

    :host ::ng-deep .user-avatar {
      flex-shrink: 0;
      background: var(--app-accent) !important;
      color: var(--app-accent-contrast) !important;
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
      color: var(--app-sidebar-text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-role {
      font-size: 0.75rem;
      color: var(--app-sidebar-muted);
    }

    .user-menu-icon {
      color: var(--app-sidebar-muted);
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
      background: color-mix(in srgb, var(--app-sidebar-text) 20%, transparent);
      border-radius: 2px;
    }

    .sidebar-nav::-webkit-scrollbar-thumb:hover {
      background: color-mix(in srgb, var(--app-sidebar-text) 30%, transparent);
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

    .collapsed .nav-link::before {
      top: 10px;
      bottom: 10px;
    }

    .collapsed .user-container {
      justify-content: center;
      padding: 0.5rem;
    }
  `]
})
export class SidebarComponent {
  @Input() menuSections: SidebarMenuSection[] = [];
  @Input() userInfo: SidebarUserInfo | null = null;
  @Input() collapsed = false;
  
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


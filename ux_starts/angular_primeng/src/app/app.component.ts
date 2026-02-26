import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { AuthService } from './services/auth.service';
import { MenuModule } from 'primeng/menu';
import {
  SidebarComponent,
  SidebarMenuSection,
  SidebarUserInfo,
} from './components/sidebar/sidebar.component';
import { filter } from 'rxjs/operators';
import { NavigationEnd } from '@angular/router';
import packageJson from '../../package.json';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    MenuModule,
    SidebarComponent,
  ],
})
export class AppComponent implements OnInit {
  @ViewChild('userMenu') userMenu: any;

  profileItems: MenuItem[] = [];
  isAuthenticated = false;
  isAdmin = false;
  currentYear = new Date().getFullYear();
  version = packageJson.version;
  isAuthRoute = false;

  // Sidebar state
  sidebarCollapsed = false;
  sidebarMenuSections: SidebarMenuSection[] = [];
  sidebarUserInfo: SidebarUserInfo | null = null;

  constructor(
    public authService: AuthService,
    private router: Router,
  ) {
    this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      this.isAuthenticated = isAuthenticated;
      this.isAdmin = this.authService.isAdmin();
      this.updateSidebarMenuItems();
      this.updateUserInfo();
    });
    this.version = (window as any).__APP_VERSION__ || packageJson.version;

    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    this.sidebarCollapsed = savedState === 'true';

    // Track route changes to hide sidebar on auth pages
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        const url = event.urlAfterRedirects as string;
        this.isAuthRoute = url.startsWith('/auth');
      });
  }

  ngOnInit() {
    this.updateSidebarMenuItems();
    this.updateUserInfo();

    // Update profile items
    this.updateProfileItems();
  }

  private updateSidebarMenuItems() {
    if (this.isAuthenticated) {
      this.sidebarMenuSections = [
        {
          title: 'MAIN',
          items: [
            {
              label: 'Todo List',
              icon: 'pi-check-square',
              routerLink: ['/todo'],
            },
          ],
        },
      ];
    } else {
      this.sidebarMenuSections = [];
    }
  }

  private updateUserInfo() {
    if (this.isAuthenticated) {
      const profile = this.authService.getCurrentProfile();
      const avatarUrl = this.authService.getAvatarUrl();

      this.sidebarUserInfo = {
        name: profile?.firstName && profile?.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : profile?.username || 'User',
        role: this.isAdmin ? 'Administrator' : 'User',
        initials: this.authService.getUserInitials(),
        avatarUrl: this.authService.getAvatar() || avatarUrl,
      };
    } else {
      this.sidebarUserInfo = null;
    }
  }

  private updateProfileItems() {
    this.profileItems = [
      {
        label: 'Sign Out',
        icon: 'pi pi-sign-out',
        command: () => {
          this.authService.logout();
          this.router.navigate(['/auth']);
        },
      },
    ];
  }

  showUserMenu(event: any) {
    this.userMenu?.toggle(event);
  }

  toggleMobileSidebar() {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }
}

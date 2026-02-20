import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  NgZone,
  OnInit,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { AuthService } from './services/auth.service';
import { BreadcrumbModule } from 'primeng/breadcrumb';
import { MenuModule } from 'primeng/menu';
import { SidebarComponent, SidebarMenuSection, SidebarUserInfo } from './components/sidebar/sidebar.component';
import { BreadcrumbService } from './services/breadcrumb.service';
import { SettingsService } from './services/settings.service';
import {
  DisplayMode,
  getDisplayMode,
} from './components/item-detail/item-detail.types';
import packageJson from '../../package.json';
import { environment } from '../environments/environment';
import { SyncService } from './services/sync.service';
import { NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService, AppTheme } from './services/theme.service';
import { OfflineSyncService } from './services/offline-sync.service';
import { SidebarSyncState } from './components/sidebar/sidebar.component';

export interface BreadcrumbItem {
  label: string;
  url: string;
  icon?: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ButtonModule,
    BreadcrumbModule,
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
  breadcrumbItems: MenuItem[] = [];
  home: MenuItem = { icon: 'pi pi-home', routerLink: '/' };
  displayMode: DisplayMode = getDisplayMode();
  currentTime = '';

  // Sidebar state
  sidebarCollapsed = false;
  sidebarMenuSections: SidebarMenuSection[] = [];
  sidebarUserInfo: SidebarUserInfo | null = null;
  mobileNavOpen = false;
  mobileSidebarCollapsed = false;
  isMobile = window.innerWidth <= 768;
  private offlineSyncStarted = false;
  private viewInitialized = false;

  // Sync status indicator
  isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  syncInProgress = false;
  syncPendingTotal = 0;
  lastSyncAt: string | null = null;
  lastSyncError: string | null = null;
  syncLabel = '';
  syncState: SidebarSyncState = 'ok';

  constructor(
    public authService: AuthService,
    private router: Router,
    private breadcrumbService: BreadcrumbService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private settingsService: SettingsService,
    private syncService: SyncService,
    private themeService: ThemeService,
    private offlineSync: OfflineSyncService
  ) {
    this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      this.isAuthenticated = isAuthenticated;
      this.isAdmin = this.authService.isAdmin();
      this.updateSidebarMenuItems();
      this.updateUserInfo();
      this.updateProfileItems();

      // Sync is temporarily disabled while we validate 100% client-side behavior.
    });
    this.version = (window as any).__APP_VERSION__ || packageJson.version;

    window.addEventListener('resize', () => {
      this.displayMode = getDisplayMode();
      this.isMobile = window.innerWidth <= 768;
      if (!this.isMobile) {
        this.mobileNavOpen = false;
      }
    });

    // Load sidebar state from localStorage
    const savedState = localStorage.getItem('sidebarCollapsed');
    this.sidebarCollapsed = savedState === 'true';

    // Close mobile nav on route changes
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd))
      .subscribe(() => {
        this.mobileNavOpen = false;
      });

    // Online/offline indicator
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.updateSyncIndicator();
      });
      window.addEventListener('offline', () => {
        this.isOnline = false;
        this.updateSyncIndicator();
      });
    }

    // Sync status subscriptions (used by sidebar + integrations page)
    this.offlineSync.syncing$.subscribe((v) => {
      this.syncInProgress = v;
      this.updateSyncIndicator();
    });
    this.offlineSync.queueSummary$.subscribe((s) => {
      this.syncPendingTotal = s.total || 0;
      this.updateSyncIndicator();
    });
    this.offlineSync.lastSyncAt$.subscribe((v) => {
      this.lastSyncAt = v;
      this.updateSyncIndicator();
    });
    this.offlineSync.lastError$.subscribe((v) => {
      this.lastSyncError = v;
      this.updateSyncIndicator();
    });
  }

  ngOnInit() {
    this.themeService.init();

    this.updateSidebarMenuItems();
    this.updateProfileItems();
    this.updateUserInfo();

    // Mock-mode sync bootstrap: hydrate cached entities for fast UI
    if (environment.mock) {
      this.syncService.bootstrap().subscribe({
        next: () => { },
        error: () => { },
      });
    }

    this.authService.loadAuthSetup().subscribe({
      next: () => {
        this.updateSidebarMenuItems();
      },
      error: (error) => {
        console.warn('Failed to load auth setup:', error);
        this.updateSidebarMenuItems();
      },
    });

    this.settingsService.namingSettings$.subscribe(() => {
      this.updateSidebarMenuItems();
    });

    this.breadcrumbService.breadcrumbsSubject
      .asObservable()
      .subscribe((items) => {
        this.breadcrumbItems = items;
      });

    this.updateCurrentTime();
    setInterval(() => {
      this.updateCurrentTime();
    }, 60000);

    // Update profile items
    this.updateProfileItems();
  }

  ngAfterViewInit(): void {
    this.viewInitialized = true;
  }

  private updateSyncIndicator(): void {
    if (environment.mock) {
      this.syncState = 'mock';
      this.syncLabel = 'Mock sync';
      return;
    }

    if (!this.isOnline) {
      this.syncState = 'offline';
      this.syncLabel = this.syncPendingTotal > 0 ? `Offline · ${this.syncPendingTotal} pending` : 'Offline';
      return;
    }

    if (this.syncInProgress) {
      this.syncState = 'syncing';
      this.syncLabel = this.syncPendingTotal > 0 ? `Syncing · ${this.syncPendingTotal} pending` : 'Syncing';
      return;
    }

    if (this.lastSyncError) {
      this.syncState = 'error';
      this.syncLabel = this.syncPendingTotal > 0 ? `Sync error · ${this.syncPendingTotal} pending` : 'Sync error';
      return;
    }

    if (this.syncPendingTotal > 0) {
      this.syncState = 'pending';
      this.syncLabel = `${this.syncPendingTotal} pending`;
      return;
    }

    this.syncState = 'ok';
    this.syncLabel = this.lastSyncAt ? `Synced ${this.formatShortTime(this.lastSyncAt)}` : 'Synced';
  }

  private formatShortTime(iso: string): string {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'recently';
    }
  }

  private updateCurrentTime() {
    this.currentTime =
      new Date().toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }) +
      ' · ' +
      new Date().toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  private updateSidebarMenuItems() {
    if (this.isAuthenticated) {
      let lastBoardId = 'all';
      try {
        lastBoardId = localStorage.getItem('whenisdone_last_board_id') || 'all';
      } catch {
        lastBoardId = 'all';
      }

      const mainItems = [
        { label: 'Dashboard', icon: 'pi-home', routerLink: ['/home'] },
        { label: 'Calendar', icon: 'pi-calendar', routerLink: ['/calendar'] },
        { label: 'Boards', icon: 'pi-th-large', routerLink: ['/boards', lastBoardId] },
        { label: 'Projects', icon: 'pi-briefcase', routerLink: ['/projects'] },
      ];

      const toolsItems = [
        { label: 'Agent', icon: 'pi-comments', routerLink: ['/agent'] },
      ];

      const settingsItems = [
        { label: 'Preferences', icon: 'pi pi-cog', routerLink: ['/settings'] },
        { label: 'Integrations', icon: 'pi-sliders-h', routerLink: ['/integrations'] },
        { label: 'Profile', icon: 'pi-user', routerLink: ['/profile'] },
        { label: 'Tenant', icon: 'pi-building', routerLink: ['/admin/tenant'] },
      ];

      const adminItems = [
        { label: 'Admin', icon: 'pi-cog', routerLink: ['/admin'] },
      ];

      this.sidebarMenuSections = [
        { title: 'MAIN', items: mainItems },
        { title: 'TOOLS', items: toolsItems },
        { title: 'SETTINGS', items: settingsItems },
      ];

      if (this.isAdmin) {
        this.sidebarMenuSections.push({ title: 'ADMIN', items: adminItems });
      }
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
    const currentTheme = this.themeService.getTheme();
    this.profileItems = [
      {
        label: 'Profile',
        icon: 'pi pi-user',
        command: () => this.router.navigate(['/profile']),
      },
      { separator: true },
      {
        label: 'Light',
        icon: currentTheme === 'light' ? 'pi pi-check' : 'pi pi-sun',
        command: () => this.setTheme('light'),
      },
      {
        label: 'Midnight',
        icon: currentTheme === 'midnight' ? 'pi pi-check' : 'pi pi-moon',
        command: () => this.setTheme('midnight'),
      },
      {
        label: '80s Arcade',
        icon: currentTheme === 'arcade80s' ? 'pi pi-check' : 'pi pi-bolt',
        command: () => this.setTheme('arcade80s'),
      },
      {
        label: '90s Grunge',
        icon: currentTheme === 'grunge90s' ? 'pi pi-check' : 'pi pi-star',
        command: () => this.setTheme('grunge90s'),
      },
      { separator: true },
      {
        label: 'Integrations',
        icon: 'pi pi-sliders-h',
        command: () => this.router.navigate(['/integrations']),
      },
      {
        label: 'Tenant',
        icon: 'pi pi-building',
        command: () => this.router.navigate(['/admin/tenant']),
      },
      { separator: true },
      {
        label: 'Sign Out',
        icon: 'pi pi-sign-out',
        command: () => {
          this.authService.logout();
          this.router.navigate(['/auth']);
        },
      },
    ];

    // PrimeNG menu overlays can be finicky about re-rendering model updates while open.
    // Forcing change detection here keeps the checkmark/theme options in sync.
    this.cdr.markForCheck();
    if (this.viewInitialized) {
      queueMicrotask(() => {
        try {
          this.cdr.detectChanges();
        } catch {
          // Ignore: can happen if called before initial render completes
        }
      });
    }
  }

  private setTheme(theme: AppTheme): void {
    this.themeService.setTheme(theme);
    // Refresh the menu so the checkmark moves
    this.updateProfileItems();
  }

  showUserMenu(event: any) {
    // Ensure theme checkmark is always up-to-date right before showing the menu.
    this.updateProfileItems();
    this.userMenu?.toggle(event);
  }

  toggleMobileSidebar() {
    // On mobile we treat this as opening/closing a drawer
    if (this.isMobile) {
      // Always open expanded
      if (!this.mobileNavOpen) {
        this.mobileSidebarCollapsed = false;
      }
      this.mobileNavOpen = !this.mobileNavOpen;
      return;
    }
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onSidebarCollapsedChange(collapsed: boolean) {
    this.sidebarCollapsed = collapsed;
    localStorage.setItem('sidebarCollapsed', String(collapsed));
  }

  closeMobileNav() {
    this.mobileNavOpen = false;
    this.mobileSidebarCollapsed = false;
  }

  onMobileSidebarCollapsedChange(collapsed: boolean) {
    // On phone, clicking the arrow (collapse) should effectively "close" the drawer.
    if (collapsed) {
      this.closeMobileNav();
    }
    // Keep the sidebar expanded next time we open it.
    this.mobileSidebarCollapsed = false;
  }
}

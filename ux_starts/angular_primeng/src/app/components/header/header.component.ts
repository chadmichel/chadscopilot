import { Component, Input, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { AvatarModule } from 'primeng/avatar';
import { MenuModule } from 'primeng/menu';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { LocalStorage } from '@azure/msal-browser';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MenubarModule,
    ButtonModule,
    TooltipModule,
    AvatarModule,
    MenuModule,
  ],
  template: `
    <div class="header-container">
      <p-menubar
        [model]="menuItems"
        [style]="{
          border: 'none',
          background: 'transparent'
        }"
      >
        <ng-template pTemplate="start">
          <img src="Logo.png" height="40" class="mr-2" />
        </ng-template>

        <ng-template pTemplate="end">
          <div class="header-buttons">
            <button
              *ngFor="let item of staticMenuItems"
              pButton
              type="button"
              class="p-button-rounded p-button-text mr-2"
              icon="pi pi-{{ item.icon }}"
              visible="true"
              [routerLink]="item.routerLink"
              (click)="runCommand(item)"
            ></button>

            <p-menu #menu [model]="profileItems" [popup]="true"></p-menu>
            @if (profilePhotoDataUri !== null) {
            <p-avatar
              [image]="profilePhotoDataUri"
              shape="circle"
              size="normal"
              styleClass="mr-2 cursor-pointer"
              (click)="menu.toggle($event)"
            ></p-avatar>
            } @else {
            <p-avatar
              [label]="getUserInitials()"
              shape="circle"
              size="normal"
              styleClass="mr-2 cursor-pointer"
              (click)="menu.toggle($event)"
            ></p-avatar>
            }
          </div>
        </ng-template>
      </p-menubar>
    </div>
  `,
  styles: [
    `
      .header-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        z-index: 1000;
        background-color: white;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
        transition: background-color 0.3s ease;
      }

      .dark-header {
        background-color: #1e1e1e;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.3);
      }

      :host ::ng-deep {
        .p-menubar {
          background: transparent;
          border: none;
          padding: 0;
        }

        .p-avatar {
          cursor: pointer;
          &:hover {
            opacity: 0.8;
          }
        }

        .p-menuitem-link:focus {
          box-shadow: none;
        }
      }

      .header-buttons {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
    `,
  ],
})
export class HeaderComponent implements OnInit {
  @Input() menuItems: MenuItem[] = [];
  @Input() staticMenuItems: MenuItem[] = [];
  @Input() profileItems: MenuItem[] = [];

  isAuthenticated = false;
  isDarkMode = true;

  profilePhotoDataUri: string | null = null;

  constructor(private authService: AuthService, private router: Router) {}

  @HostListener('window:load')
  @HostListener('window:DOMContentLoaded')
  onLoad() {
    this.detectTheme();
  }

  setProfilePhoto() {
    this.profilePhotoDataUri = this.authService.getAvatar();
  }

  ngOnInit() {
    this.authService.isAuthenticated$.subscribe((isAuthenticated) => {
      this.isAuthenticated = isAuthenticated;
    });
    this.detectTheme();

    this.setProfilePhoto();
    addEventListener(
      'storage',
      (event) => {
        this.setProfilePhoto();
      },
      false
    );
  }

  detectTheme() {
    var classes = document.body.classList;
    const isDarkTheme = window.matchMedia(
      '(prefers-color-scheme: dark)'
    ).matches;
    //this.isDarkMode = isDarkTheme;
  }

  getUserInitials(): string {
    return this.authService.getUserInitials();
  }

  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    //document.body.classList.toggle('dark', this.isDarkMode);
  }

  runCommand(item: MenuItem) {
    if (item.command) {
      item.command({ originalEvent: event, item });
    }
  }
}

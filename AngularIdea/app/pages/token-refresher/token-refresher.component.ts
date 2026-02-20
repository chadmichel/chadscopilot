import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ItemDetailComponent } from '../../components/item-detail/item-detail.component';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';
import { of } from 'rxjs';
import { ItemDetailConfig } from '../../components/item-detail/item-detail.types';

@Component({
  selector: 'app-token-refresher',
  standalone: true,
  imports: [CommonModule, ItemDetailComponent, ToastModule],
  providers: [MessageService],
  template: `<pb-item-detail [config]="detailConfig"></pb-item-detail>`,
})
export class TokenRefresherComponent implements OnInit {
  detailConfig = {
    header: 'Token Information',
    isEditable: false,
    supportsAdd: false,
    supportsDelete: false,
    updateSuccessMessage: 'Token refreshed successfully',
    formLayout: [
      { key: 'username', label: 'Username', type: 'text' },
      {
        key: 'accessToken',
        label: 'Access Token',
        type: 'text',
      },
      {
        key: 'accessTokenExpiresAt',
        label: 'Access Token Expires At',
        type: 'text',
      },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        type: 'text',
      },
      {
        key: 'refreshTokenExpiresAt',
        label: 'Refresh Token Expires At',
        type: 'text',
      },
    ],
    customToolbarItems: [
      {
        label: 'Refresh Token',
        icon: 'pi pi-refresh',
        onClick: () => this.refreshToken(),
      },
    ],
    dataService: {
      parseParams: () => ({}),
      loadItem: () => this.loadTokenData(),
      createItem: () =>
        of({ success: true, message: 'Not applicable', id: '' }),
      updateItem: () =>
        of({ success: true, message: 'Not applicable', id: '' }),
      deleteItem: () =>
        of({ success: true, message: 'Not applicable', id: '' }),
    },
  } as ItemDetailConfig;

  constructor(
    private authService: AuthService,
    private messageService: MessageService
  ) {}

  ngOnInit() {
    // Initial load of token data happens through the dataService.loadItem
  }

  loadTokenData() {
    const tokenData = {
      username: this.authService.getUsername(),
      accessToken: this.authService.getToken(),
      accessTokenExpiresAt: localStorage.getItem('token_expires'),
      refreshToken: this.authService.getRefreshToken(),
      refreshTokenExpiresAt: localStorage.getItem('refresh_token_expires'),
    };

    return of(tokenData);
  }

  refreshToken() {
    this.authService.refreshToken().subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Token refreshed successfully',
        });

        this.loadTokenData().subscribe((data) => {
          this.detailConfig.dataService.loadItem = () => of(data);
          this.detailConfig.updateSuccessMessage =
            'Token refreshed successfully';
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Failed to refresh token: ${err.message || 'Unknown error'}`,
        });
      },
    });
  }
}

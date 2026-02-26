import { Component, input, output, signal, inject, OnInit, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { StudentAddress } from '../../student-selector-dialog.types';
import { StudentService } from '../../../../services/student.service';
import { StudentAddressDto } from '../../../../dto/transportation.dto';

@Component({
  selector: 'app-address-picker',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ToastModule,
  ],
  providers: [MessageService],
  template: `
    @if (loading()) {
      <div class="address-picker__loading">
        <i class="pi pi-spin pi-spinner"></i>
        <span>Loading addresses...</span>
      </div>
    } @else {
      <!-- Address list -->
      @if (addresses().length > 0) {
        <div class="address-picker__list">
          @for (addr of addresses(); track addr.id) {
            @if (editingAddressId() === addr.id) {
              <!-- Edit form -->
              <div class="address-picker__form">
                <div class="form-row">
                  <label>Nickname</label>
                  <input type="text" pInputText [(ngModel)]="editData.nickname" placeholder="e.g., Home, Work" />
                </div>
                <div class="form-row">
                  <label>Address <span class="required">*</span></label>
                  <input type="text" pInputText [(ngModel)]="editData.address" placeholder="Street address" />
                </div>
                <div class="form-row-group">
                  <div class="form-row">
                    <label>City</label>
                    <input type="text" pInputText [(ngModel)]="editData.city" placeholder="City" />
                  </div>
                  <div class="form-row form-row--small">
                    <label>State</label>
                    <input type="text" pInputText [(ngModel)]="editData.state" placeholder="NE" />
                  </div>
                  <div class="form-row form-row--small">
                    <label>ZIP</label>
                    <input type="text" pInputText [(ngModel)]="editData.zip" placeholder="ZIP" />
                  </div>
                </div>
                <div class="form-actions">
                  <button pButton type="button" label="Cancel" class="p-button-text p-button-sm" (click)="cancelEdit()"></button>
                  <button
                    pButton
                    type="button"
                    label="Save"
                    icon="pi pi-check"
                    class="p-button-sm"
                    [disabled]="!editData.address || saving()"
                    [loading]="saving()"
                    (click)="saveEdit()"
                  ></button>
                </div>
              </div>
            } @else {
              <!-- Address option -->
              <div
                class="address-picker__option"
                [class.address-picker__option--selected]="selectedAddressId() === addr.id"
              >
                <div class="address-picker__option-main" (click)="selectAddress(addr)">
                  <div class="address-picker__option-radio">
                    <i [class]="selectedAddressId() === addr.id ? 'pi pi-circle-fill' : 'pi pi-circle'"></i>
                  </div>
                  <div class="address-picker__option-content">
                    <span class="address-picker__nickname">{{ addr.nickname || 'Address' }}</span>
                    <span class="address-picker__full">{{ addr.address }}</span>
                    @if (addr.city || addr.state || addr.zip) {
                      <span class="address-picker__city-state">{{ formatCityStateZip(addr) }}</span>
                    }
                  </div>
                </div>
                @if (allowEdit()) {
                  <div class="address-picker__option-actions">
                    <button
                      pButton
                      type="button"
                      icon="pi pi-pencil"
                      class="p-button-rounded p-button-text p-button-sm"
                      pTooltip="Edit address"
                      (click)="startEdit(addr); $event.stopPropagation()"
                    ></button>
                    <button
                      pButton
                      type="button"
                      icon="pi pi-trash"
                      class="p-button-rounded p-button-text p-button-danger p-button-sm"
                      pTooltip="Delete address"
                      [loading]="deletingId() === addr.id"
                      (click)="deleteAddress(addr); $event.stopPropagation()"
                    ></button>
                  </div>
                }
              </div>
            }
          }
        </div>
      } @else {
        <div class="address-picker__empty">
          <i class="pi pi-map-marker"></i>
          <p>No saved addresses</p>
        </div>
      }

      <!-- Add new address section -->
      @if (allowAdd()) {
        <div class="address-picker__add-section">
          <div class="address-picker__add-header" (click)="toggleNewForm()">
            <i class="pi pi-plus"></i>
            <span>Add New Address</span>
            <i class="pi" [ngClass]="showNewForm() ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
          </div>
          @if (showNewForm()) {
            <div class="address-picker__form">
              <div class="form-row">
                <label>Nickname (optional)</label>
                <input type="text" pInputText [(ngModel)]="newData.nickname" placeholder="e.g., Home, Work, Church" />
              </div>
              <div class="form-row">
                <label>Address <span class="required">*</span></label>
                <input type="text" pInputText [(ngModel)]="newData.address" placeholder="Street address" />
              </div>
              <div class="form-row-group">
                <div class="form-row">
                  <label>City</label>
                  <input type="text" pInputText [(ngModel)]="newData.city" placeholder="City" />
                </div>
                <div class="form-row form-row--small">
                  <label>State</label>
                  <input type="text" pInputText [(ngModel)]="newData.state" placeholder="NE" />
                </div>
                <div class="form-row form-row--small">
                  <label>ZIP</label>
                  <input type="text" pInputText [(ngModel)]="newData.zip" placeholder="ZIP" />
                </div>
              </div>
              <div class="form-actions">
                <button pButton type="button" label="Cancel" class="p-button-text p-button-sm" (click)="cancelNew()"></button>
                <button
                  pButton
                  type="button"
                  label="Save & Select"
                  icon="pi pi-check"
                  class="p-button-sm"
                  [disabled]="!newData.address || saving()"
                  [loading]="saving()"
                  (click)="saveNew()"
                ></button>
              </div>
            </div>
          }
        </div>
      }
    }
  `,
  styleUrls: ['./address-picker.component.scss'],
})
export class AddressPickerComponent implements OnInit {
  private studentService = inject(StudentService);
  private messageService = inject(MessageService);

  // Inputs
  studentId = input.required<string>();
  initialAddresses = input<StudentAddress[]>([]);
  selectedAddressId = input<string | null>(null);
  autoLoad = input(true);
  allowAdd = input(true);
  allowEdit = input(true);

  // Outputs
  addressSelected = output<StudentAddress>();
  addressAdded = output<StudentAddress>();
  addressUpdated = output<StudentAddress>();
  addressDeleted = output<StudentAddress>();

  // State
  addresses = signal<StudentAddress[]>([]);
  loading = signal(false);
  saving = signal(false);
  deletingId = signal<string | null>(null);
  editingAddressId = signal<string | null>(null);
  showNewForm = signal(false);

  // Form data
  newData: Partial<StudentAddressDto> = {};
  editData: Partial<StudentAddressDto> = {};

  constructor() {
    // React to initialAddresses changes
    effect(() => {
      const initial = this.initialAddresses();
      if (initial.length > 0) {
        this.addresses.set(initial);
      }
    });
  }

  ngOnInit() {
    // Only auto-load if no initial addresses provided
    if (this.initialAddresses().length === 0 && this.autoLoad()) {
      this.loadAddresses();
    }
  }

  loadAddresses() {
    this.loading.set(true);

    this.studentService.getStudentAddresses(this.studentId()).subscribe({
      next: (response) => {
        const addresses: StudentAddress[] = response.addresses.map(addr => ({
          id: addr.id!,
          nickname: addr.nickname,
          address: addr.address,
          city: addr.city,
          state: addr.state,
          zip: addr.zip,
          isDefault: addr.isDefault,
        }));
        this.addresses.set(addresses);
        this.loading.set(false);

        // Auto-select default if nothing selected
        const defaultAddr = addresses.find(a => a.isDefault);
        if (defaultAddr && !this.selectedAddressId()) {
          this.addressSelected.emit(defaultAddr);
        }
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  formatCityStateZip(addr: StudentAddress): string {
    return [addr.city, addr.state, addr.zip].filter(v => !!v).join(', ');
  }

  selectAddress(addr: StudentAddress) {
    this.addressSelected.emit(addr);
  }

  // ===========================================
  // ADD NEW ADDRESS
  // ===========================================

  toggleNewForm() {
    this.showNewForm.update(v => !v);
    if (this.showNewForm()) {
      this.newData = { nickname: '', address: '', city: '', state: '', zip: '' };
    }
  }

  cancelNew() {
    this.showNewForm.set(false);
    this.newData = {};
  }

  saveNew() {
    if (!this.newData.address?.trim()) return;

    this.saving.set(true);

    const dto: StudentAddressDto = {
      nickname: this.newData.nickname?.trim() || 'Pickup',
      address: this.newData.address.trim(),
      city: this.newData.city?.trim(),
      state: this.newData.state?.trim(),
      zip: this.newData.zip?.trim(),
      isDefault: false,
    };

    this.studentService.createStudentAddress(this.studentId(), dto).subscribe({
      next: (result) => {
        const newAddress: StudentAddress = {
          id: result.id!,
          nickname: dto.nickname,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
          isDefault: false,
        };

        this.addresses.update(list => [...list, newAddress]);
        this.addressAdded.emit(newAddress);
        this.addressSelected.emit(newAddress); // Auto-select new address
        this.cancelNew();
        this.saving.set(false);

        this.messageService.add({
          severity: 'success',
          summary: 'Address Saved',
          detail: 'New address has been saved and selected',
          life: 3000,
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to save address',
          life: 5000,
        });
      }
    });
  }

  // ===========================================
  // EDIT ADDRESS
  // ===========================================

  startEdit(addr: StudentAddress) {
    this.editingAddressId.set(addr.id);
    this.editData = {
      nickname: addr.nickname,
      address: addr.address,
      city: addr.city,
      state: addr.state,
      zip: addr.zip,
    };
  }

  cancelEdit() {
    this.editingAddressId.set(null);
    this.editData = {};
  }

  saveEdit() {
    const addressId = this.editingAddressId();
    if (!addressId || !this.editData.address?.trim()) return;

    this.saving.set(true);

    const dto: StudentAddressDto = {
      nickname: this.editData.nickname?.trim() || 'Pickup',
      address: this.editData.address.trim(),
      city: this.editData.city?.trim(),
      state: this.editData.state?.trim(),
      zip: this.editData.zip?.trim(),
    };

    this.studentService.updateStudentAddress(this.studentId(), addressId, dto).subscribe({
      next: () => {
        const updatedAddress: StudentAddress = {
          id: addressId,
          nickname: dto.nickname!,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          zip: dto.zip,
        };

        this.addresses.update(list =>
          list.map(a => a.id === addressId ? updatedAddress : a)
        );
        this.addressUpdated.emit(updatedAddress);
        this.cancelEdit();
        this.saving.set(false);

        this.messageService.add({
          severity: 'success',
          summary: 'Address Updated',
          detail: 'Address has been updated',
          life: 3000,
        });
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update address',
          life: 5000,
        });
      }
    });
  }

  // ===========================================
  // DELETE ADDRESS
  // ===========================================

  deleteAddress(addr: StudentAddress) {
    this.deletingId.set(addr.id);

    this.studentService.deleteStudentAddress(this.studentId(), addr.id).subscribe({
      next: () => {
        this.addresses.update(list => list.filter(a => a.id !== addr.id));
        this.addressDeleted.emit(addr);
        this.deletingId.set(null);

        this.messageService.add({
          severity: 'success',
          summary: 'Address Deleted',
          detail: `"${addr.nickname || 'Address'}" has been removed`,
          life: 3000,
        });
      },
      error: () => {
        this.deletingId.set(null);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to delete address',
          life: 5000,
        });
      }
    });
  }
}

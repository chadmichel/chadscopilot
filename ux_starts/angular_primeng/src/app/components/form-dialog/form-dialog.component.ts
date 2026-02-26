import { Component, input, output, model, effect, untracked, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl, Validators } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { InputTextarea } from 'primeng/inputtextarea';
import { Select } from 'primeng/select';
import { MultiSelectModule } from 'primeng/multiselect';
import { DatePicker } from 'primeng/datepicker';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { FormDialogConfig, FormFieldConfig, FieldType } from './form-dialog.types';

/** Represents either a single field or a row of grouped fields */
interface FieldOrRow {
  type: 'field' | 'row';
  field?: FormFieldConfig;
  fields?: FormFieldConfig[];
  rowKey?: string;
}

/** Default values by field type */
const DEFAULT_VALUES: Record<FieldType, unknown> = {
  number: 0,
  text: '',
  time: '',
  date: '',
  textarea: '',
  dropdown: null,
  multiselect: [],
  chips: [],
  itemlist: [{ text: '', value: '' }],
  toggle: false,
};

@Component({
  selector: 'app-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    InputText,
    InputTextarea,
    Select,
    MultiSelectModule,
    DatePicker,
    ToggleSwitch,
  ],
  template: `
    <p-dialog
      [header]="getTitle()"
      [(visible)]="visible"
      [modal]="true"
      styleClass="form-dialog"
      (onHide)="onCancel()"
    >
      <div class="form-dialog-content" *ngIf="formGroup" [formGroup]="formGroup">
        <ng-container *ngFor="let item of groupedFields()">
          <!-- Single field -->
          <ng-container *ngIf="item.type === 'field' && item.field">
            <div class="form-field">
              <label [for]="item.field.key">{{ item.field.label }}</label>
              <ng-container [ngSwitch]="item.field.type">
                <input *ngSwitchCase="'text'" [id]="item.field.key" type="text" pInputText [formControlName]="item.field.key" [placeholder]="item.field.placeholder || ''" />
                <p-datepicker *ngSwitchCase="'time'" [inputId]="item.field.key" [formControlName]="item.field.key" [timeOnly]="true" [stepMinute]="item.field.step || 5" [showTime]="true" hourFormat="12" appendTo="body"></p-datepicker>
                <input *ngSwitchCase="'date'" [id]="item.field.key" type="date" pInputText [formControlName]="item.field.key" />
                <p-inputNumber *ngSwitchCase="'number'" [inputId]="item.field.key" [formControlName]="item.field.key" [min]="item.field.min" [max]="item.field.max"></p-inputNumber>
                <p-select *ngSwitchCase="'dropdown'" [inputId]="item.field.key" [options]="item.field.options || []" [formControlName]="item.field.key" optionLabel="label" optionValue="value" [placeholder]="item.field.placeholder || 'Select...'" [showClear]="item.field.showClear !== false"></p-select>
                <textarea *ngSwitchCase="'textarea'" [id]="item.field.key" pInputTextarea [formControlName]="item.field.key" [placeholder]="item.field.placeholder || ''"></textarea>
                <p-multiSelect *ngSwitchCase="'multiselect'" [inputId]="item.field.key" [options]="item.field.options || []" [formControlName]="item.field.key" optionLabel="label" optionValue="value" [placeholder]="item.field.placeholder || 'Select...'" display="chip" [selectionLimit]="item.field.selectionLimit"></p-multiSelect>
                <div *ngSwitchCase="'chips'" class="chips-toggle">
                  <button *ngFor="let option of item.field.options || []" type="button" class="chip-toggle" [class.chip-toggle--selected]="isChipSelected(item.field.key, option.value)" (click)="toggleChip(item.field.key, option.value)">{{ option.label }}</button>
                </div>
                <div *ngSwitchCase="'itemlist'" class="itemlist-field">
                  <div class="itemlist-items">
                    <div *ngFor="let val of getItemlistValues(item.field!.key); let i = index; trackBy: trackByIndex" class="itemlist-row">
                      <input type="text" pInputText [value]="val.text" (input)="updateItemlistText(item.field!.key, i, $event)" [placeholder]="item.field!.placeholder || 'Enter item...'" class="itemlist-text" />
                      <input type="text" pInputText [value]="val.value" (input)="updateItemlistValue(item.field!.key, i, $event)" placeholder="Qty" class="itemlist-value" />
                      <button type="button" class="itemlist-remove" (click)="removeItemlistItem(item.field!.key, i)" [disabled]="getItemlistValues(item.field!.key).length <= 1"><i class="pi pi-times"></i></button>
                    </div>
                  </div>
                  <button type="button" class="itemlist-add" (click)="addItemlistItem(item.field!.key)" [disabled]="isItemlistAtMax(item.field!)">
                    <i class="pi pi-plus"></i> {{ item.field!.itemlistConfig?.addLabel || 'Add Item' }}
                  </button>
                </div>
                <p-toggleSwitch *ngSwitchCase="'toggle'" [inputId]="item.field.key" [formControlName]="item.field.key"></p-toggleSwitch>
              </ng-container>
            </div>
          </ng-container>

          <!-- Row of grouped fields -->
          <div *ngIf="item.type === 'row'" class="form-field-row">
            <div *ngFor="let field of item.fields" class="form-field form-field--inline">
              <label [for]="field.key">{{ field.label }}</label>
              <ng-container [ngSwitch]="field.type">
                <input *ngSwitchCase="'text'" [id]="field.key" type="text" pInputText [formControlName]="field.key" [placeholder]="field.placeholder || ''" />
                <p-datepicker *ngSwitchCase="'time'" [inputId]="field.key" [formControlName]="field.key" [timeOnly]="true" [stepMinute]="field.step || 5" [showTime]="true" hourFormat="12" appendTo="body"></p-datepicker>
                <input *ngSwitchCase="'date'" [id]="field.key" type="date" pInputText [formControlName]="field.key" />
                <p-inputNumber *ngSwitchCase="'number'" [inputId]="field.key" [formControlName]="field.key" [min]="field.min" [max]="field.max"></p-inputNumber>
                <p-select *ngSwitchCase="'dropdown'" [inputId]="field.key" [options]="field.options || []" [formControlName]="field.key" optionLabel="label" optionValue="value" [placeholder]="field.placeholder || 'Select...'" [showClear]="field.showClear !== false"></p-select>
                <textarea *ngSwitchCase="'textarea'" [id]="field.key" pInputTextarea [formControlName]="field.key" [placeholder]="field.placeholder || ''"></textarea>
                <p-multiSelect *ngSwitchCase="'multiselect'" [inputId]="field.key" [options]="field.options || []" [formControlName]="field.key" optionLabel="label" optionValue="value" [placeholder]="field.placeholder || 'Select...'" display="chip" [selectionLimit]="field.selectionLimit"></p-multiSelect>
                <div *ngSwitchCase="'chips'" class="chips-toggle">
                  <button *ngFor="let option of field.options || []" type="button" class="chip-toggle" [class.chip-toggle--selected]="isChipSelected(field.key, option.value)" (click)="toggleChip(field.key, option.value)">{{ option.label }}</button>
                </div>
                <p-toggleSwitch *ngSwitchCase="'toggle'" [inputId]="field.key" [formControlName]="field.key"></p-toggleSwitch>
              </ng-container>
            </div>
          </div>
        </ng-container>
      </div>

      <ng-template pTemplate="footer">
        <p-button
          [label]="config().cancelLabel || 'Cancel'"
          styleClass="p-button-text"
          (onClick)="onCancel()"
        ></p-button>
        <p-button
          [label]="getSubmitLabel()"
          icon="pi pi-check"
          (onClick)="onSubmit()"
          [disabled]="!formGroup || formGroup.invalid"
        ></p-button>
      </ng-template>
    </p-dialog>
  `,
  styleUrls: ['./form-dialog.component.scss'],
})
export class FormDialogComponent<T extends Record<string, unknown> = Record<string, unknown>> {
  // Inputs
  visible = model(false);
  isEditing = input(false);
  config = input.required<FormDialogConfig>();
  initialData = input<Partial<T>>();

  // Outputs
  save = output<T>();
  cancel = output<void>();

  // Reactive Form
  formGroup: FormGroup | null = null;

  // Computed: Group fields by row property
  groupedFields = computed((): FieldOrRow[] => {
    const fields = this.config()?.fields ?? [];
    const result: FieldOrRow[] = [];
    const processedRows = new Set<string>();

    for (const field of fields) {
      if (field.row) {
        // Skip if already processed this row
        if (processedRows.has(field.row)) continue;
        processedRows.add(field.row);

        // Collect all fields in this row
        const rowFields = fields.filter(f => f.row === field.row);
        result.push({ type: 'row', fields: rowFields, rowKey: field.row });
      } else {
        // Single field, no row grouping
        result.push({ type: 'field', field });
      }
    }

    return result;
  });

  constructor() {
    // Build FormGroup when dialog opens.
    // Uses untracked() to prevent re-triggering when config/initialData change while dialog is open.
    effect(() => {
      if (this.visible()) {
        untracked(() => this.buildFormGroup());
      }
    });
  }

  private buildFormGroup(): void {
    const cfg = this.config();
    const initial = this.initialData();
    const controls: Record<string, FormControl> = {};

    for (const field of cfg?.fields ?? []) {
      const validators = [];

      // Add required validator
      if (field.required) {
        validators.push(Validators.required);
      }

      // Add min validator for numbers
      if (field.type === 'number' && field.min !== undefined) {
        validators.push(Validators.min(field.min));
      }

      // Add max validator for numbers
      if (field.type === 'number' && field.max !== undefined) {
        validators.push(Validators.max(field.max));
      }

      const defaultValue = this.getDefaultValue(field);
      // Use default if initial value is null, undefined, or empty string
      const rawInitial = initial?.[field.key];
      let initialValue = (rawInitial === null || rawInitial === undefined || rawInitial === '')
        ? defaultValue
        : rawInitial;

      // Convert time strings to Date objects for DatePicker
      if (field.type === 'time' && typeof initialValue === 'string' && initialValue) {
        initialValue = this.timeStringToDate(initialValue);
      }

      controls[field.key] = new FormControl(initialValue, validators);
    }

    this.formGroup = new FormGroup(controls);
  }

  /** Convert "HH:MM" or "HH:MM:SS" string to Date object */
  private timeStringToDate(timeStr: string): Date | null {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    // Use a fixed date to avoid current time showing through
    const date = new Date(2000, 0, 1, hours, minutes, 0, 0);
    return date;
  }

  /** Get default time (12:00 PM) for empty time fields */
  private getDefaultTime(): Date {
    return new Date(2000, 0, 1, 12, 0, 0, 0);
  }

  /** Convert Date object to "HH:MM" string, rounding minutes to nearest step */
  private dateToTimeString(date: Date | null, step: number = 5): string {
    if (!date) return '';
    const hours = date.getHours().toString().padStart(2, '0');
    // Round minutes to nearest step (e.g., 13 -> 15 when step is 5)
    const rawMinutes = date.getMinutes();
    const roundedMinutes = Math.round(rawMinutes / step) * step;
    // Handle case where rounding goes to 60
    const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    return `${hours}:${finalMinutes.toString().padStart(2, '0')}`;
  }

  private getDefaultValue(field: FormFieldConfig): unknown {
    if (field.type === 'number') {
      // For optional number fields, default to null (no value)
      if (!field.required) {
        return null;
      }
      return field.min ?? DEFAULT_VALUES.number;
    }
    // For time fields, default to 12:00 PM
    if (field.type === 'time') {
      return this.getDefaultTime();
    }
    return DEFAULT_VALUES[field.type] ?? '';
  }

  getTitle(): string {
    const cfg = this.config();
    if (this.isEditing() && cfg.editTitle) {
      return cfg.editTitle;
    }
    return cfg.title;
  }

  getSubmitLabel(): string {
    const cfg = this.config();
    if (this.isEditing() && cfg.editSubmitLabel) {
      return cfg.editSubmitLabel;
    }
    return cfg.submitLabel || (this.isEditing() ? 'Save' : 'Create');
  }

  onSubmit() {
    if (this.formGroup && this.formGroup.valid) {
      const formValue = { ...this.formGroup.value };

      // Convert Date objects back to time strings for time fields
      for (const field of this.config().fields) {
        if (field.type === 'time' && formValue[field.key] instanceof Date) {
          formValue[field.key] = this.dateToTimeString(formValue[field.key], field.step || 5);
        }
      }

      this.save.emit(formValue as T);
      this.close();
    }
  }

  onCancel() {
    this.cancel.emit();
    this.close();
  }

  private close() {
    this.visible.set(false);
  }

  // Chips toggle methods
  isChipSelected(fieldKey: string, value: string | number): boolean {
    const control = this.formGroup?.get(fieldKey);
    const currentValue = control?.value as (string | number)[] | null;
    return currentValue?.includes(value) ?? false;
  }

  toggleChip(fieldKey: string, value: string | number): void {
    const control = this.formGroup?.get(fieldKey);
    if (!control) return;

    const currentValue = (control.value as (string | number)[]) || [];
    const index = currentValue.indexOf(value);

    if (index >= 0) {
      control.setValue(currentValue.filter(v => v !== value));
    } else {
      control.setValue([...currentValue, value]);
    }
  }

  // Itemlist methods
  getItemlistValues(fieldKey: string): Array<{ text: string; value: string }> {
    const control = this.formGroup?.get(fieldKey);
    return (control?.value as Array<{ text: string; value: string }>) || [{ text: '', value: '' }];
  }

  updateItemlistText(fieldKey: string, index: number, event: Event): void {
    const control = this.formGroup?.get(fieldKey);
    if (!control) return;

    const values = [...(control.value as Array<{ text: string; value: string }>)];
    values[index] = { ...values[index], text: (event.target as HTMLInputElement).value };
    control.setValue(values);
  }

  updateItemlistValue(fieldKey: string, index: number, event: Event): void {
    const control = this.formGroup?.get(fieldKey);
    if (!control) return;

    const values = [...(control.value as Array<{ text: string; value: string }>)];
    values[index] = { ...values[index], value: (event.target as HTMLInputElement).value };
    control.setValue(values);
  }

  addItemlistItem(fieldKey: string): void {
    const control = this.formGroup?.get(fieldKey);
    if (!control) return;

    const values = [...(control.value as Array<{ text: string; value: string }>), { text: '', value: '' }];
    control.setValue(values);
  }

  removeItemlistItem(fieldKey: string, index: number): void {
    const control = this.formGroup?.get(fieldKey);
    if (!control) return;

    const values = (control.value as Array<{ text: string; value: string }>).filter((_, i) => i !== index);
    control.setValue(values.length > 0 ? values : [{ text: '', value: '' }]);
  }

  isItemlistAtMax(field: FormFieldConfig): boolean {
    const maxItems = field.itemlistConfig?.maxItems;
    if (!maxItems) return false;
    return this.getItemlistValues(field.key).length >= maxItems;
  }

  // TrackBy function to prevent DOM recreation on value changes
  trackByIndex(index: number): number {
    return index;
  }
}

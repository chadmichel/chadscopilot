/**
 * Generic form dialog component types
 */

export type FieldType = 'text' | 'number' | 'time' | 'date' | 'dropdown' | 'textarea' | 'multiselect' | 'chips' | 'itemlist' | 'toggle';

export interface DropdownOption {
  label: string;
  value: string | number;
}

export interface FormFieldConfig {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  min?: number;
  max?: number;
  step?: number;               // For time type (in minutes, e.g., 5 = 5-minute increments)
  options?: DropdownOption[];  // For dropdown type
  showClear?: boolean;         // For dropdown type
  selectionLimit?: number;     // For multiselect type (max items that can be selected)
  row?: string;                // Group fields with same row value on the same line
  itemlistConfig?: {           // For itemlist type
    minItems?: number;
    maxItems?: number;
    addLabel?: string;
  };
}

export interface FormDialogConfig {
  title: string;
  editTitle?: string;          // Optional different title for edit mode
  fields: FormFieldConfig[];
  submitLabel?: string;
  editSubmitLabel?: string;    // Optional different label for edit mode
  cancelLabel?: string;
}

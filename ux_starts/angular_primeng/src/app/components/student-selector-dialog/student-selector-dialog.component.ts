import {
  Component,
  input,
  output,
  computed,
  OnChanges,
  SimpleChanges,
  model,
  ContentChild,
  TemplateRef,
  signal,
  inject,
  effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primeng/accordion';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import {
  StudentOption,
  StudentSelection,
  StudentSelectorConfig,
  AssignedStudent,
  ChildActionEvent,
  AssignedStudentContext,
  StudentOptionContext,
  StudentAddress,
  AddressChangeEvent,
} from './student-selector-dialog.types';
import { StudentCardComponent, StudentBadge } from './components/student-card/student-card.component';
import { AddressPickerComponent } from './components/address-picker/address-picker.component';
import { Child, formatDate, getInitials } from '../../utils';
import { BabyIconComponent } from '../icons/baby-icon.component';
import { StudentService } from '../../services/student.service';

@Component({
  selector: 'app-student-selector-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    Tabs,
    TabList,
    Tab,
    TabPanels,
    TabPanel,
    TooltipModule,
    CheckboxModule,
    Accordion,
    AccordionPanel,
    AccordionHeader,
    AccordionContent,
    ToastModule,
    StudentCardComponent,
    AddressPickerComponent,
    BabyIconComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast></p-toast>
    <p-dialog
      [visible]="visible()"
      [modal]="true"
      styleClass="student-selector-dialog"
      [showHeader]="false"
      (onHide)="onClose()"
    >
      @if (visible()) {
        <div class="dialog-title">{{ config().title }}</div>

        <p-tabs value="0">
          <p-tablist>
            <p-tab value="0">{{ manageTabHeader() }}</p-tab>
            <p-tab value="1">{{ addTabHeader() }}</p-tab>
          </p-tablist>

          <p-tabpanels>
            <!-- =========================================== -->
            <!-- TAB 1: MANAGE EXISTING -->
            <!-- =========================================== -->
            <p-tabpanel value="0">
              <!-- Search bar -->
              <div class="search-box search-box--lg">
                <i class="pi pi-search"></i>
                <input
                  type="text"
                  pInputText
                  [(ngModel)]="manageSearchQuery"
                  [placeholder]="searchPlaceholder()"
                  (input)="filterAssignedItems()"
                />
              </div>

              <div class="dialog-content">
                @if (filteredAssignedItems().length === 0) {
                  <div class="empty-state empty-state--flex">
                    <i class="pi pi-users"></i>
                    <p>{{ manageSearchQuery ? 'No matches found' : emptyMessage() }}</p>
                  </div>
                }

                @for (person of filteredAssignedItems(); track person.id; let i = $index) {
                  <app-student-card
                    [name]="person.studentName || ''"
                    [avatarInitials]="getInitials(person.studentName || '')"
                    [badges]="getStudentBadges(person)"
                    [subtitle]="config().variant === 'transportation' && person.address ? person.address : ''"
                    [subtitleIcon]="config().variant === 'transportation' && person.address ? 'pi-map-marker' : ''"
                    [subtitleClickable]="config().variant === 'transportation'"
                    [secondaryText]="getSecondaryText(person)"
                    [actionType]="'remove'"
                    [actionTooltip]="removeTooltip()"
                    [variant]="config().variant"
                    (onAction)="onRemoveStudent(person)"
                    (onSubtitleClick)="toggleAddressEditForStudent(person.id)"
                  >
                    <!-- Address change dropdown for transportation -->
                    @if (config().variant === 'transportation' && editingAddressForStudent() === person.id) {
                      <div class="address-change-section">
                        <app-address-picker
                          [studentId]="person.studentId"
                          [initialAddresses]="person.addresses || []"
                          [selectedAddressId]="person.addressId || null"
                          [allowAdd]="false"
                          [allowEdit]="false"
                          (addressSelected)="onAddressSelectedForAssigned(person, $event)"
                        ></app-address-picker>
                      </div>
                    }

                    <!-- Content projection for children display -->
                    @if (childrenDisplayTemplate) {
                      <ng-container
                        [ngTemplateOutlet]="childrenDisplayTemplate"
                        [ngTemplateOutletContext]="getAssignedStudentContext(person)"
                      ></ng-container>
                    } @else if (showsChildren()) {
                      <!-- Built-in children display -->
                      @if (person.children && person.children.length > 0) {
                        <div class="inline-items">
                          @for (child of person.children; track child.id) {
                            <div class="chip chip--xs chip--assigned">
                              <span class="chip-name">{{ child.name }}</span>
                              @if (child.needsCarSeat) {
                                <span class="badge badge--xs badge--danger">CS</span>
                              }
                              @if (child.needsBooster) {
                                <span class="badge badge--xs badge--warning">B</span>
                              }
                              <i class="pi pi-times chip-remove" (click)="onRemoveChildFromStudent(person, child)"></i>
                            </div>
                          }
                        </div>
                      }
                      <!-- Add child dropdown -->
                      @if (getAvailableChildrenForStudent(person).length > 0) {
                        <div class="add-child-dropdown">
                          <div class="add-child-dropdown__trigger" (click)="toggleChildDropdown(person.id)">
                            <i class="pi pi-plus"></i>
                            <span>Add Child</span>
                            <i class="pi" [ngClass]="openDropdownId() === person.id ? 'pi-chevron-up' : 'pi-chevron-down'"></i>
                          </div>
                          @if (openDropdownId() === person.id) {
                            <div class="add-child-dropdown__menu">
                              @for (child of getAvailableChildrenForStudent(person); track child.id) {
                                <div class="add-child-dropdown__option" (click)="onAddChildToStudent(person, child); closeDropdown()">
                                  <span>{{ child.name }}</span>
                                  @if (child.needsCarSeat) {
                                    <span class="badge badge--xs badge--danger" title="Car Seat">CS</span>
                                  }
                                  @if (child.needsBooster) {
                                    <span class="badge badge--xs badge--warning" title="Booster">B</span>
                                  }
                                </div>
                              }
                            </div>
                          }
                        </div>
                      }
                    }
                  </app-student-card>
                }
              </div>
            </p-tabpanel>

            <!-- =========================================== -->
            <!-- TAB 2: ADD NEW -->
            <!-- =========================================== -->
            <p-tabpanel value="1">
              <!-- Search bar -->
              <div class="search-box search-box--lg">
                <i class="pi pi-search"></i>
                <input
                  type="text"
                  pInputText
                  [(ngModel)]="addSearchQuery"
                  [placeholder]="searchPlaceholder()"
                  (input)="filterStudentOptions()"
                />
              </div>

              <div class="dialog-content">
                @if (filteredStudentOptions().length === 0) {
                  <div class="empty-state empty-state--flex">
                    <i class="pi pi-users"></i>
                    <p>{{ addSearchQuery ? 'No matches found' : 'No people available to add' }}</p>
                  </div>
                }

                @for (person of filteredStudentOptions(); track person.value) {
                  <app-student-card
                    [name]="person.label"
                    [avatarInitials]="getInitials(person.label)"
                    [secondaryText]="person.llNumber ? 'LL#: ' + person.llNumber : ''"
                    [actionType]="'add'"
                    [actionTooltip]="getAddTooltip(person)"
                    [actionDisabled]="!canAdd(person)"
                    [variant]="config().variant"
                    (onAction)="selectStudent(person, false)"
                  >
                    <!-- Seats badge for transportation -->
                    <div slot="actions">
                      @if (config().variant === 'transportation' && hasChildren(person)) {
                        <span class="seats-badge">
                          {{ getSeatsNeeded(person) }} seat{{ getSeatsNeeded(person) > 1 ? 's' : '' }}
                        </span>
                      }
                      @if (config().allowTransitory && config().variant === 'transportation') {
                        <button
                          pButton
                          type="button"
                          icon="pi pi-plus"
                          class="person-card__btn person-card__btn--purple"
                          [pTooltip]="getTransitoryTooltip(person)"
                          [disabled]="!canAddTransitory(person)"
                          (click)="selectStudent(person, true); $event.stopPropagation()"
                        ></button>
                      }
                    </div>

                    <!-- Children section for childcare (shown directly, no accordion) -->
                    @if (config().variant === 'childcare' && hasChildren(person)) {
                      <div class="children-section-direct">
                        @if (childrenSelectorTemplate && config().showChildrenCheckboxes) {
                          <ng-container
                            [ngTemplateOutlet]="childrenSelectorTemplate"
                            [ngTemplateOutletContext]="getStudentOptionContext(person)"
                          ></ng-container>
                        } @else {
                          <!-- Built-in children checkboxes -->
                          <div class="checkboxes-group">
                            @for (child of person.children; track child.id) {
                              <div class="checkbox-row checkbox-row--compact">
                                <p-checkbox
                                  [inputId]="'child-' + person.value + '-' + child.id"
                                  [(ngModel)]="child.selected"
                                  [binary]="true"
                                ></p-checkbox>
                                <label [for]="'child-' + person.value + '-' + child.id" class="checkbox-label">
                                  <span class="checkbox-name">{{ child.name }}</span>
                                  @if (child.needsCarSeat) {
                                    <span class="badge badge--xs badge--danger" title="Car Seat">CS</span>
                                  }
                                  @if (child.needsBooster) {
                                    <span class="badge badge--xs badge--warning" title="Booster">B</span>
                                  }
                                </label>
                              </div>
                            }
                          </div>
                        }
                      </div>
                    }

                    <!-- Expandable sections for transportation (children + address) -->
                    @if (config().variant === 'transportation' && (hasChildren(person) || config().requireAddress)) {
                      <div class="expandable-sections">
                        <p-accordion
                          [multiple]="true"
                          expandIcon="pi pi-chevron-down"
                          collapseIcon="pi pi-chevron-up"
                          [value]="expandedPanels()[person.value] || []"
                          (valueChange)="onAccordionChange(person.value, $event)"
                        >
                          <!-- Children Section -->
                          @if (hasChildren(person)) {
                            <p-accordion-panel value="children">
                              <p-accordion-header>
                                <div class="accordion-header">
                                  <app-baby-icon size="16" strokeWidth="2"></app-baby-icon>
                                  <span>Children ({{ getSelectedChildrenCount(person) }}/{{ person.children!.length }} selected)</span>
                                </div>
                              </p-accordion-header>
                              <p-accordion-content>
                                @if (childrenSelectorTemplate && config().showChildrenCheckboxes) {
                                  <ng-container
                                    [ngTemplateOutlet]="childrenSelectorTemplate"
                                    [ngTemplateOutletContext]="getStudentOptionContext(person)"
                                  ></ng-container>
                                } @else {
                                  <!-- Built-in children checkboxes -->
                                  <div class="checkboxes-group">
                                    @for (child of person.children; track child.id) {
                                      <div class="checkbox-row checkbox-row--compact">
                                        <p-checkbox
                                          [inputId]="'child-' + person.value + '-' + child.id"
                                          [(ngModel)]="child.selected"
                                          [binary]="true"
                                        ></p-checkbox>
                                        <label [for]="'child-' + person.value + '-' + child.id" class="checkbox-label">
                                          <span class="checkbox-name">{{ child.name }}</span>
                                          @if (child.needsCarSeat) {
                                            <span class="badge badge--xs badge--danger" title="Car Seat">CS</span>
                                          }
                                          @if (child.needsBooster) {
                                            <span class="badge badge--xs badge--warning" title="Booster">B</span>
                                          }
                                        </label>
                                      </div>
                                    }
                                  </div>
                                }
                              </p-accordion-content>
                            </p-accordion-panel>
                          }

                          <!-- Address Section -->
                          @if (config().requireAddress) {
                            <p-accordion-panel value="address">
                              <p-accordion-header>
                                <div class="accordion-header">
                                  <i class="pi pi-map-marker"></i>
                                  <span>
                                    Pickup Address
                                    @if (!selectedAddresses[person.value]) {
                                      <span class="required-indicator">*</span>
                                    }
                                    @if (getSelectedAddressLabel(person)) {
                                      <span class="selected-preview">- {{ getSelectedAddressLabel(person) }}</span>
                                    }
                                  </span>
                                </div>
                              </p-accordion-header>
                              <p-accordion-content>
                                <app-address-picker
                                  [studentId]="person.value"
                                  [initialAddresses]="getAddressesForStudent(person.value).length > 0 ? getAddressesForStudent(person.value) : (person.addresses || [])"
                                  [selectedAddressId]="selectedAddresses[person.value] || null"
                                  [autoLoad]="getAddressesForStudent(person.value).length === 0 && (!person.addresses || person.addresses.length === 0)"
                                  [allowAdd]="true"
                                  [allowEdit]="true"
                                  (addressSelected)="onAddressSelectedForOption(person, $event)"
                                  (addressAdded)="onAddressAddedForOption(person, $event)"
                                  (addressDeleted)="onAddressDeletedForOption(person, $event)"
                                ></app-address-picker>
                              </p-accordion-content>
                            </p-accordion-panel>
                          }
                        </p-accordion>
                      </div>
                    }
                  </app-student-card>
                }
              </div>
            </p-tabpanel>
          </p-tabpanels>
        </p-tabs>

        <ng-template pTemplate="footer">
          <div class="dialog-footer">
            <p-button label="Done" icon="pi pi-check" (onClick)="onClose()"></p-button>
          </div>
        </ng-template>
      }
    </p-dialog>
  `,
  styleUrls: ['./student-selector-dialog.component.scss'],
})
export class StudentSelectorDialogComponent implements OnChanges {
  private studentService = inject(StudentService);

  // Content projection templates
  @ContentChild('childrenDisplay') childrenDisplayTemplate?: TemplateRef<AssignedStudentContext>;
  @ContentChild('childrenSelector') childrenSelectorTemplate?: TemplateRef<StudentOptionContext>;

  // Inputs
  visible = model(false);
  people = input<StudentOption[]>([]);
  assignedPeople = input<AssignedStudent[]>([]);
  config = input<StudentSelectorConfig>({
    variant: 'transportation',
    title: 'Manage Students',
    showChildrenCheckboxes: true,
  });

  // Outputs
  studentSelected = output<StudentSelection>();
  studentRemoved = output<AssignedStudent>();
  childAdded = output<ChildActionEvent>();
  childRemoved = output<ChildActionEvent>();
  addressChanged = output<AddressChangeEvent>();

  // Search state
  manageSearchQuery = '';
  addSearchQuery = '';

  // Filtered lists
  filteredAssignedItems = signal<AssignedStudent[]>([]);
  filteredStudentOptions = signal<StudentOption[]>([]);

  // UI state
  openDropdownId = signal<string | null>(null);
  selectedAddresses: Record<string, string> = {};
  selectedAddressLabels: Record<string, string> = {};
  expandedPanels = signal<Record<string, string[]>>({});
  editingAddressForStudent = signal<string | null>(null);

  // Address state for transportation variant
  studentAddresses = signal<Record<string, StudentAddress[]>>({});
  loadingAddresses = signal<Record<string, boolean>>({});

  constructor() {
    // Auto-load addresses when dialog opens for transportation variant
    effect(() => {
      if (this.visible() && this.config().variant === 'transportation' && this.config().requireAddress) {
        const peopleToLoad = this.people().filter(p =>
          !this.studentAddresses()[p.value] &&
          !this.loadingAddresses()[p.value] &&
          (!p.addresses || p.addresses.length === 0)
        );
        peopleToLoad.forEach(person => this.loadAddressesForStudent(person.value));
      }
    });
  }

  // Computed: does this variant show children?
  showsChildren = computed(() => {
    const variant = this.config().variant;
    return variant === 'transportation' || variant === 'childcare';
  });

  // Computed labels
  manageTabHeader = computed(() => {
    const labels = this.config().labels;
    if (labels?.manageTabHeader) return labels.manageTabHeader;

    const items = this.assignedPeople();
    const count = items.length;

    if (this.config().variant === 'transportation') {
      const totalSeats = items.reduce((sum, item) => sum + 1 + (item.children?.length || 0), 0);
      return `Passengers (${totalSeats})`;
    }

    switch (this.config().variant) {
      case 'class': return `Enrolled (${count})`;
      case 'childcare': return `Enrolled Children (${count})`;
      case 'attendance': return `Students (${count})`;
      default: return `Items (${count})`;
    }
  });

  addTabHeader = computed(() => {
    const labels = this.config().labels;
    if (labels?.addTabHeader) return labels.addTabHeader;

    switch (this.config().variant) {
      case 'class': return 'Add Students';
      case 'childcare': return 'Add Children';
      case 'transportation': return 'Add Passengers';
      case 'attendance': return 'Add Students';
      default: return 'Add';
    }
  });

  emptyMessage = computed(() => {
    const labels = this.config().labels;
    if (labels?.emptyMessage) return labels.emptyMessage;

    switch (this.config().variant) {
      case 'class': return 'No students enrolled in this class';
      case 'childcare': return 'No children enrolled in this session';
      case 'transportation': return 'No passengers assigned to this route';
      case 'attendance': return 'No students in this session';
      default: return 'No items';
    }
  });

  removeTooltip = computed(() => {
    const labels = this.config().labels;
    if (labels?.removeTooltip) return labels.removeTooltip;

    switch (this.config().variant) {
      case 'class': return 'Remove from class';
      case 'childcare': return 'Unenroll child';
      case 'transportation': return 'Remove from route';
      case 'attendance': return 'Remove from session';
      default: return 'Remove';
    }
  });

  searchPlaceholder = computed(() => {
    const labels = this.config().labels;
    if (labels?.searchPlaceholder) return labels.searchPlaceholder;

    switch (this.config().variant) {
      case 'class': return 'Search by name or LL#...';
      case 'childcare': return 'Search by name or child name...';
      case 'transportation': return 'Search by name or LL#...';
      case 'attendance': return 'Search by name or LL#...';
      default: return 'Search...';
    }
  });

  ngOnChanges(changes: SimpleChanges) {
    if (changes['people'] || changes['visible'] || changes['assignedPeople']) {
      this.filterAssignedItems();
      this.filterStudentOptions();
    }
  }

  // ===========================================
  // FILTERING
  // ===========================================

  filterAssignedItems() {
    let filtered = this.assignedPeople();

    if (this.manageSearchQuery.trim()) {
      const query = this.manageSearchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const nameMatch = (p.studentName || '').toLowerCase().includes(query);
        const llMatch = (p.llNumber || '').toLowerCase().includes(query);
        const childMatch = this.showsChildren() &&
          p.children?.some(c => c.name.toLowerCase().includes(query));
        return nameMatch || llMatch || childMatch;
      });
    }

    this.filteredAssignedItems.set(filtered);
  }

  filterStudentOptions() {
    const excludeIds = new Set(this.config().excludeStudentIds || []);
    let filtered = this.people().filter(p => !excludeIds.has(p.value));

    if (this.addSearchQuery.trim()) {
      const query = this.addSearchQuery.toLowerCase();
      filtered = filtered.filter(p => {
        const nameMatch = p.label.toLowerCase().includes(query);
        const llMatch = (p.llNumber || '').toLowerCase().includes(query);
        const childMatch = this.showsChildren() &&
          p.children?.some(c => c.name.toLowerCase().includes(query));
        return nameMatch || llMatch || childMatch;
      });
    }

    this.filteredStudentOptions.set(filtered);
  }

  // ===========================================
  // HELPERS
  // ===========================================

  getInitials(name: string): string {
    return getInitials(name);
  }

  formatDate(dateStr: string): string {
    return formatDate(dateStr);
  }

  hasChildren(person: StudentOption): boolean {
    return !!person.children && person.children.length > 0;
  }

  getStudentBadges(person: AssignedStudent): StudentBadge[] {
    const badges: StudentBadge[] = [];
    if (person.isTransitory) {
      badges.push({ text: 'TODAY ONLY', variant: 'purple' });
    }
    if (person.needsCarSeat) {
      badges.push({ text: 'CAR SEAT', variant: 'danger', tooltip: 'Needs car seat' });
    }
    if (person.needsBooster) {
      badges.push({ text: 'BOOSTER', variant: 'warning', tooltip: 'Needs booster seat' });
    }
    return badges;
  }

  getSecondaryText(person: AssignedStudent): string {
    if (person.llNumber) {
      return `LL#: ${person.llNumber}`;
    }
    if (person.requestDate) {
      return `Added ${this.formatDate(person.requestDate)}`;
    }
    return '';
  }

  getAvailableChildrenForStudent(person: AssignedStudent): Child[] {
    const allChildren = person.availableChildren || [];
    const assignedChildIds = new Set((person.children || []).map(c => c.id));
    return allChildren.filter(c => !assignedChildIds.has(c.id));
  }

  getAssignedStudentContext(student: AssignedStudent): AssignedStudentContext {
    return {
      $implicit: student,
      student,
      assignedChildren: student.children || [],
      availableChildren: this.getAvailableChildrenForStudent(student),
      onAddChild: (child: Child) => this.onAddChildToStudent(student, child),
      onRemoveChild: (child: Child) => this.onRemoveChildFromStudent(student, child),
    };
  }

  getStudentOptionContext(student: StudentOption): StudentOptionContext {
    return {
      $implicit: student,
      student,
      children: student.children || [],
    };
  }

  getSelectedChildrenCount(person: StudentOption): number {
    if (!person.children) return 0;
    return person.children.filter(c => c.selected).length;
  }

  getSeatsNeeded(person: StudentOption): number {
    return 1 + this.getSelectedChildrenCount(person);
  }

  // ===========================================
  // CAPACITY & VALIDATION
  // ===========================================

  canAdd(person: StudentOption): boolean {
    if (this.config().variant === 'transportation' && this.config().requireAddress) {
      if (!this.hasValidAddress(person)) return false;
    }

    const capacityInfo = this.config().capacityInfo;
    if (!capacityInfo) return true;

    if (this.config().variant === 'class' || this.config().variant === 'attendance') {
      return capacityInfo.available >= 1;
    }

    return this.getSeatsNeeded(person) <= capacityInfo.available;
  }

  canAddTransitory(person: StudentOption): boolean {
    if (!this.config().isViewingToday) return false;
    return this.canAdd(person);
  }

  hasValidAddress(person: StudentOption): boolean {
    if (!this.config().requireAddress) return true;
    return !!this.selectedAddresses[person.value];
  }

  getAddTooltip(person: StudentOption): string {
    if (this.config().variant === 'class') {
      const capacityInfo = this.config().capacityInfo;
      if (capacityInfo && capacityInfo.available < 1) return 'Class is full';
      return 'Add to class';
    }

    if (this.config().variant === 'transportation' && this.config().requireAddress && !this.hasValidAddress(person)) {
      return 'Select or add a pickup address first';
    }

    const capacityInfo = this.config().capacityInfo;
    if (!capacityInfo) return 'Add';

    const seats = this.getSeatsNeeded(person);
    const available = capacityInfo.available;

    if (seats > available) {
      return `Not enough seats (${seats} needed, ${available} available)`;
    }

    return 'Add';
  }

  getTransitoryTooltip(person: StudentOption): string {
    if (!this.config().isViewingToday) return 'Transitory passengers can only be added for today';

    const capacityInfo = this.config().capacityInfo;
    if (!capacityInfo) return 'Add for today only';

    const seats = this.getSeatsNeeded(person);
    const available = capacityInfo.available;

    if (seats > available) {
      return `Not enough seats (${seats} needed, ${available} available)`;
    }

    return 'Add for today only';
  }

  // ===========================================
  // ACTIONS
  // ===========================================

  selectStudent(student: StudentOption, isTransitory: boolean) {
    const selectedChildren: Child[] = this.showsChildren() && student.children
      ? student.children.filter(c => c.selected)
      : [];

    let addressId: string | undefined;
    let address: string | undefined;

    if (this.config().variant === 'transportation' && this.config().requireAddress) {
      addressId = this.selectedAddresses[student.value];
      address = this.selectedAddressLabels[student.value];
    }

    const selection: StudentSelection = {
      studentId: student.value,
      studentName: student.label,
      selectedChildren,
      totalSeats: 1 + selectedChildren.length,
      isTransitory,
      addressId,
      address,
    };

    this.studentSelected.emit(selection);

    // Reset selections
    if (student.children) {
      student.children.forEach((c: Child) => c.selected = false);
    }
    delete this.selectedAddresses[student.value];
    delete this.selectedAddressLabels[student.value];
  }

  onRemoveStudent(student: AssignedStudent) {
    this.studentRemoved.emit(student);
  }

  onAddChildToStudent(student: AssignedStudent, child: Child) {
    this.childAdded.emit({ student, child });
  }

  onRemoveChildFromStudent(student: AssignedStudent, child: Child) {
    this.childRemoved.emit({ student, child });
  }

  toggleChildDropdown(studentId: string) {
    this.openDropdownId.set(this.openDropdownId() === studentId ? null : studentId);
  }

  closeDropdown() {
    this.openDropdownId.set(null);
  }

  // ===========================================
  // ACCORDION
  // ===========================================

  onAccordionChange(studentId: string, expandedValues: string | number | string[] | number[]) {
    const values = Array.isArray(expandedValues)
      ? expandedValues.map(v => String(v))
      : [String(expandedValues)].filter(v => v !== 'undefined' && v !== 'null');
    this.expandedPanels.update(state => ({ ...state, [studentId]: values }));
  }

  // ===========================================
  // ADDRESS PICKER HANDLERS
  // ===========================================

  getSelectedAddressLabel(person: StudentOption): string {
    return this.selectedAddressLabels[person.value] || '';
  }

  toggleAddressEditForStudent(studentId: string) {
    if (this.editingAddressForStudent() === studentId) {
      this.editingAddressForStudent.set(null);
    } else {
      this.editingAddressForStudent.set(studentId);
    }
  }

  onAddressSelectedForAssigned(student: AssignedStudent, address: StudentAddress) {
    this.addressChanged.emit({
      student,
      newAddressId: address.id,
      newAddress: address.address,
    });
    this.editingAddressForStudent.set(null);
  }

  onAddressSelectedForOption(person: StudentOption, address: StudentAddress) {
    this.selectedAddresses[person.value] = address.id;
    this.selectedAddressLabels[person.value] = address.nickname || address.address;
  }

  onAddressAddedForOption(person: StudentOption, address: StudentAddress) {
    this.selectedAddresses[person.value] = address.id;
    this.selectedAddressLabels[person.value] = address.nickname || address.address;
  }

  onAddressDeletedForOption(person: StudentOption, address: StudentAddress) {
    if (this.selectedAddresses[person.value] === address.id) {
      delete this.selectedAddresses[person.value];
      delete this.selectedAddressLabels[person.value];
    }
  }

  /**
   * Load addresses for a student from the backend
   */
  loadAddressesForStudent(studentId: string) {
    this.loadingAddresses.update(state => ({ ...state, [studentId]: true }));

    this.studentService.getStudentAddresses(studentId).subscribe({
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

        this.studentAddresses.update(state => ({ ...state, [studentId]: addresses }));

        // Auto-select default address if one exists
        const defaultAddr = addresses.find(a => a.isDefault);
        if (defaultAddr && !this.selectedAddresses[studentId]) {
          this.selectedAddresses[studentId] = defaultAddr.id;
          this.selectedAddressLabels[studentId] = defaultAddr.nickname || defaultAddr.address;
        }

        this.loadingAddresses.update(state => ({ ...state, [studentId]: false }));
      },
      error: () => {
        this.loadingAddresses.update(state => ({ ...state, [studentId]: false }));
      }
    });
  }

  /**
   * Get addresses for a student (from loaded state or initial input)
   */
  getAddressesForStudent(studentId: string): StudentAddress[] {
    return this.studentAddresses()[studentId] || [];
  }

  // ===========================================
  // CLOSE
  // ===========================================

  onClose() {
    this.visible.set(false);
    this.manageSearchQuery = '';
    this.addSearchQuery = '';
    this.openDropdownId.set(null);
    this.selectedAddresses = {};
    this.selectedAddressLabels = {};
    this.expandedPanels.set({});
    this.editingAddressForStudent.set(null);
    // Clear address state
    this.studentAddresses.set({});
    this.loadingAddresses.set({});
  }
}

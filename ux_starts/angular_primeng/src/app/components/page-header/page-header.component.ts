import { Component, input, computed, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';
import { CoordinatorService } from '../../services/coordinator.service';

export interface ViewingAsOption {
  label: string;
  value: string;
}

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [CommonModule, FormsModule, Select],
  template: `
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">{{ title() }}</h1>
        @if (coordinatorOptions().length > 0) {
          <div class="coordinator-card">
            <span class="coordinator-label">
              <i class="pi pi-user"></i>
              Viewing as
            </span>
            <p-select
              class="coordinator-select"
              [options]="coordinatorOptions()"
              [ngModel]="selectedCoordinatorId()"
              (ngModelChange)="onCoordinatorChange($event)"
              optionLabel="label"
              optionValue="value"
            ></p-select>
          </div>
        }
      </div>

      <div class="header-right">
        <ng-content></ng-content>
      </div>
    </div>
  `,
  styleUrls: ['./page-header.component.scss'],
})
export class PageHeaderComponent implements OnInit {
  // Inputs
  title = input.required<string>();

  constructor(private coordinatorService: CoordinatorService) {}

  ngOnInit() {
    // Load coordinators once when the header is initialized
    if (this.coordinatorService.coordinators().length === 0) {
      this.coordinatorService.loadCoordinators();
    }
  }

  // Coordinator options mapped from service (includes "All Coordinators" option)
  coordinatorOptions = computed(() => {
    return this.coordinatorService.getAllCoordinatorOptions().map((c) => ({
      label: c.name,
      value: c.id,
    }));
  });
  selectedCoordinatorId = computed(() => this.coordinatorService.selectedCoordinatorId());
  onCoordinatorChange(coordinatorId: string) {
    this.coordinatorService.selectCoordinator(coordinatorId);
  }
}

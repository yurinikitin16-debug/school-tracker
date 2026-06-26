import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AttendanceReason } from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';
import { AcademicCalendarSettingsComponent } from './academic-calendar-settings.component';

type ReasonFilter = 'active' | 'all';
type SettingsSection = 'reasons' | 'calendar';

@Component({
  selector: 'app-settings-page',
  imports: [
    CommonModule,
    FormsModule,
    UiEmptyStateComponent,
    UiIconComponent,
    UiInputComponent,
    UiPageHeaderComponent,
    UiSelectComponent,
    UiSidePanelComponent,
    UiToolbarComponent,
    AcademicCalendarSettingsComponent,
  ],
  templateUrl: './settings-page.component.html',
  styleUrl: './settings-page.component.scss',
})
export class SettingsPageComponent {
  private readonly schoolData = inject(SchoolDataService);

  readonly activeSection = signal<SettingsSection>('reasons');
  readonly reasons = signal<AttendanceReason[]>([]);
  readonly searchTerm = signal('');
  readonly selectedFilter = signal<ReasonFilter>('active');
  readonly selectedReasonId = signal<number | null>(null);
  readonly draftCode = signal('');
  readonly draftName = signal('');
  readonly draftIsActive = signal(true);

  readonly filterOptions: UiSelectOption[] = [
    { label: 'Активні', value: 'active' },
    { label: 'Усі причини', value: 'all' },
  ];

  readonly visibleReasons = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.reasons().filter((reason) => {
      const filterMatches = this.selectedFilter() === 'all' || reason.isActive;
      const queryMatches = !query || `${reason.code} ${reason.name}`.toLowerCase().includes(query);
      return filterMatches && queryMatches;
    });
  });

  readonly isPanelOpen = computed(() => this.selectedReasonId() !== null);
  readonly panelTitle = computed(() => this.selectedReasonId() === 0 ? 'Додати причину' : 'Редагувати причину');

  constructor() {
    this.schoolData.getAttendanceReasons().subscribe((reasons) => {
      this.reasons.set(reasons.map((reason) => ({ ...reason })));
    });
  }

  selectSection(section: SettingsSection): void {
    this.activeSection.set(section);
    this.closePanel();
  }

  updateFilter(value: string): void {
    this.selectedFilter.set(value as ReasonFilter);
  }

  openCreate(): void {
    this.selectedReasonId.set(0);
    this.draftCode.set('');
    this.draftName.set('');
    this.draftIsActive.set(true);
  }

  openEdit(reason: AttendanceReason): void {
    this.selectedReasonId.set(reason.id);
    this.draftCode.set(reason.code);
    this.draftName.set(reason.name);
    this.draftIsActive.set(reason.isActive);
  }

  closePanel(): void {
    this.selectedReasonId.set(null);
    this.draftCode.set('');
    this.draftName.set('');
    this.draftIsActive.set(true);
  }

  saveReason(): void {
    const code = this.draftCode().trim().toUpperCase();
    const name = this.draftName().trim();
    const selectedReasonId = this.selectedReasonId();

    if (!code || !name || selectedReasonId === null) {
      return;
    }

    if (selectedReasonId === 0) {
      const id = Math.max(0, ...this.reasons().map((reason) => reason.id)) + 1;
      this.reasons.update((reasons) => [...reasons, { id, code, name, isActive: this.draftIsActive() }]);
      this.closePanel();
      return;
    }

    this.reasons.update((reasons) => reasons.map((reason) => (
      reason.id === selectedReasonId
        ? { ...reason, code, name, isActive: this.draftIsActive() }
        : reason
    )));
    this.closePanel();
  }

  toggleReason(reason: AttendanceReason): void {
    this.reasons.update((reasons) => reasons.map((item) => (
      item.id === reason.id ? { ...item, isActive: !item.isActive } : item
    )));
  }
}

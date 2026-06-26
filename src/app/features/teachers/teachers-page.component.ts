import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Teacher } from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

@Component({
  selector: 'app-teachers-page',
  imports: [
    CommonModule,
    UiEmptyStateComponent,
    UiIconComponent,
    UiInputComponent,
    UiPageHeaderComponent,
    UiSidePanelComponent,
    UiToolbarComponent,
  ],
  templateUrl: './teachers-page.component.html',
  styleUrl: './teachers-page.component.scss',
})
export class TeachersPageComponent {
  private readonly schoolData = inject(SchoolDataService);

  readonly teachers = signal<Teacher[]>([]);
  readonly searchTerm = signal('');
  readonly selectedTeacherId = signal<number | null>(null);
  readonly draftFullName = signal('');
  readonly draftSubject = signal('');

  readonly rows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.teachers()
      .filter((teacher) => !query || `${teacher.fullName} ${teacher.subject}`.toLowerCase().includes(query))
      .sort((first, second) => first.fullName.localeCompare(second.fullName, 'uk'));
  });

  readonly isPanelOpen = computed(() => this.selectedTeacherId() !== null);
  readonly isCreatingTeacher = computed(() => this.selectedTeacherId() === 0);
  readonly panelTitle = computed(() => this.isCreatingTeacher() ? 'Додати вчителя' : 'Редагувати вчителя');

  constructor() {
    this.schoolData.getTeachers().subscribe((teachers) => this.teachers.set(teachers));
  }

  openCreate(): void {
    this.selectedTeacherId.set(0);
    this.draftFullName.set('');
    this.draftSubject.set('');
  }

  openEdit(teacher: Teacher): void {
    this.selectedTeacherId.set(teacher.id);
    this.draftFullName.set(teacher.fullName);
    this.draftSubject.set(teacher.subject);
  }

  closePanel(): void {
    this.selectedTeacherId.set(null);
    this.draftFullName.set('');
    this.draftSubject.set('');
  }

  saveTeacher(): void {
    const fullName = this.draftFullName().trim();
    const subject = this.draftSubject().trim();
    const selectedTeacherId = this.selectedTeacherId();

    if (!fullName || !subject || selectedTeacherId === null) {
      return;
    }

    if (selectedTeacherId === 0) {
      const id = Math.max(0, ...this.teachers().map((teacher) => teacher.id)) + 1;
      this.teachers.update((teachers) => [...teachers, { id, fullName, subject }]);
      this.closePanel();
      return;
    }

    this.teachers.update((teachers) => teachers.map((teacher) => (
      teacher.id === selectedTeacherId ? { ...teacher, fullName, subject } : teacher
    )));
    this.closePanel();
  }
}

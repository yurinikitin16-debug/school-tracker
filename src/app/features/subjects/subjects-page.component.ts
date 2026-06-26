import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Subject } from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

@Component({
  selector: 'app-subjects-page',
  imports: [
    CommonModule,
    UiEmptyStateComponent,
    UiIconComponent,
    UiInputComponent,
    UiPageHeaderComponent,
    UiSidePanelComponent,
    UiToolbarComponent,
  ],
  templateUrl: './subjects-page.component.html',
  styleUrl: './subjects-page.component.scss',
})
export class SubjectsPageComponent {
  private readonly schoolData = inject(SchoolDataService);

  readonly subjects = signal<Subject[]>([]);
  readonly searchTerm = signal('');
  readonly selectedSubjectId = signal<number | null>(null);
  readonly draftName = signal('');

  readonly rows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();
    return this.subjects()
      .filter((subject) => subject.isActive)
      .filter((subject) => !query || subject.name.toLowerCase().includes(query))
      .sort((first, second) => first.name.localeCompare(second.name, 'uk'));
  });

  readonly isPanelOpen = computed(() => this.selectedSubjectId() !== null);
  readonly isCreatingSubject = computed(() => this.selectedSubjectId() === 0);
  readonly panelTitle = computed(() => this.isCreatingSubject() ? 'Додати предмет' : 'Редагувати предмет');

  constructor() {
    this.schoolData.getSubjects().subscribe((subjects) => this.subjects.set(subjects.map((subject) => ({ ...subject }))));
  }

  openCreate(): void {
    this.selectedSubjectId.set(0);
    this.draftName.set('');
  }

  openEdit(subject: Subject): void {
    this.selectedSubjectId.set(subject.id);
    this.draftName.set(subject.name);
  }

  closePanel(): void {
    this.selectedSubjectId.set(null);
    this.draftName.set('');
  }

  saveSubject(): void {
    const name = this.draftName().trim();
    const selectedSubjectId = this.selectedSubjectId();

    if (!name || selectedSubjectId === null) {
      return;
    }

    if (selectedSubjectId === 0) {
      const id = Math.max(0, ...this.subjects().map((subject) => subject.id)) + 1;
      this.subjects.update((subjects) => [...subjects, { id, name, isActive: true }]);
      this.closePanel();
      return;
    }

    this.subjects.update((subjects) => subjects.map((subject) => (
      subject.id === selectedSubjectId ? { ...subject, name } : subject
    )));
    this.closePanel();
  }
}

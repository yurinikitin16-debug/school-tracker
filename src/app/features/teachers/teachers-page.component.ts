import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { Subject, Teacher } from '../../core/models/school.models';
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
  readonly subjects = signal<Subject[]>([]);
  readonly searchTerm = signal('');
  readonly selectedTeacherId = signal<number | null>(null);
  readonly draftFullName = signal('');
  readonly draftSubjectIds = signal<number[]>([]);
  readonly draftIsClassTeacher = signal(false);

  readonly rows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.teachers()
      .filter((teacher) => !query || `${teacher.fullName} ${this.subjectNames(teacher).join(' ')}`.toLowerCase().includes(query))
      .sort((first, second) => first.fullName.localeCompare(second.fullName, 'uk'));
  });

  readonly isPanelOpen = computed(() => this.selectedTeacherId() !== null);
  readonly isCreatingTeacher = computed(() => this.selectedTeacherId() === 0);
  readonly panelTitle = computed(() => this.isCreatingTeacher() ? 'Додати вчителя' : 'Редагувати вчителя');

  constructor() {
    forkJoin({
      teachers: this.schoolData.getTeachers(),
      subjects: this.schoolData.getSubjects(),
    }).subscribe(({ teachers, subjects }) => {
      this.teachers.set(teachers.map((teacher) => ({ ...teacher, subjectIds: this.teacherSubjectIds(teacher, subjects) })));
      this.subjects.set(subjects);
    });
  }

  openCreate(): void {
    this.selectedTeacherId.set(0);
    this.draftFullName.set('');
    this.draftSubjectIds.set([]);
    this.draftIsClassTeacher.set(false);
  }

  openEdit(teacher: Teacher): void {
    this.selectedTeacherId.set(teacher.id);
    this.draftFullName.set(teacher.fullName);
    this.draftSubjectIds.set(this.teacherSubjectIds(teacher, this.subjects()));
    this.draftIsClassTeacher.set(Boolean(teacher.isClassTeacher));
  }

  closePanel(): void {
    this.selectedTeacherId.set(null);
    this.draftFullName.set('');
    this.draftSubjectIds.set([]);
    this.draftIsClassTeacher.set(false);
  }

  subjectNames(teacher: Teacher): string[] {
    const subjectIds = this.teacherSubjectIds(teacher, this.subjects());

    return this.subjects()
      .filter((subject) => subjectIds.includes(subject.id))
      .map((subject) => subject.name);
  }

  isDraftSubjectSelected(subjectId: number): boolean {
    return this.draftSubjectIds().includes(subjectId);
  }

  toggleDraftSubject(subjectId: number, checked: boolean): void {
    this.draftSubjectIds.update((subjectIds) => (
      checked
        ? [...new Set([...subjectIds, subjectId])]
        : subjectIds.filter((id) => id !== subjectId)
    ));
  }

  saveTeacher(): void {
    const fullName = this.draftFullName().trim();
    const subjectIds = this.draftSubjectIds();
    const selectedTeacherId = this.selectedTeacherId();

    if (!fullName || !subjectIds.length || selectedTeacherId === null) {
      return;
    }

    if (selectedTeacherId === 0) {
      const id = Math.max(0, ...this.teachers().map((teacher) => teacher.id)) + 1;
      this.teachers.update((teachers) => [...teachers, {
        id,
        fullName,
        subject: this.subjects().find((subject) => subject.id === subjectIds[0])?.name,
        subjectIds,
        isClassTeacher: this.draftIsClassTeacher(),
      }]);
      this.closePanel();
      return;
    }

    this.teachers.update((teachers) => teachers.map((teacher) => (
      teacher.id === selectedTeacherId
        ? {
          ...teacher,
          fullName,
          subject: this.subjects().find((subject) => subject.id === subjectIds[0])?.name,
          subjectIds,
          isClassTeacher: this.draftIsClassTeacher(),
        }
        : teacher
    )));
    this.closePanel();
  }

  private teacherSubjectIds(teacher: Teacher, subjects: Subject[]): number[] {
    if (teacher.subjectIds?.length) {
      return teacher.subjectIds;
    }

    return subjects
      .filter((subject) => subject.name === teacher.subject)
      .map((subject) => subject.id);
  }
}

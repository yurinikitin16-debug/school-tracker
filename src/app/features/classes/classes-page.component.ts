import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SchoolClass, Student } from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

@Component({
  selector: 'app-classes-page',
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
  ],
  templateUrl: './classes-page.component.html',
  styleUrl: './classes-page.component.scss',
})
export class ClassesPageComponent {
  private readonly schoolData = inject(SchoolDataService);
  private readonly academicYear = inject(AcademicYearService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly students = signal<Student[]>([]);
  readonly searchTerm = signal('');
  readonly selectedYear = signal(this.academicYear.currentYear());
  readonly selectedClassId = signal<number | null>(null);
  readonly selectedStudentsClassId = signal<number | null>(null);
  readonly studentSearchTerm = signal('');
  readonly draftName = signal('');
  readonly draftAcademicYear = signal('');
  readonly isAcademicYearOverrideEnabled = signal(false);
  readonly editorMode = signal<'class' | 'student'>('class');
  readonly draftStudentLastName = signal('');
  readonly draftStudentFirstName = signal('');
  readonly draftStudentMiddleName = signal('');
  readonly draftStudentBirthDate = signal('');

  readonly yearOptions = computed<UiSelectOption[]>(() =>
    [...new Set(this.classes().map((schoolClass) => schoolClass.academicYear))]
      .sort()
      .reverse()
      .map((year) => ({ label: year, value: year })),
  );

  readonly rows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.classes()
      .filter((schoolClass) => schoolClass.academicYear === this.selectedYear())
      .filter((schoolClass) => schoolClass.isActive)
      .filter((schoolClass) => !query || schoolClass.name.toLowerCase().includes(query))
      .map((schoolClass) => ({
        schoolClass,
        studentsCount: this.students().filter((student) => student.className === schoolClass.name && student.isActive).length,
      }));
  });

  readonly isPanelOpen = computed(() => this.selectedClassId() !== null);
  readonly isCreatingClass = computed(() => this.selectedClassId() === 0);
  readonly panelTitle = computed(() => {
    if (this.editorMode() === 'student') {
      return this.selectedClass() ? `Додати учня · ${this.selectedClass()!.name}` : 'Додати учня';
    }

    return this.isCreatingClass() ? 'Додати клас' : 'Клас';
  });
  readonly selectedClass = computed(() =>
    this.classes().find((schoolClass) => schoolClass.id === this.selectedClassId()),
  );
  readonly selectedStudentsClass = computed(() =>
    this.classes().find((schoolClass) => schoolClass.id === this.selectedStudentsClassId()),
  );
  readonly isStudentsPanelOpen = computed(() => this.selectedStudentsClassId() !== null);
  readonly studentsPanelTitle = computed(() =>
    this.selectedStudentsClass() ? `Учні ${this.selectedStudentsClass()!.name}` : 'Учні класу',
  );
  readonly classStudents = computed(() => {
    const schoolClass = this.selectedStudentsClass();
    const query = this.studentSearchTerm().trim().toLowerCase();

    return schoolClass
      ? this.students()
        .filter((student) => student.className === schoolClass.name)
        .filter((student) => !query || `${student.lastName} ${student.firstName}`.toLowerCase().includes(query))
      : [];
  });

  constructor() {
    forkJoin({
      classes: this.schoolData.getClasses(),
      students: this.schoolData.getStudents(),
    }).subscribe(({ classes, students }) => {
      this.classes.set(classes);
      this.students.set(students);
      const presetYear = this.academicYear.currentYear();
      this.selectedYear.set(
        classes.some((schoolClass) => schoolClass.academicYear === presetYear)
          ? presetYear
          : classes.find((schoolClass) => schoolClass.isActive)?.academicYear ?? '',
      );
    });
  }

  updateYear(value: string): void {
    this.selectedYear.set(value);
  }

  openEdit(schoolClass: SchoolClass): void {
    this.selectedClassId.set(schoolClass.id);
    this.editorMode.set('class');
    this.draftName.set(schoolClass.name);
    this.draftAcademicYear.set(schoolClass.academicYear);
    this.isAcademicYearOverrideEnabled.set(false);
  }

  openCreate(): void {
    this.selectedClassId.set(0);
    this.editorMode.set('class');
    this.draftName.set('');
    this.draftAcademicYear.set(this.selectedYear());
    this.isAcademicYearOverrideEnabled.set(false);
  }

  closePanel(): void {
    this.selectedClassId.set(null);
    this.editorMode.set('class');
    this.draftName.set('');
    this.draftAcademicYear.set('');
    this.isAcademicYearOverrideEnabled.set(false);
    this.resetStudentDraft();
  }

  openStudentCreate(): void {
    this.editorMode.set('student');
    this.resetStudentDraft();
  }

  closeStudentCreate(): void {
    this.editorMode.set('class');
    this.resetStudentDraft();
  }

  saveStudent(): void {
    const schoolClass = this.selectedClass();
    const lastName = this.draftStudentLastName().trim();
    const firstName = this.draftStudentFirstName().trim();
    const middleName = this.draftStudentMiddleName().trim();
    const birthDate = this.draftStudentBirthDate();

    if (!schoolClass || !lastName || !firstName || !birthDate) {
      return;
    }

    const id = Math.max(0, ...this.students().map((student) => student.id)) + 1;
    this.students.update((students) => [...students, {
      id,
      lastName,
      firstName,
      middleName: middleName || undefined,
      birthDate,
      className: schoolClass.name,
      isActive: true,
    }]);
    this.closeStudentCreate();
  }

  openStudents(schoolClass: SchoolClass): void {
    this.selectedStudentsClassId.set(schoolClass.id);
    this.studentSearchTerm.set('');
  }

  closeStudentsPanel(): void {
    this.selectedStudentsClassId.set(null);
    this.studentSearchTerm.set('');
  }

  saveClass(): void {
    const name = this.draftName().trim();
    const selectedClassId = this.selectedClassId();

    if (!name || selectedClassId === null) {
      return;
    }

    if (selectedClassId === 0) {
      const id = Math.max(0, ...this.classes().map((schoolClass) => schoolClass.id)) + 1;
      this.classes.update((classes) => [...classes, {
        id,
        name,
        academicYear: this.draftAcademicYear(),
        isActive: true,
      }]);
      this.closePanel();
      return;
    }

    this.classes.update((classes) => classes.map((schoolClass) => (
      schoolClass.id === selectedClassId ? { ...schoolClass, name } : schoolClass
    )));
    this.closePanel();
  }

  archiveClass(): void {
    const selectedClassId = this.selectedClassId();

    if (selectedClassId === null) {
      return;
    }

    this.classes.update((classes) => classes.map((schoolClass) => (
      schoolClass.id === selectedClassId ? { ...schoolClass, isActive: false } : schoolClass
    )));
    this.closePanel();
  }

  promoteClass(): void {
    const selectedClass = this.selectedClass();

    if (!selectedClass) {
      return;
    }

    const nameMatch = selectedClass.name.match(/^(\d+)(.*)$/);
    const yearMatch = selectedClass.academicYear.match(/^(\d{4})\/(\d{4})$/);
    const nextName = nameMatch ? `${Number(nameMatch[1]) + 1}${nameMatch[2]}` : selectedClass.name;
    const nextYear = yearMatch ? `${Number(yearMatch[1]) + 1}/${Number(yearMatch[2]) + 1}` : selectedClass.academicYear;

    this.classes.update((classes) => classes.map((schoolClass) => (
      schoolClass.id === selectedClass.id
        ? { ...schoolClass, name: nextName, academicYear: nextYear }
        : schoolClass
    )));
    this.selectedYear.set(nextYear);
    this.closePanel();
  }

  private resetStudentDraft(): void {
    this.draftStudentLastName.set('');
    this.draftStudentFirstName.set('');
    this.draftStudentMiddleName.set('');
    this.draftStudentBirthDate.set('');
  }
}

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { SchoolClass, Student } from '../../core/models/school.models';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

@Component({
  selector: 'app-students-page',
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
  templateUrl: './students-page.component.html',
  styleUrl: './students-page.component.scss',
})
export class StudentsPageComponent {
  private readonly schoolData = inject(SchoolDataService);
  readonly academicYear = inject(AcademicYearService);

  readonly classes = signal<SchoolClass[]>([]);
  readonly students = signal<Student[]>([]);
  readonly selectedClass = signal('');
  readonly searchTerm = signal('');
  readonly selectedStudentId = signal<number | null>(null);
  readonly draftLastName = signal('');
  readonly draftFirstName = signal('');
  readonly draftMiddleName = signal('');
  readonly draftBirthDate = signal('');
  readonly draftClassName = signal('');

  readonly classOptions = computed<UiSelectOption[]>(() =>
    this.classes()
      .filter((schoolClass) => schoolClass.academicYear === this.academicYear.currentYear() && schoolClass.isActive)
      .sort((first, second) => first.name.localeCompare(second.name, 'uk'))
      .map((schoolClass) => ({ label: schoolClass.name, value: schoolClass.name })),
  );

  readonly rows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.students()
      .filter((student) => student.className === this.selectedClass())
      .filter((student) => !query || `${student.lastName} ${student.firstName}`.toLowerCase().includes(query))
      .sort((first, second) => `${first.lastName} ${first.firstName}`.localeCompare(
        `${second.lastName} ${second.firstName}`,
        'uk',
      ));
  });

  readonly isPanelOpen = computed(() => this.selectedStudentId() !== null);
  readonly isCreatingStudent = computed(() => this.selectedStudentId() === 0);
  readonly panelTitle = computed(() => this.isCreatingStudent() ? 'Додати учня' : 'Редагувати учня');

  constructor() {
    forkJoin({
      classes: this.schoolData.getClasses(),
      students: this.schoolData.getStudents(),
    }).subscribe(({ classes, students }) => {
      this.classes.set(classes);
      this.students.set(students);
      this.selectedClass.set(this.classOptions()[0]?.value ?? '');
    });
  }

  updateClass(className: string): void {
    this.selectedClass.set(className);
  }

  openCreate(): void {
    this.selectedStudentId.set(0);
    this.draftLastName.set('');
    this.draftFirstName.set('');
    this.draftMiddleName.set('');
    this.draftBirthDate.set('');
    this.draftClassName.set(this.selectedClass());
  }

  openEdit(student: Student): void {
    this.selectedStudentId.set(student.id);
    this.draftLastName.set(student.lastName);
    this.draftFirstName.set(student.firstName);
    this.draftMiddleName.set(student.middleName ?? '');
    this.draftBirthDate.set(student.birthDate);
    this.draftClassName.set(student.className);
  }

  closePanel(): void {
    this.selectedStudentId.set(null);
    this.draftLastName.set('');
    this.draftFirstName.set('');
    this.draftMiddleName.set('');
    this.draftBirthDate.set('');
    this.draftClassName.set('');
  }

  saveStudent(): void {
    const lastName = this.draftLastName().trim();
    const firstName = this.draftFirstName().trim();
    const middleName = this.draftMiddleName().trim();
    const birthDate = this.draftBirthDate();
    const className = this.draftClassName();
    const selectedStudentId = this.selectedStudentId();

    if (!lastName || !firstName || !birthDate || !className || selectedStudentId === null) {
      return;
    }

    if (selectedStudentId === 0) {
      const id = Math.max(0, ...this.students().map((student) => student.id)) + 1;
      this.students.update((students) => [...students, {
        id,
        firstName,
        lastName,
        middleName: middleName || undefined,
        birthDate,
        className,
        isActive: true,
      }]);
      this.selectedClass.set(className);
      this.closePanel();
      return;
    }

    this.students.update((students) => students.map((student) => (
      student.id === selectedStudentId
        ? { ...student, lastName, firstName, middleName: middleName || undefined, birthDate, className }
        : student
    )));
    this.selectedClass.set(className);
    this.closePanel();
  }

  formatBirthDate(date: string): string {
    return new Intl.DateTimeFormat('uk-UA', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(`${date}T12:00:00`));
  }
}

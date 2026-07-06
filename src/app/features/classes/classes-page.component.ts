import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Student } from '../../core/models/school.models';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { AcademicYearDto, AcademicYearsApiService } from '../../core/services/academic-years-api.service';
import { ClassDto, ClassesApiService } from '../../core/services/classes-api.service';
import { StudentDto, StudentsApiService } from '../../core/services/students-api.service';
import { SCHOOL_STAGE_LABELS, SCHOOL_STAGE_ORDER, SchoolStage, getSchoolStage } from '../../core/utils/school-stage';
import { UiConfirmDialogComponent } from '../../shared/ui/confirm-dialog/ui-confirm-dialog.component';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

interface ClassRow {
  schoolClass: ClassDto;
  studentsCount: number;
}

interface ClassStageGroup {
  stage: SchoolStage;
  label: string;
  rows: ClassRow[];
  studentsCount: number;
}

@Component({
  selector: 'app-classes-page',
  imports: [
    CommonModule,
    FormsModule,
    UiConfirmDialogComponent,
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
  private readonly academicYear = inject(AcademicYearService);
  private readonly academicYearsApi = inject(AcademicYearsApiService);
  private readonly classesApi = inject(ClassesApiService);
  private readonly studentsApi = inject(StudentsApiService);

  readonly academicYears = signal<AcademicYearDto[]>([]);
  readonly classes = signal<ClassDto[]>([]);
  readonly students = signal<Student[]>([]);
  readonly searchTerm = signal('');
  readonly selectedYear = signal(this.academicYear.currentYear());
  readonly selectedClassId = signal<number | null>(null);
  readonly isCreatingClass = signal(false);
  readonly selectedStudentsClassId = signal<number | null>(null);
  readonly selectedClassStudentId = signal<number | null>(null);
  readonly deletingStudentId = signal<number | null>(null);
  readonly isCreatingClassStudent = signal(false);
  readonly isBulkAddingClassStudents = signal(false);
  readonly studentSearchTerm = signal('');
  readonly draftName = signal('');
  readonly draftAcademicYear = signal('');
  readonly isAcademicYearOverrideEnabled = signal(false);
  readonly draftStudentLastName = signal('');
  readonly draftStudentFirstName = signal('');
  readonly bulkStudentsText = signal('');
  readonly isLoading = signal(false);
  readonly isStudentsLoading = signal(false);

  readonly yearOptions = computed<UiSelectOption[]>(() =>
    this.academicYears().map((year) => ({ label: year.name, value: year.name })),
  );

  readonly rows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.classes()
      .filter((schoolClass) => schoolClass.isActive)
      .filter((schoolClass) => !query || schoolClass.name.toLowerCase().includes(query))
      .sort((a, b) => this.compareClassNames(a.name, b.name))
      .map((schoolClass) => ({
        schoolClass,
        studentsCount: schoolClass.studentsCount,
      }));
  });

  readonly groupedRows = computed<ClassStageGroup[]>(() => {
    const rowsByStage = new Map<SchoolStage, ClassRow[]>();

    this.rows().forEach((row) => {
      const stage = getSchoolStage(row.schoolClass.name);
      rowsByStage.set(stage, [...(rowsByStage.get(stage) ?? []), row]);
    });

    return SCHOOL_STAGE_ORDER
      .map((stage) => {
        const rows = rowsByStage.get(stage) ?? [];

        return {
          stage,
          label: SCHOOL_STAGE_LABELS[stage],
          rows,
          studentsCount: rows.reduce((total, row) => total + row.studentsCount, 0),
        };
      })
      .filter((group) => group.rows.length > 0);
  });
  readonly totalStudentsInSchool = computed(() =>
    this.classes()
      .filter((schoolClass) => schoolClass.isActive)
      .reduce((total, schoolClass) => total + schoolClass.studentsCount, 0),
  );

  readonly isPanelOpen = computed(() => this.isCreatingClass() || this.selectedClassId() !== null);
  readonly panelTitle = computed(() => this.isCreatingClass() ? 'Додати клас' : 'Клас');
  readonly selectedClass = computed(() =>
    this.classes().find((schoolClass) => schoolClass.id === this.selectedClassId()),
  );
  readonly selectedStudentsClass = computed(() =>
    this.classes().find((schoolClass) => schoolClass.id === this.selectedStudentsClassId()),
  );
  readonly deletingStudent = computed(() =>
    this.students().find((student) => student.id === this.deletingStudentId()),
  );
  readonly isStudentsPanelOpen = computed(() => this.selectedStudentsClassId() !== null);
  readonly studentsPanelTitle = computed(() =>
    this.isBulkAddingClassStudents()
      ? 'Додати учнів списком'
      : this.isStudentEditorOpen()
      ? this.isCreatingClassStudent()
        ? 'Додати учня'
        : 'Редагувати учня'
      : this.selectedStudentsClass() ? `Учні ${this.selectedStudentsClass()!.name}` : 'Учні класу',
  );
  readonly isStudentEditorOpen = computed(() => this.isCreatingClassStudent() || this.selectedClassStudentId() !== null);
  readonly parsedBulkStudents = computed(() => this.parseBulkStudents(this.bulkStudentsText()));
  readonly classStudents = computed(() => {
    const schoolClass = this.selectedStudentsClass();
    const query = this.studentSearchTerm().trim().toLowerCase();

    return schoolClass
      ? this.students()
        .filter((student) => student.className === schoolClass.name && student.isActive)
        .filter((student) => !query || `${student.lastName} ${student.firstName}`.toLowerCase().includes(query))
      : [];
  });

  constructor() {
    this.loadAcademicYears();
  }

  updateYear(value: string): void {
    this.selectedYear.set(value);
    this.loadClassesForSelectedYear();
  }

  openEdit(schoolClass: ClassDto): void {
    this.selectedClassId.set(schoolClass.id);
    this.isCreatingClass.set(false);
    this.draftName.set(schoolClass.name);
    this.draftAcademicYear.set(this.selectedYear());
    this.isAcademicYearOverrideEnabled.set(false);
  }

  openCreate(): void {
    this.selectedClassId.set(null);
    this.isCreatingClass.set(true);
    this.draftName.set('');
    this.draftAcademicYear.set(this.selectedYear());
    this.isAcademicYearOverrideEnabled.set(false);
  }

  closePanel(): void {
    this.selectedClassId.set(null);
    this.isCreatingClass.set(false);
    this.draftName.set('');
    this.draftAcademicYear.set('');
    this.isAcademicYearOverrideEnabled.set(false);
    this.resetStudentDraft();
  }

  openStudents(schoolClass: ClassDto): void {
    this.selectedStudentsClassId.set(schoolClass.id);
    this.studentSearchTerm.set('');
    this.closeClassStudentEditor();
    this.closeClassStudentBulkCreate();
    this.loadClassStudents(schoolClass);
  }

  closeStudentsPanel(): void {
    this.selectedStudentsClassId.set(null);
    this.studentSearchTerm.set('');
    this.students.set([]);
    this.closeDeleteStudentConfirmation();
    this.closeClassStudentEditor();
    this.closeClassStudentBulkCreate();
  }

  openClassStudentCreate(): void {
    this.closeClassStudentBulkCreate();
    this.isCreatingClassStudent.set(true);
    this.selectedClassStudentId.set(null);
    this.resetStudentDraft();
  }

  openClassStudentEdit(student: Student): void {
    this.closeClassStudentBulkCreate();
    this.isCreatingClassStudent.set(false);
    this.selectedClassStudentId.set(student.id);
    this.draftStudentLastName.set(student.lastName);
    this.draftStudentFirstName.set(student.firstName);
  }

  closeClassStudentEditor(): void {
    this.isCreatingClassStudent.set(false);
    this.selectedClassStudentId.set(null);
    this.resetStudentDraft();
  }

  requestDeleteStudent(student: Student): void {
    this.deletingStudentId.set(student.id);
  }

  closeDeleteStudentConfirmation(): void {
    this.deletingStudentId.set(null);
  }

  confirmDeleteStudent(): void {
    const student = this.deletingStudent();
    const schoolClass = this.selectedStudentsClass();

    if (!student || !schoolClass) {
      this.closeDeleteStudentConfirmation();
      return;
    }

    this.studentsApi.updateStudent(student.id, { isActive: false }).subscribe((updatedStudent) => {
      this.students.update((students) => students.map((item) => (
        item.id === student.id ? this.mapStudent(updatedStudent, schoolClass.name) : item
      )));
      this.classes.update((classes) => classes.map((item) => (
        item.id === schoolClass.id
          ? { ...item, studentsCount: Math.max(0, item.studentsCount - 1) }
          : item
      )));
      this.closeDeleteStudentConfirmation();
    });
  }

  openClassStudentBulkCreate(): void {
    this.closeClassStudentEditor();
    this.isBulkAddingClassStudents.set(true);
    this.bulkStudentsText.set('');
  }

  closeClassStudentBulkCreate(): void {
    this.isBulkAddingClassStudents.set(false);
    this.bulkStudentsText.set('');
  }

  saveBulkClassStudents(): void {
    const schoolClass = this.selectedStudentsClass();
    const parsedStudents = this.parsedBulkStudents();

    if (!schoolClass || !parsedStudents.length) {
      return;
    }

    this.studentsApi.createStudentsBulk(schoolClass.id, { students: parsedStudents }).subscribe((createdStudents) => {
      const newStudents = createdStudents.map((student) => this.mapStudent(student, schoolClass.name));

      this.students.update((students) => this.sortStudents([...students, ...newStudents]));
      this.classes.update((classes) => classes.map((item) => (
        item.id === schoolClass.id ? { ...item, studentsCount: item.studentsCount + newStudents.length } : item
      )));
      this.closeClassStudentBulkCreate();
    });
  }

  saveClassStudent(): void {
    const schoolClass = this.selectedStudentsClass();
    const lastName = this.draftStudentLastName().trim();
    const firstName = this.draftStudentFirstName().trim();
    const selectedStudentId = this.selectedClassStudentId();

    if (!schoolClass || !lastName || !firstName) {
      return;
    }

    if (this.isCreatingClassStudent()) {
      this.studentsApi.createStudent(schoolClass.id, { lastName, firstName }).subscribe((createdStudent) => {
        this.students.update((students) => this.sortStudents([
          ...students,
          this.mapStudent(createdStudent, schoolClass.name),
        ]));
        this.classes.update((classes) => classes.map((item) => (
          item.id === schoolClass.id ? { ...item, studentsCount: item.studentsCount + 1 } : item
        )));
        this.closeClassStudentEditor();
      });
      return;
    }

    if (selectedStudentId === null) {
      return;
    }

    this.studentsApi.updateStudent(selectedStudentId, { lastName, firstName }).subscribe((updatedStudent) => {
      this.students.update((students) => this.sortStudents(students.map((student) => (
        student.id === selectedStudentId ? this.mapStudent(updatedStudent, schoolClass.name) : student
      ))));
      this.closeClassStudentEditor();
    });
  }

  saveClass(): void {
    const name = this.draftName().trim();
    const selectedClassId = this.selectedClassId();

    if (!name) {
      return;
    }

    if (this.isCreatingClass()) {
      const academicYear = this.academicYears().find((year) => year.name === this.draftAcademicYear());

      if (!academicYear) {
        return;
      }

      this.classesApi.createClass({ name, academicYearId: academicYear.id }).subscribe((createdClass) => {
        if (academicYear.name === this.selectedYear()) {
          this.classes.update((classes) => [...classes, createdClass]);
        }

        this.closePanel();
      });
      return;
    }

    if (selectedClassId === null) {
      return;
    }

    this.classesApi.updateClass(selectedClassId, { name }).subscribe((updatedClass) => {
      this.classes.update((classes) => classes.map((schoolClass) => (
        schoolClass.id === selectedClassId ? updatedClass : schoolClass
      )));
      this.closePanel();
    });
  }

  promoteClass(): void {
    const selectedClass = this.selectedClass();

    if (!selectedClass) {
      return;
    }

    const currentYear = this.academicYears().find((year) => year.id === selectedClass.academicYearId);
    const targetYear = currentYear
      ? [...this.academicYears()]
        .sort((a, b) => a.startsOn.localeCompare(b.startsOn))
        .find((year) => year.startsOn > currentYear.startsOn)
      : undefined;
    const nameMatch = selectedClass.name.match(/^(\d+)(.*)$/);
    const nextName = nameMatch ? `${Number(nameMatch[1]) + 1}${nameMatch[2]}` : selectedClass.name;

    if (!currentYear || !targetYear) {
      return;
    }

    this.classesApi.promoteClass(selectedClass.id, { targetAcademicYearId: targetYear.id, newName: nextName }).subscribe(() => {
      this.selectedYear.set(targetYear.name);
      this.loadClassesForSelectedYear();
      this.closePanel();
    });
  }

  private loadAcademicYears(): void {
    this.academicYearsApi.getAcademicYears().subscribe((academicYears) => {
      const sortedYears = [...academicYears].sort((a, b) => b.name.localeCompare(a.name));
      const presetYear = this.academicYear.currentYear();
      const selectedYear =
        sortedYears.find((year) => year.name === presetYear)?.name ??
        sortedYears.find((year) => year.isCurrent)?.name ??
        sortedYears[0]?.name ??
        '';

      this.academicYears.set(sortedYears);
      this.selectedYear.set(selectedYear);
      this.loadClassesForSelectedYear();
    });
  }

  private loadClassesForSelectedYear(): void {
    const academicYear = this.academicYears().find((year) => year.name === this.selectedYear());

    if (!academicYear) {
      this.classes.set([]);
      return;
    }

    this.isLoading.set(true);
    this.classesApi.getClasses(academicYear.id).subscribe((classes) => {
      this.classes.set(classes);
      this.isLoading.set(false);
    });
  }

  private loadClassStudents(schoolClass: ClassDto): void {
    this.isStudentsLoading.set(true);
    this.students.set([]);
    this.studentsApi.getClassStudents(schoolClass.id).subscribe((students) => {
      this.students.set(this.sortStudents(students.map((student) => this.mapStudent(student, schoolClass.name))));
      this.isStudentsLoading.set(false);
    });
  }

  private compareClassNames(first: string, second: string): number {
    const firstNumber = Number(first.match(/^\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);
    const secondNumber = Number(second.match(/^\d+/)?.[0] ?? Number.MAX_SAFE_INTEGER);

    if (firstNumber !== secondNumber) {
      return firstNumber - secondNumber;
    }

    return first.localeCompare(second, 'uk', { numeric: true, sensitivity: 'base' });
  }

  private resetStudentDraft(): void {
    this.draftStudentLastName.set('');
    this.draftStudentFirstName.set('');
  }

  private mapStudent(student: StudentDto, className: string): Student {
    return {
      id: student.id,
      lastName: student.lastName,
      firstName: student.firstName,
      birthDate: '',
      className,
      isActive: student.isActive,
    };
  }

  private sortStudents(students: Student[]): Student[] {
    return [...students].sort((first, second) => {
      const lastNameCompare = first.lastName.localeCompare(second.lastName, 'uk', { sensitivity: 'base' });

      return lastNameCompare || first.firstName.localeCompare(second.firstName, 'uk', { sensitivity: 'base' });
    });
  }

  private parseBulkStudents(value: string): Array<{ lastName: string; firstName: string }> {
    return value
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [lastName = '', ...firstNameParts] = line.split(/\s+/);

        return {
          lastName,
          firstName: firstNameParts.join(' '),
        };
      })
      .filter((student) => student.lastName && student.firstName);
  }
}

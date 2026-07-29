import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { UserRole } from '../../core/models/auth.models';
import {
  AdminApiService,
  AdminUserDto,
  ClassTeacherAssignmentDto,
} from '../../core/services/admin-api.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { AcademicYearDto, AcademicYearsApiService } from '../../core/services/academic-years-api.service';
import { ClassDto, ClassesApiService } from '../../core/services/classes-api.service';
import { UiConfirmDialogComponent } from '../../shared/ui/confirm-dialog/ui-confirm-dialog.component';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

interface AssignmentRow {
  assignment: ClassTeacherAssignmentDto;
  teacherName: string;
  className: string;
}

@Component({
  selector: 'app-admin-page',
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
  templateUrl: './admin-page.component.html',
  styleUrl: './admin-page.component.scss',
})
export class AdminPageComponent {
  private readonly adminApi = inject(AdminApiService);
  private readonly academicYear = inject(AcademicYearService);
  private readonly academicYearsApi = inject(AcademicYearsApiService);
  private readonly classesApi = inject(ClassesApiService);

  readonly users = signal<AdminUserDto[]>([]);
  readonly classes = signal<ClassDto[]>([]);
  readonly assignments = signal<ClassTeacherAssignmentDto[]>([]);
  readonly academicYears = signal<AcademicYearDto[]>([]);
  readonly selectedYearId = signal<number | null>(this.academicYear.currentYearId());
  readonly userSearch = signal('');
  readonly assignmentSearch = signal('');
  readonly isLoading = signal(false);

  readonly isUserPanelOpen = signal(false);
  readonly editingUserId = signal<number | null>(null);
  readonly userToDisableId = signal<number | null>(null);
  readonly draftFullName = signal('');
  readonly draftLogin = signal('');
  readonly draftPassword = signal('');
  readonly draftRole = signal<UserRole>('class_teacher');

  readonly isAssignmentPanelOpen = signal(false);
  readonly editingAssignmentId = signal<number | null>(null);
  readonly assignmentToDisableId = signal<number | null>(null);
  readonly draftTeacherId = signal('');
  readonly draftClassId = signal('');

  readonly roleOptions: UiSelectOption[] = [
    { label: 'Класний керівник', value: 'class_teacher' },
    { label: 'Адміністратор', value: 'admin' },
  ];

  readonly yearOptions = computed<UiSelectOption[]>(() =>
    this.academicYears().map((year) => ({ label: year.name, value: String(year.id) })),
  );

  readonly teacherOptions = computed<UiSelectOption[]>(() =>
    this.users()
      .filter((user) => user.isActive && user.role === 'class_teacher')
      .map((user) => ({ label: user.fullName, value: String(user.id) })),
  );

  readonly classOptions = computed<UiSelectOption[]>(() =>
    this.classes()
      .filter((schoolClass) => schoolClass.isActive)
      .sort((first, second) => this.compareClassNames(first.name, second.name))
      .map((schoolClass) => ({ label: schoolClass.name, value: String(schoolClass.id) })),
  );

  readonly filteredUsers = computed(() => {
    const query = this.userSearch().trim().toLowerCase();

    return this.users()
      .filter((user) => !query || `${user.fullName} ${user.login}`.toLowerCase().includes(query))
      .sort((first, second) => first.fullName.localeCompare(second.fullName, 'uk', { sensitivity: 'base' }));
  });

  readonly activeTeachersCount = computed(() =>
    this.users().filter((user) => user.isActive && user.role === 'class_teacher').length,
  );
  readonly activeAdminsCount = computed(() =>
    this.users().filter((user) => user.isActive && user.role === 'admin').length,
  );

  readonly assignmentRows = computed<AssignmentRow[]>(() => {
    const query = this.assignmentSearch().trim().toLowerCase();
    const usersById = new Map(this.users().map((user) => [user.id, user]));
    const classesById = new Map(this.classes().map((schoolClass) => [schoolClass.id, schoolClass]));

    return this.assignments()
      .filter((assignment) => assignment.isActive)
      .map((assignment) => ({
        assignment,
        teacherName: usersById.get(assignment.teacherId)?.fullName ?? 'Невідомий користувач',
        className: classesById.get(assignment.classId)?.name ?? 'Невідомий клас',
      }))
      .filter((row) => !query || `${row.teacherName} ${row.className}`.toLowerCase().includes(query))
      .sort((first, second) => this.compareClassNames(first.className, second.className));
  });

  readonly userPanelTitle = computed(() =>
    this.editingUserId() === null ? 'Додати користувача' : 'Редагувати користувача',
  );
  readonly assignmentPanelTitle = computed(() =>
    this.editingAssignmentId() === null ? 'Призначити класного керівника' : 'Редагувати призначення',
  );
  readonly userToDisable = computed(() => this.users().find((user) => user.id === this.userToDisableId()));
  readonly assignmentToDisable = computed(() =>
    this.assignmentRows().find((row) => row.assignment.id === this.assignmentToDisableId()),
  );
  readonly canSaveUser = computed(() =>
    !!this.draftFullName().trim() &&
    !!this.draftLogin().trim() &&
    (this.editingUserId() !== null || this.draftPassword().length >= 8),
  );
  readonly canSaveAssignment = computed(() =>
    !!this.selectedYearId() && !!this.draftTeacherId() && !!this.draftClassId(),
  );

  constructor() {
    this.loadInitialData();
  }

  updateYear(value: string): void {
    const yearId = Number(value);

    this.selectedYearId.set(Number.isFinite(yearId) ? yearId : null);
    this.loadYearScopedData();
  }

  openCreateUser(): void {
    this.editingUserId.set(null);
    this.draftFullName.set('');
    this.draftLogin.set('');
    this.draftPassword.set('');
    this.draftRole.set('class_teacher');
    this.isUserPanelOpen.set(true);
  }

  openEditUser(user: AdminUserDto): void {
    this.editingUserId.set(user.id);
    this.draftFullName.set(user.fullName);
    this.draftLogin.set(user.login);
    this.draftPassword.set('');
    this.draftRole.set(user.role);
    this.isUserPanelOpen.set(true);
  }

  closeUserPanel(): void {
    this.isUserPanelOpen.set(false);
    this.editingUserId.set(null);
    this.draftPassword.set('');
  }

  saveUser(): void {
    if (!this.canSaveUser()) {
      return;
    }

    const userId = this.editingUserId();
    const password = this.draftPassword();

    if (userId === null) {
      this.adminApi
        .createUser({
          fullName: this.draftFullName().trim(),
          login: this.draftLogin().trim(),
          password,
          role: this.draftRole(),
        })
        .subscribe((createdUser) => {
          this.users.update((users) => [...users, createdUser]);
          this.closeUserPanel();
        });
      return;
    }

    this.adminApi
      .updateUser(userId, {
        fullName: this.draftFullName().trim(),
        login: this.draftLogin().trim(),
        role: this.draftRole(),
        ...(password ? { password } : {}),
      })
      .subscribe((updatedUser) => {
        this.users.update((users) => users.map((user) => (user.id === userId ? updatedUser : user)));
        this.closeUserPanel();
      });
  }

  requestDisableUser(user: AdminUserDto): void {
    this.userToDisableId.set(user.id);
  }

  closeDisableUserConfirmation(): void {
    this.userToDisableId.set(null);
  }

  confirmDisableUser(): void {
    const user = this.userToDisable();

    if (!user) {
      this.closeDisableUserConfirmation();
      return;
    }

    this.adminApi.updateUser(user.id, { isActive: false }).subscribe((updatedUser) => {
      this.users.update((users) => users.map((item) => (item.id === user.id ? updatedUser : item)));
      this.closeDisableUserConfirmation();
    });
  }

  openCreateAssignment(): void {
    this.editingAssignmentId.set(null);
    this.draftTeacherId.set(this.teacherOptions()[0]?.value ?? '');
    this.draftClassId.set(this.classOptions()[0]?.value ?? '');
    this.isAssignmentPanelOpen.set(true);
  }

  openEditAssignment(row: AssignmentRow): void {
    this.editingAssignmentId.set(row.assignment.id);
    this.draftTeacherId.set(String(row.assignment.teacherId));
    this.draftClassId.set(String(row.assignment.classId));
    this.isAssignmentPanelOpen.set(true);
  }

  closeAssignmentPanel(): void {
    this.isAssignmentPanelOpen.set(false);
    this.editingAssignmentId.set(null);
    this.draftTeacherId.set('');
    this.draftClassId.set('');
  }

  saveAssignment(): void {
    const academicYearId = this.selectedYearId();
    const teacherId = Number(this.draftTeacherId());
    const classId = Number(this.draftClassId());

    if (!academicYearId || !teacherId || !classId) {
      return;
    }

    const assignmentId = this.editingAssignmentId();

    if (assignmentId === null) {
      this.adminApi.createClassTeacherAssignment({ teacherId, classId, academicYearId }).subscribe((assignment) => {
        this.assignments.update((assignments) => [...assignments, assignment]);
        this.closeAssignmentPanel();
      });
      return;
    }

    this.adminApi.updateClassTeacherAssignment(assignmentId, { teacherId, classId, academicYearId }).subscribe((assignment) => {
      this.assignments.update((assignments) => assignments.map((item) => (item.id === assignmentId ? assignment : item)));
      this.closeAssignmentPanel();
    });
  }

  requestDisableAssignment(row: AssignmentRow): void {
    this.assignmentToDisableId.set(row.assignment.id);
  }

  closeDisableAssignmentConfirmation(): void {
    this.assignmentToDisableId.set(null);
  }

  confirmDisableAssignment(): void {
    const row = this.assignmentToDisable();

    if (!row) {
      this.closeDisableAssignmentConfirmation();
      return;
    }

    this.adminApi.updateClassTeacherAssignment(row.assignment.id, { isActive: false }).subscribe((assignment) => {
      this.assignments.update((assignments) =>
        assignments.map((item) => (item.id === row.assignment.id ? assignment : item)),
      );
      this.closeDisableAssignmentConfirmation();
    });
  }

  roleLabel(role: UserRole): string {
    return role === 'admin' ? 'Адміністратор' : 'Класний керівник';
  }

  private loadInitialData(): void {
    this.isLoading.set(true);

    forkJoin({
      years: this.academicYearsApi.getAcademicYears(),
      users: this.adminApi.getUsers(),
    }).subscribe(({ years, users }) => {
      const sortedYears = [...years].sort((a, b) => b.startsOn.localeCompare(a.startsOn));
      const currentYearId =
        this.academicYear.currentYearId() ??
        sortedYears.find((year) => year.isCurrent)?.id ??
        sortedYears[0]?.id ??
        null;

      this.academicYears.set(sortedYears);
      this.users.set(users);
      this.selectedYearId.set(currentYearId);
      this.loadYearScopedData();
    });
  }

  private loadYearScopedData(): void {
    const academicYearId = this.selectedYearId();

    if (!academicYearId) {
      this.classes.set([]);
      this.assignments.set([]);
      this.isLoading.set(false);
      return;
    }

    forkJoin({
      classes: this.classesApi.getClasses(academicYearId),
      assignments: this.adminApi.getClassTeacherAssignments(academicYearId),
    }).subscribe(({ classes, assignments }) => {
      this.classes.set(classes);
      this.assignments.set(assignments);
      this.isLoading.set(false);
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
}

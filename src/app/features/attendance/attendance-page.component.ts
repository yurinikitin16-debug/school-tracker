import { CommonModule } from '@angular/common';
import { Component, computed, effect, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, finalize, of } from 'rxjs';
import {
  AcademicCalendarException,
  AttendanceRecord,
  AttendanceViewStatus,
  Student,
  StudentMeal,
} from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { AcademicYearService } from '../../core/services/academic-year.service';
import {
  AttendanceApiService,
  AttendanceDayConfirmationChangeDto,
  AttendanceApiStatus,
  AttendanceWeekChangeDto,
  AttendanceWeekDayDto,
  AttendanceWeekMatrixDto,
} from '../../core/services/attendance-api.service';
import { AuthService } from '../../core/services/auth.service';
import { ClassDto, ClassesApiService } from '../../core/services/classes-api.service';
import { ToastService } from '../../core/services/toast.service';
import { UiDatePickerComponent } from '../../shared/ui/date-picker/ui-date-picker.component';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiConfirmDialogComponent } from '../../shared/ui/confirm-dialog/ui-confirm-dialog.component';
import { UiIconComponent, UiIconName } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

interface AttendanceRow {
  student: Student;
  records: Map<number, AttendanceRecord>;
  missed: number;
}

interface Weekday {
  id: number;
  label: string;
}

interface WeekdayColumn extends Weekday {
  date: Date;
  dateLabel: string;
  isSchoolDay: boolean;
  note?: string;
  attendanceConfirmed: boolean;
}

type StatusFilter = 'all' | AttendanceViewStatus;
type TableMode = 'attendance' | 'meals' | 'combined';
type ConfirmationAction = 'save' | 'discard';

interface SelectedCell {
  studentId: number;
  lessonId: number;
}

interface FloatingEditorPosition {
  top: number;
  left: number;
}

interface AttendanceEmptyState {
  title: string;
  description: string;
  icon: UiIconName;
}

@Component({
  selector: 'app-attendance-page',
  imports: [
    CommonModule,
    FormsModule,
    UiConfirmDialogComponent,
    UiDatePickerComponent,
    UiEmptyStateComponent,
    UiIconComponent,
    UiInputComponent,
    UiPageHeaderComponent,
    UiSelectComponent,
    UiSidePanelComponent,
    UiToolbarComponent,
  ],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
})
export class AttendancePageComponent {
  private readonly schoolData = inject(SchoolDataService);
  private readonly academicYear = inject(AcademicYearService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly auth = inject(AuthService);
  private readonly classesApi = inject(ClassesApiService);
  private readonly toast = inject(ToastService);

  readonly weekdays: Weekday[] = [
    { id: 1, label: 'Понеділок' },
    { id: 2, label: 'Вівторок' },
    { id: 3, label: 'Середа' },
    { id: 4, label: 'Четвер' },
    { id: 5, label: 'Пʼятниця' },
  ];
  readonly classes = signal<ClassDto[]>([]);
  readonly students = signal<Student[]>([]);
  readonly attendance = signal<AttendanceRecord[]>([]);
  readonly savedAttendance = signal<AttendanceRecord[]>([]);
  readonly meals = signal<StudentMeal[]>([]);
  readonly savedMeals = signal<StudentMeal[]>([]);
  readonly calendarExceptions = signal<AcademicCalendarException[]>([]);
  readonly matrixDays = signal<AttendanceWeekDayDto[]>([]);
  readonly savedDayConfirmations = signal<Record<string, boolean>>({});
  readonly isMatrixLoading = signal(false);
  readonly weekLoadFailed = signal(false);
  readonly isSaving = signal(false);
  readonly isMobileViewport = signal(this.resolveIsMobileViewport());
  readonly failedCellKeys = signal<Set<string>>(new Set());
  readonly tableMode = signal<TableMode>('combined');

  readonly selectedClassId = signal<number | null>(null);
  readonly selectedClass = signal('8-А');
  readonly selectedStatus = signal<StatusFilter>('all');
  readonly searchTerm = signal('');
  readonly selectedCell = signal<SelectedCell | null>(null);
  readonly editingCell = signal<SelectedCell | null>(null);
  readonly cellEditorPosition = signal<FloatingEditorPosition | null>(null);
  readonly inlineStatus = signal<AttendanceViewStatus>('present');
  readonly inlineReason = signal('');
  readonly draftStatus = signal<AttendanceViewStatus>('present');
  readonly draftReason = signal('');
  readonly draftFullWeekAbsent = signal(false);
  readonly savedFullWeekAbsent = signal(false);
  readonly saveNotice = signal('');
  readonly confirmationAction = signal<ConfirmationAction | null>(null);
  readonly attendanceDate = signal(this.resolveAttendanceDate(new Date()));
  readonly academicYearStart = computed(() => this.academicYear.currentAcademicYear()?.startsOn ?? '');
  readonly academicYearEnd = computed(() => this.academicYear.currentAcademicYear()?.endsOn ?? '');
  readonly weekRange = computed(() => this.resolveWeekRange(this.attendanceDate()));
  readonly dateLabel = computed(() => this.formatWeekRange(this.weekRange().start, this.weekRange().end, false));
  readonly headerDateLabel = computed(() => this.formatWeekRange(this.weekRange().start, this.weekRange().end, true));
  readonly selectedWeekLabel = computed(() => this.formatWeekRange(this.weekRange().start, this.weekRange().end, true));
  readonly changedCellCount = computed(() => {
    const keys = new Set([
      ...this.attendance().map((record) => `${record.studentId}:${record.lessonId}`),
      ...this.savedAttendance().map((record) => `${record.studentId}:${record.lessonId}`),
    ]);

    return [...keys].filter((key) => {
      const [studentId, lessonId] = key.split(':').map(Number);
      return this.isCellChanged(studentId, lessonId);
    }).length;
  });
  readonly changedMealCount = computed(() => {
    const keys = new Set([
      ...this.meals().map((meal) => `${meal.studentId}:${meal.date}`),
      ...this.savedMeals().map((meal) => `${meal.studentId}:${meal.date}`),
    ]);

    return [...keys].filter((key) => {
      const [studentId, date] = key.split(':');
      return this.isMealChanged(Number(studentId), date);
    }).length;
  });
  readonly changedDayConfirmationCount = computed(() =>
    this.visibleSchoolDays().filter((day) => day.attendanceConfirmed !== !!this.savedDayConfirmations()[this.toIsoDate(day.date)]).length,
  );
  readonly changedTotalCount = computed(() => this.changedCellCount() + this.changedMealCount() + this.changedDayConfirmationCount());
  readonly confirmationTitle = computed(() =>
    this.confirmationAction() === 'save' ? 'Зберегти зміни?' : 'Скасувати зміни?',
  );
  readonly confirmationDescription = computed(() =>
    this.confirmationAction() === 'save'
      ? 'Усі змінені відмітки буде збережено.'
      : 'Усі незбережені зміни буде втрачено.',
  );
  readonly confirmationLabel = computed(() =>
    this.confirmationAction() === 'save' ? 'Зберегти' : 'Скасувати зміни',
  );
  readonly selectedClassValue = computed(() => this.selectedClassId()?.toString() ?? '');
  readonly hasSelectedClass = computed(() => this.selectedClassId() !== null);

  readonly classOptions = computed<UiSelectOption[]>(() =>
    this.classes()
      .filter((schoolClass) => schoolClass.isActive)
      .sort((a, b) => this.compareClassNames(a.name, b.name))
      .map((schoolClass) => ({
        label: schoolClass.name,
        value: schoolClass.id.toString(),
      })),
  );
  readonly isClassSelectDisabled = computed(() => this.classOptions().length <= 1);

  readonly statusOptions: UiSelectOption[] = [
    { label: 'Усі статуси', value: 'all' },
    { label: 'Відсутні', value: 'A' },
  ];

  readonly tableModeOptions: { label: string; value: TableMode }[] = [
    { label: 'Разом', value: 'combined' },
    { label: 'Пропуски', value: 'attendance' },
    { label: 'Харчування', value: 'meals' },
  ];

  readonly editStatusOptions: UiSelectOption[] = [
    { label: 'Присутній', value: 'present' },
    { label: 'Відсутній', value: 'A' },
  ];

  readonly reasonOptions: UiSelectOption[] = [
    { label: 'Без причини · Н', value: 'Без причини' },
    { label: 'Поважна причина · п/п', value: 'Поважна причина' },
    { label: 'Хворий · хв', value: 'Хворий' },
  ];

  readonly selectedStudent = computed(() => {
    const cell = this.selectedCell();
    return cell ? this.students().find((student) => student.id === cell.studentId) : undefined;
  });

  readonly visibleDays = computed<WeekdayColumn[]>(() => {
    if (this.matrixDays().length) {
      return this.matrixDays().map((day, index) => ({
        id: index + 1,
        label: this.weekdayLabel(day.weekday),
        date: this.parseIsoDate(day.date) ?? new Date(day.date),
        dateLabel: this.formatColumnDate(this.parseIsoDate(day.date) ?? new Date(day.date)),
        isSchoolDay: day.isSchoolDay,
        note: day.note ?? undefined,
        attendanceConfirmed: day.attendanceConfirmed,
      }));
    }

    const start = this.weekRange().start;

    return this.weekdays.map((weekday, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      return {
        ...weekday,
        date,
        dateLabel: this.formatColumnDate(date),
        ...this.resolveSchoolDay(date),
        attendanceConfirmed: false,
      };
    });
  });
  readonly visibleSchoolDays = computed(() => this.visibleDays().filter((day) => day.isSchoolDay));
  readonly disabledCalendarDates = computed(() =>
    this.calendarExceptions()
      .filter((exception) => !exception.isSchoolDay)
      .map((exception) => exception.date),
  );

  readonly emptyState = computed<AttendanceEmptyState | null>(() => {
    if (!this.hasSelectedClass() || !this.classOptions().length) {
      const isClassTeacher = this.auth.currentUser()?.role === 'class_teacher';

      return {
        title: isClassTeacher ? 'До вас не закріплено клас' : 'Немає активних класів',
        description: isClassTeacher
          ? 'Зверніться до адміністратора, щоб отримати доступ до свого класу.'
          : 'Додайте клас у довіднику, щоб вести відвідування.',
        icon: 'database' as const,
      };
    }

    if (this.isMatrixLoading() && !this.students().length) {
      return {
        title: 'Завантаження тижня',
        description: 'Підтягуємо учнів, пропуски та харчування.',
        icon: 'database' as const,
      };
    }

    if (this.weekLoadFailed()) {
      return {
        title: 'Не вдалося завантажити тиждень',
        description: 'Спробуйте змінити тиждень або оновити сторінку.',
        icon: 'database' as const,
      };
    }

    if (!this.students().some((student) => student.className === this.selectedClass())) {
      return {
        title: 'У класі поки немає учнів',
        description: 'Додайте учнів у довіднику, щоб вести відвідування.',
        icon: 'users' as const,
      };
    }

    if (!this.visibleSchoolDays().length) {
      return {
        title: 'У цьому тижні немає навчальних днів',
        description: 'Виберіть інший тиждень або перевірте календар навчальних днів.',
        icon: 'calendar' as const,
      };
    }

    if (!this.rows().length) {
      return {
        title: 'Учнів не знайдено',
        description: 'Спробуйте змінити пошук або фільтри статусів.',
        icon: 'search' as const,
      };
    }

    return null;
  });

  readonly rows = computed<AttendanceRow[]>(() => {
    const query = this.searchTerm().trim().toLowerCase();
    const selectedStatus = this.selectedStatus();
    const dayIds = new Set(this.visibleSchoolDays().map((day) => day.id));

    return this.students()
      .filter((student) => student.className === this.selectedClass())
      .map((student) => {
        const records = new Map<number, AttendanceRecord>();

        this.attendance()
          .filter((record) => record.studentId === student.id && dayIds.has(record.lessonId))
          .forEach((record) => records.set(record.lessonId, record));

        return {
          student,
          records,
          missed: records.size,
        };
      })
      .filter((row) => {
        const fullName = `${row.student.lastName} ${row.student.firstName}`.toLowerCase();
        const searchMatches = !query || fullName.includes(query);
        const statusMatches =
          selectedStatus === 'all' ||
          this.visibleSchoolDays().some((day) => this.statusFor(row, day.id) !== 'present');

        return searchMatches && statusMatches;
      });
  });

  readonly dailySummary = computed(() => {
    const students = this.students().filter((student) => student.className === this.selectedClass());
    const days = this.visibleSchoolDays();

    const records = new Set(
      this.attendance().map((record) => `${record.studentId}:${record.lessonId}`),
    );
    const withoutAbsences = students.filter((student) =>
      days.every((day) => !records.has(`${student.id}:${day.id}`)),
    ).length;
    const withAbsences = students.filter((student) =>
      days.some((day) => records.has(`${student.id}:${day.id}`)),
    ).length;
    const totalAbsences = students.reduce((total, student) =>
      total + days.filter((day) => records.has(`${student.id}:${day.id}`)).length,
      0,
    );

    return { totalStudents: students.length, withoutAbsences, withAbsences, totalAbsences };
  });
  readonly mealSummary = computed(() => {
    const students = this.students().filter((student) => student.className === this.selectedClass());
    const days = this.visibleSchoolDays();

    if (!days.length) {
      return { studentsWithoutMeal: 0 };
    }

    const studentsWithoutMeal = students.filter((student) =>
      days.some((day) => this.hasMissedMeal(student.id, this.toIsoDate(day.date))),
    ).length;

    return { studentsWithoutMeal };
  });

  constructor() {
    effect(() => {
      this.academicYearStart();
      this.academicYearEnd();

      const boundedDate = this.boundAttendanceDate(this.attendanceDate());
      if (this.toIsoDate(boundedDate) !== this.toIsoDate(this.attendanceDate())) {
        this.attendanceDate.set(boundedDate);
      }
    });

    effect(() => {
      const academicYearId = this.academicYear.currentYearId();

      if (academicYearId) {
        this.loadClasses(academicYearId);
      }
    });

    this.schoolData.getAcademicCalendarExceptions().subscribe((calendarExceptions) => {
      this.calendarExceptions.set(calendarExceptions);
      this.closeCellEditor();
    });
  }

  statusFor(row: AttendanceRow, lessonId: number): AttendanceViewStatus {
    return row.records.get(lessonId)?.status ?? 'present';
  }

  attendanceTone(row: AttendanceRow, lessonId: number): AttendanceViewStatus {
    const record = row.records.get(lessonId);

    if (!record) {
      return 'present';
    }

    const reasonTone: Record<string, AttendanceViewStatus> = {
      'Без причини': 'A',
      'Хворий': 'S',
      'Поважна причина': 'E',
    };

    return record.reason ? reasonTone[record.reason] ?? record.status : record.status;
  }

  recordFor(studentId: number, lessonId: number): AttendanceRecord | undefined {
    return this.attendance().find((record) => record.studentId === studentId && record.lessonId === lessonId);
  }

  mealFor(studentId: number, date: string): StudentMeal | undefined {
    return this.meals().find((meal) => meal.studentId === studentId && meal.date === date);
  }

  hasMissedMeal(studentId: number, date: string): boolean {
    return this.mealFor(studentId, date)?.hadMeal === false;
  }

  hasMeal(studentId: number, date: string): boolean {
    return !this.hasMissedMeal(studentId, date);
  }

  isAllPresentDayChecked(day: WeekdayColumn): boolean {
    return day.isSchoolDay && this.dayMissedCount(day.id) === 0 && day.attendanceConfirmed;
  }

  toggleAllPresentDay(day: WeekdayColumn, checked: boolean): void {
    if (!this.selectedClassId() || !day.isSchoolDay || this.isSaving()) {
      return;
    }

    const date = this.toIsoDate(day.date);
    this.setDraftDayConfirmation(date, checked);
    this.closeCellEditor();
    this.closeAttendanceEditor();

    if (!checked) {
      return;
    }

    const studentIds = new Set(
      this.students()
        .filter((student) => student.className === this.selectedClass())
        .map((student) => student.id),
    );

    this.attendance.set(
      this.attendance().filter((record) => record.lessonId !== day.id || !studentIds.has(record.studentId)),
    );
    this.failedCellKeys.update((failedCells) => {
      const nextFailedCells = new Set(failedCells);
      studentIds.forEach((studentId) => nextFailedCells.delete(this.changeKey(studentId, date)));
      return nextFailedCells;
    });
  }

  isCellChanged(studentId: number, lessonId: number): boolean {
    const current = this.recordFor(studentId, lessonId);
    const saved = this.savedAttendance().find(
      (record) => record.studentId === studentId && record.lessonId === lessonId,
    );

    return !this.recordsMatch(current, saved);
  }

  isMealChanged(studentId: number, date: string): boolean {
    const current = this.mealFor(studentId, date);
    const saved = this.savedMeals().find((meal) => meal.studentId === studentId && meal.date === date);

    return !this.mealsMatch(current, saved);
  }

  isMealEditable(row: AttendanceRow, day: WeekdayColumn): boolean {
    return day.isSchoolDay && this.statusFor(row, day.id) === 'present';
  }

  isDisplayCellChanged(row: AttendanceRow, day: WeekdayColumn): boolean {
    if (!day.isSchoolDay) {
      return false;
    }

    const attendanceChanged = this.isCellChanged(row.student.id, day.id);
    const mealChanged = this.isMealChanged(row.student.id, this.toIsoDate(day.date));

    if (this.tableMode() === 'attendance') {
      return attendanceChanged;
    }

    if (this.tableMode() === 'meals') {
      return mealChanged;
    }

    return attendanceChanged || mealChanged;
  }

  isDisplayCellFailed(row: AttendanceRow, day: WeekdayColumn): boolean {
    if (!day.isSchoolDay) {
      return false;
    }

    return this.failedCellKeys().has(this.changeKey(row.student.id, this.toIsoDate(day.date)));
  }

  statusLabel(status: AttendanceViewStatus): string {
    const labels: Record<AttendanceViewStatus, string> = {
      present: 'Присутній',
      A: 'Без причини',
      S: 'Хворий',
      E: 'Поважна причина',
    };

    return labels[status];
  }

  statusMark(status: AttendanceViewStatus): string {
    const marks: Record<AttendanceViewStatus, string> = {
      present: '✓',
      A: 'Н',
      S: 'хв',
      E: 'п/п',
    };

    return marks[status];
  }

  cellText(row: AttendanceRow, lessonId: number): string {
    const day = this.visibleDays().find((item) => item.id === lessonId);
    if (day && this.tableMode() === 'meals') {
      return this.mealText(row, day);
    }

    const attendanceText = this.attendanceText(row, lessonId);

    if (day && this.tableMode() === 'combined') {
      return `${attendanceText} / ${this.mealText(row, day)}`;
    }

    return attendanceText;
  }

  attendanceText(row: AttendanceRow, lessonId: number): string {
    const record = row.records.get(lessonId);

    return record ? this.reasonCode(record.reason) || this.statusLabel(record.status) : this.statusMark('present');
  }

  reasonCode(reason?: string): string {
    const codes: Record<string, string> = {
      'Без причини': 'Н',
      'Поважна причина': 'п/п',
      'Хворий': 'хв',
    };

    return reason ? codes[reason] ?? reason : '';
  }

  mealText(row: AttendanceRow, day: WeekdayColumn): string {
    if (!day.isSchoolDay) {
      return '—';
    }

    if (this.statusFor(row, day.id) !== 'present') {
      return 'Не був';
    }

    return this.hasMeal(row.student.id, this.toIsoDate(day.date)) ? 'Харчувався' : 'Не харчувався';
  }

  mealShortText(row: AttendanceRow, day: WeekdayColumn): string {
    if (!day.isSchoolDay || this.statusFor(row, day.id) !== 'present') {
      return '—';
    }

    return this.hasMeal(row.student.id, this.toIsoDate(day.date)) ? 'Х.' : 'Ні';
  }

  mealDesktopText(row: AttendanceRow, day: WeekdayColumn): string {
    if (!day.isSchoolDay || this.statusFor(row, day.id) !== 'present') {
      return '—';
    }

    return this.hasMeal(row.student.id, this.toIsoDate(day.date)) ? 'Харч.' : 'Ні';
  }

  totalHeaderAttendanceLabel(): string {
    return this.isMobileViewport() ? 'Проп.' : 'Пропуски';
  }

  totalHeaderMealLabel(): string {
    return 'Не харч.';
  }

  updateTableMode(mode: TableMode): void {
    this.tableMode.set(mode);
    this.closeCellEditor();
  }

  toggleMeal(row: AttendanceRow, day: WeekdayColumn): void {
    if (!this.isMealEditable(row, day)) {
      return;
    }

    const date = this.toIsoDate(day.date);
    this.clearFailedCell(row.student.id, date);
    const current = this.mealFor(row.student.id, date);
    const withoutCurrent = this.meals().filter((meal) => meal.studentId !== row.student.id || meal.date !== date);

    if (current?.hadMeal === false) {
      this.meals.set(withoutCurrent);
      return;
    }

    this.meals.set([...withoutCurrent, { studentId: row.student.id, date, hadMeal: false }]);
  }

  handleCellClick(row: AttendanceRow, day: WeekdayColumn, event: MouseEvent): void {
    if (this.tableMode() === 'meals') {
      this.toggleMeal(row, day);
      return;
    }

    this.openCellEditor(row, day, event);
  }

  dayMissedCount(dayId: number): number {
    if (!this.visibleDays().find((day) => day.id === dayId)?.isSchoolDay) {
      return 0;
    }

    return this.rows().filter((row) => row.records.has(dayId)).length;
  }

  studentMissedMealCount(row: AttendanceRow): number {
    return this.visibleSchoolDays()
      .filter((day) => this.didNotEat(row, day))
      .length;
  }

  dayMissedMealCount(day: WeekdayColumn): number {
    if (!day.isSchoolDay) {
      return 0;
    }

    return this.rows().filter((row) => this.didNotEat(row, day)).length;
  }

  totalMissedMealCount(): number {
    return this.visibleSchoolDays().reduce((total, day) => total + this.dayMissedMealCount(day), 0);
  }

  didNotEat(row: AttendanceRow, day: WeekdayColumn): boolean {
    if (!day.isSchoolDay) {
      return false;
    }

    return row.records.has(day.id) || this.hasMissedMeal(row.student.id, this.toIsoDate(day.date));
  }

  updateClass(value: string): void {
    const classId = Number(value);
    const schoolClass = this.classes().find((item) => item.id === classId);

    if (!schoolClass) {
      return;
    }

    this.selectClass(schoolClass);
  }

  updateStatus(value: string): void {
    this.selectedStatus.set(value as StatusFilter);
  }

  openCellEditor(row: AttendanceRow, day: WeekdayColumn, event?: MouseEvent): void {
    if (!day.isSchoolDay) {
      return;
    }

    const record = row.records.get(day.id);

    this.editingCell.set({ studentId: row.student.id, lessonId: day.id });
    this.cellEditorPosition.set(this.resolveFloatingEditorPosition(event));
    this.inlineStatus.set(record ? 'A' : 'present');
    this.inlineReason.set(record?.reason ?? 'Без причини');
  }

  isEditingCell(studentId: number, lessonId: number): boolean {
    const cell = this.editingCell();
    return cell?.studentId === studentId && cell.lessonId === lessonId;
  }

  closeCellEditor(): void {
    this.editingCell.set(null);
    this.cellEditorPosition.set(null);
    this.inlineStatus.set('present');
    this.inlineReason.set('');
  }

  updateInlineStatus(value: string): void {
    const status = value as AttendanceViewStatus;
    this.inlineStatus.set(status);
    if (status === 'A' && !this.inlineReason()) {
      this.inlineReason.set('Без причини');
    }
    this.applyInlineChanges();
  }

  updateInlineReason(value: string): void {
    this.inlineReason.set(value || 'Без причини');
    this.applyInlineChanges();
  }

  openStudentPanel(row: AttendanceRow): void {
    const days = this.visibleSchoolDays();

    if (!days.length) {
      return;
    }

    const dayRecords = days
      .map((day) => this.recordFor(row.student.id, day.id))
      .filter((record): record is AttendanceRecord => !!record);
    const isAbsentAllWeek = dayRecords.length === days.length;
    const firstRecord = dayRecords[0];

    this.selectedCell.set({ studentId: row.student.id, lessonId: days[0].id });
    this.draftFullWeekAbsent.set(isAbsentAllWeek);
    this.savedFullWeekAbsent.set(isAbsentAllWeek);
    this.draftStatus.set('A');
    this.draftReason.set(firstRecord?.reason ?? 'Без причини');
  }

  updateDraftFullWeekAbsent(isAbsentFullWeek: boolean): void {
    this.draftFullWeekAbsent.set(isAbsentFullWeek);

    if (isAbsentFullWeek) {
      return;
    }

    const cell = this.selectedCell();

    if (!cell) {
      return;
    }

    const dayIds = new Set(this.visibleSchoolDays().map((day) => day.id));
    this.attendance.set(
      this.attendance().filter(
        (record) => record.studentId !== cell.studentId || !dayIds.has(record.lessonId),
      ),
    );
    this.draftStatus.set('A');
    this.draftReason.set('Без причини');
  }

  openAttendanceEditor(row: AttendanceRow, day: WeekdayColumn): void {
    if (!day.isSchoolDay) {
      return;
    }

    const record = row.records.get(day.id);

    this.selectedCell.set({
      studentId: row.student.id,
      lessonId: day.id,
    });
    this.draftStatus.set(record ? 'A' : 'present');
    this.draftReason.set(record?.reason ?? 'Без причини');
  }

  closeAttendanceEditor(): void {
    this.selectedCell.set(null);
    this.draftStatus.set('present');
    this.draftReason.set('');
    this.draftFullWeekAbsent.set(false);
    this.savedFullWeekAbsent.set(false);
  }

  updateDraftStatus(value: string): void {
    const status = value as AttendanceViewStatus;

    this.draftStatus.set(status);
    if (status === 'A' && !this.draftReason()) {
      this.draftReason.set('Без причини');
    }
  }

  saveAttendance(): void {
    const cell = this.selectedCell();

    if (!cell) {
      return;
    }

    if (!this.draftFullWeekAbsent()) {
      this.closeAttendanceEditor();
      return;
    }

    const days = this.visibleSchoolDays();
    if (!days.length) {
      this.closeAttendanceEditor();
      return;
    }

    const dayIds = new Set(days.map((day) => day.id));
    const dates = new Set(days.map((day) => this.toIsoDate(day.date)));
    const withoutStudentDays = this.attendance().filter(
      (record) => record.studentId !== cell.studentId || !dayIds.has(record.lessonId),
    );
    dates.forEach((date) => this.setDraftDayConfirmation(date, false));
    this.meals.set(this.meals().filter((meal) => meal.studentId !== cell.studentId || !dates.has(meal.date)));
    const allDayRecords = days.map<AttendanceRecord>((day) => ({
      studentId: cell.studentId,
      lessonId: day.id,
      status: 'A',
      reason: this.draftReason() || 'Без причини',
    }));

    this.attendance.set([...withoutStudentDays, ...allDayRecords]);
    this.closeAttendanceEditor();
  }

  studentShortName(student: Student): string {
    return `${student.lastName} ${student.firstName.charAt(0)}.`;
  }

  saveChanges(): void {
    const classId = this.selectedClassId();
    const changes = this.collectWeekChanges();
    const dayConfirmations = this.collectDayConfirmationChanges();

    if (!classId || (!changes.length && !dayConfirmations.length) || this.isSaving()) {
      return;
    }

    this.failedCellKeys.set(new Set());
    this.isSaving.set(true);

    this.attendanceApi.updateWeek({
      classId,
      weekStart: this.toIsoDate(this.weekRange().start),
      changes,
      dayConfirmations,
    }).pipe(
      catchError(() => {
        this.failedCellKeys.set(new Set(changes.map((change) => this.changeKey(change.studentId, change.date))));
        this.saveNotice.set('Не вдалося зберегти зміни');
        this.toast.showError('Не вдалося зберегти зміни');

        return of(null);
      }),
      finalize(() => this.isSaving.set(false)),
    ).subscribe((matrix) => {
      if (!matrix) {
        return;
      }

      this.applyWeekMatrix(matrix);
      this.failedCellKeys.set(new Set());
      this.saveNotice.set('Зміни збережено');
      this.toast.showSuccess('Зміни збережено');

      window.setTimeout(() => this.saveNotice.set(''), 3000);
    });
  }

  requestSaveChanges(): void {
    if (this.isSaving()) {
      return;
    }

    this.confirmationAction.set('save');
  }

  requestDiscardChanges(): void {
    if (this.isSaving()) {
      return;
    }

    this.confirmationAction.set('discard');
  }

  closeConfirmation(): void {
    this.confirmationAction.set(null);
  }

  confirmChanges(): void {
    const action = this.confirmationAction();
    this.closeConfirmation();

    if (action === 'save') {
      this.saveChanges();
    }

    if (action === 'discard') {
      this.discardChanges();
    }
  }

  discardChanges(): void {
    this.attendance.set(this.savedAttendance().map((record) => ({ ...record })));
    this.meals.set(this.savedMeals().map((meal) => ({ ...meal })));
    this.matrixDays.update((days) =>
      days.map((day) => ({
        ...day,
        attendanceConfirmed: !!this.savedDayConfirmations()[day.date],
      })),
    );
    this.failedCellKeys.set(new Set());
    this.closeCellEditor();
    this.closeAttendanceEditor();
    this.saveNotice.set('Зміни скасовано');

    window.setTimeout(() => this.saveNotice.set(''), 3000);
  }

  private applyInlineChanges(): void {
    const cell = this.editingCell();

    if (!cell) {
      return;
    }

    const status = this.inlineStatus();
    const day = this.visibleDays().find((item) => item.id === cell.lessonId);

    if (day) {
      this.clearFailedCell(cell.studentId, this.toIsoDate(day.date));
    }

    const withoutCurrent = this.attendance().filter(
      (record) => record.studentId !== cell.studentId || record.lessonId !== cell.lessonId,
    );

    if (status === 'present') {
      this.attendance.set(withoutCurrent);
      this.restoreSavedMealForCell(cell);
      return;
    }

    if (day) {
      const date = this.toIsoDate(day.date);
      this.setDraftDayConfirmation(date, false);
      this.meals.set(this.meals().filter((meal) => meal.studentId !== cell.studentId || meal.date !== date));
    }

    this.attendance.set([
      ...withoutCurrent,
      {
        studentId: cell.studentId,
        lessonId: cell.lessonId,
        status: 'A',
        reason: this.inlineReason() || 'Без причини',
      },
    ]);
  }

  private resolveFloatingEditorPosition(event?: MouseEvent): FloatingEditorPosition {
    const fallback = { top: 160, left: 24 };
    const target = event?.currentTarget as HTMLElement | null;

    if (!target) {
      return fallback;
    }

    const rect = target.getBoundingClientRect();
    const editorWidth = 232;
    const editorHeight = 188;
    const gap = 8;
    const left = Math.min(
      Math.max(12, rect.left + rect.width / 2 - editorWidth / 2),
      window.innerWidth - editorWidth - 12,
    );
    const preferredTop = rect.bottom + gap;
    const top = preferredTop + editorHeight > window.innerHeight
      ? Math.max(12, rect.top - editorHeight - gap)
      : preferredTop;

    return { top, left };
  }

  private restoreSavedMealForCell(cell: SelectedCell): void {
    const day = this.visibleDays().find((item) => item.id === cell.lessonId);

    if (!day) {
      return;
    }

    const date = this.toIsoDate(day.date);
    const savedMeal = this.savedMeals().find((meal) => meal.studentId === cell.studentId && meal.date === date);
    const withoutCurrent = this.meals().filter((meal) => meal.studentId !== cell.studentId || meal.date !== date);

    this.meals.set(savedMeal ? [...withoutCurrent, { ...savedMeal }] : withoutCurrent);
  }

  updateAttendanceDate(date: Date): void {
    this.attendanceDate.set(this.boundAttendanceDate(date));
    this.loadSelectedWeek();
  }

  moveAttendanceDate(direction: -1 | 1): void {
    if (!this.canMoveAttendanceDate(direction)) {
      return;
    }

    const nextDate = new Date(this.attendanceDate());
    nextDate.setDate(nextDate.getDate() + direction * 7);

    this.attendanceDate.set(this.boundAttendanceDate(nextDate));
    this.loadSelectedWeek();
  }

  goToToday(): void {
    if (!this.canGoToCurrentWeek()) {
      return;
    }

    this.attendanceDate.set(this.boundAttendanceDate(new Date()));
    this.loadSelectedWeek();
  }

  canMoveAttendanceDate(direction: -1 | 1): boolean {
    const nextDate = new Date(this.attendanceDate());
    nextDate.setDate(nextDate.getDate() + direction * 7);

    return this.isDateWithinAcademicYear(this.resolveAttendanceDate(nextDate));
  }

  canGoToCurrentWeek(): boolean {
    return this.isDateWithinAcademicYear(this.resolveAttendanceDate(new Date()));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (this.editingCell() && !target?.closest('.floating-cell-editor, .status-cell')) {
      this.closeCellEditor();
    }
  }

  @HostListener('window:resize')
  @HostListener('window:scroll')
  closeFloatingEditorOnViewportChange(): void {
    this.isMobileViewport.set(this.resolveIsMobileViewport());

    if (this.editingCell()) {
      this.closeCellEditor();
    }
  }

  private resolveIsMobileViewport(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 760;
  }

  private resolveAttendanceDate(date: Date): Date {
    const resolved = new Date(date);
    resolved.setHours(0, 0, 0, 0);
    const day = resolved.getDay();

    if (day === 0) {
      resolved.setDate(resolved.getDate() - 2);
    }

    if (day === 6) {
      resolved.setDate(resolved.getDate() - 1);
    }

    return resolved;
  }

  private boundAttendanceDate(date: Date): Date {
    const resolved = this.resolveAttendanceDate(date);
    const start = this.parseIsoDate(this.academicYearStart());
    const end = this.parseIsoDate(this.academicYearEnd());

    if (start && resolved < start) {
      return this.firstWeekdayOnOrAfter(start);
    }

    if (end && resolved > end) {
      return this.resolveAttendanceDate(end);
    }

    return resolved;
  }

  private firstWeekdayOnOrAfter(date: Date): Date {
    const resolved = new Date(date);
    resolved.setHours(0, 0, 0, 0);

    if (resolved.getDay() === 6) {
      resolved.setDate(resolved.getDate() + 2);
    }

    if (resolved.getDay() === 0) {
      resolved.setDate(resolved.getDate() + 1);
    }

    return resolved;
  }

  private resolveWeekRange(date: Date): { start: Date; end: Date } {
    const start = new Date(date);
    const dayOffset = (start.getDay() + 6) % 7;

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - dayOffset);

    const end = new Date(start);
    end.setDate(start.getDate() + 4);

    return { start, end };
  }

  private formatWeekRange(start: Date, end: Date, includeYear: boolean): string {
    const startLabel = new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
    }).format(start);
    const endLabel = new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      ...(includeYear ? { year: 'numeric' } : {}),
    }).format(end);

    return `${startLabel} - ${endLabel}`;
  }

  private formatColumnDate(date: Date): string {
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'short',
    }).format(date);
  }

  private resolveSchoolDay(date: Date): { isSchoolDay: boolean; note?: string } {
    const isoDate = this.toIsoDate(date);
    const exception = this.calendarExceptions().find((item) => item.date === isoDate);

    if (!this.isDateWithinAcademicYear(date)) {
      return {
        isSchoolDay: false,
        note: 'Поза навчальним роком',
      };
    }

    return {
      isSchoolDay: exception?.isSchoolDay ?? true,
      note: exception?.note,
    };
  }

  private isDateWithinAcademicYear(date: Date): boolean {
    const start = this.parseIsoDate(this.academicYearStart());
    const end = this.parseIsoDate(this.academicYearEnd());
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);

    if (start && normalized < start) {
      return false;
    }

    if (end && normalized > end) {
      return false;
    }

    return true;
  }

  private recordsMatch(first?: AttendanceRecord, second?: AttendanceRecord): boolean {
    return (
      first?.status === second?.status &&
      first?.reason === second?.reason &&
      first?.comment === second?.comment
    );
  }

  private mealsMatch(first?: StudentMeal, second?: StudentMeal): boolean {
    return (
      first?.hadMeal === second?.hadMeal &&
      first?.comment === second?.comment
    );
  }

  private normalizeAttendanceToWeekdays(attendance: AttendanceRecord[]): AttendanceRecord[] {
    return attendance
      .map((record) => ({
        ...record,
        lessonId: record.lessonId > 100 ? record.lessonId % 100 : record.lessonId,
      }))
      .filter((record) => record.lessonId >= 1 && record.lessonId <= 5);
  }

  private loadClasses(academicYearId: number): void {
    this.classesApi
      .getClasses(academicYearId)
      .pipe(catchError(() => of([])))
      .subscribe((classes) => {
        const activeClasses = classes.filter((schoolClass) => schoolClass.isActive);

        this.classes.set(classes);

        const currentClass = activeClasses.find((schoolClass) => schoolClass.id === this.selectedClassId());
        const latestClass = this.findLatestClass(activeClasses);
        const nextClass = currentClass ?? latestClass;

        if (nextClass) {
          this.selectClass(nextClass);
          return;
        }

        this.selectedClassId.set(null);
        this.selectedClass.set('');
        this.students.set([]);
      });
  }

  private selectClass(schoolClass: ClassDto): void {
    this.selectedClassId.set(schoolClass.id);
    this.selectedClass.set(schoolClass.name);
    this.loadWeekMatrix(schoolClass.id);
    this.closeCellEditor();
    this.closeAttendanceEditor();
  }

  private loadSelectedWeek(): void {
    const classId = this.selectedClassId();

    if (classId) {
      this.loadWeekMatrix(classId);
    }
  }

  private loadWeekMatrix(classId: number): void {
    this.isMatrixLoading.set(true);
    this.weekLoadFailed.set(false);
    this.failedCellKeys.set(new Set());

    this.attendanceApi
      .getWeek(classId, this.toIsoDate(this.weekRange().start))
      .pipe(
        catchError(() => {
          this.weekLoadFailed.set(true);

          return of(null);
        }),
        finalize(() => this.isMatrixLoading.set(false)),
      )
      .subscribe((matrix) => {
        if (matrix) {
          this.weekLoadFailed.set(false);
          this.applyWeekMatrix(matrix);
        } else {
          this.students.set([]);
          this.attendance.set([]);
          this.savedAttendance.set([]);
          this.meals.set([]);
          this.savedMeals.set([]);
          this.matrixDays.set([]);
          this.savedDayConfirmations.set({});
        }
      });
  }

  private findLatestClass(classes: ClassDto[]): ClassDto | undefined {
    return [...classes].sort((a, b) => b.id - a.id)[0];
  }

  private applyWeekMatrix(matrix: AttendanceWeekMatrixDto): void {
    const schoolClass = this.classes().find((item) => item.id === matrix.classId);
    const className = schoolClass?.name ?? this.selectedClass();
    const dateToDayId = new Map(matrix.days.map((day, index) => [day.date, index + 1]));
    const nextStudents = matrix.students.map<Student>((student) => ({
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      className,
      birthDate: '',
      isActive: true,
    }));
    const nextAttendance: AttendanceRecord[] = [];
    const nextMeals: StudentMeal[] = [];
    const nextDayConfirmations = matrix.days.reduce<Record<string, boolean>>((confirmations, day) => {
      confirmations[day.date] = day.attendanceConfirmed;
      return confirmations;
    }, {});

    matrix.students.forEach((student) => {
      Object.entries(student.days).forEach(([date, dayState]) => {
        const lessonId = dateToDayId.get(date);

        if (!lessonId) {
          return;
        }

        if (dayState.attendance !== 'PRESENT') {
          nextAttendance.push({
            studentId: student.id,
            lessonId,
            status: 'A',
            reason: this.apiStatusToReason(dayState.attendance),
          });
        }

        if (!dayState.meal) {
          nextMeals.push({
            studentId: student.id,
            date,
            hadMeal: false,
          });
        }
      });
    });

    this.matrixDays.set(matrix.days);
    this.savedDayConfirmations.set(nextDayConfirmations);
    this.students.set(nextStudents);
    this.attendance.set(nextAttendance);
    this.savedAttendance.set(nextAttendance.map((record) => ({ ...record })));
    this.meals.set(nextMeals);
    this.savedMeals.set(nextMeals.map((meal) => ({ ...meal })));
    this.closeCellEditor();
    this.closeAttendanceEditor();
  }

  private changeKey(studentId: number, date: string): string {
    return `${studentId}:${date}`;
  }

  private setDraftDayConfirmation(date: string, attendanceConfirmed: boolean): void {
    this.matrixDays.update((days) =>
      days.map((day) => (day.date === date ? { ...day, attendanceConfirmed } : day)),
    );
  }

  private clearFailedCell(studentId: number, date: string): void {
    const nextFailedCells = new Set(this.failedCellKeys());
    nextFailedCells.delete(this.changeKey(studentId, date));
    this.failedCellKeys.set(nextFailedCells);
  }

  private collectWeekChanges(): AttendanceWeekChangeDto[] {
    const changes: AttendanceWeekChangeDto[] = [];

    this.students()
      .filter((student) => student.className === this.selectedClass())
      .forEach((student) => {
        this.visibleSchoolDays().forEach((day) => {
          const date = this.toIsoDate(day.date);
          const attendanceChanged = this.isCellChanged(student.id, day.id);
          const mealChanged = this.isMealChanged(student.id, date);

          if (!attendanceChanged && !mealChanged) {
            return;
          }

          const attendanceRecord = this.recordFor(student.id, day.id);
          const attendance = this.recordToApiStatus(attendanceRecord);

          changes.push({
            studentId: student.id,
            date,
            attendance,
            meal: attendance === 'PRESENT' ? this.hasMeal(student.id, date) : false,
          });
        });
      });

    return changes;
  }

  private collectDayConfirmationChanges(): AttendanceDayConfirmationChangeDto[] {
    return this.visibleSchoolDays()
      .filter((day) => day.attendanceConfirmed !== !!this.savedDayConfirmations()[this.toIsoDate(day.date)])
      .map((day) => ({
        date: this.toIsoDate(day.date),
        allPresent: day.attendanceConfirmed,
      }));
  }

  private apiStatusToReason(status: AttendanceApiStatus): string {
    const reasons: Record<Exclude<AttendanceApiStatus, 'PRESENT'>, string> = {
      ABSENT_NO_REASON: 'Без причини',
      EXCUSED: 'Поважна причина',
      SICK: 'Хворий',
    };

    return status === 'PRESENT' ? 'Без причини' : reasons[status];
  }

  private recordToApiStatus(record?: AttendanceRecord): AttendanceApiStatus {
    if (!record) {
      return 'PRESENT';
    }

    if (record.reason === 'Хворий') {
      return 'SICK';
    }

    if (record.reason === 'Поважна причина') {
      return 'EXCUSED';
    }

    return 'ABSENT_NO_REASON';
  }

  private weekdayLabel(weekday: AttendanceWeekDayDto['weekday']): string {
    const labels: Record<AttendanceWeekDayDto['weekday'], string> = {
      monday: 'Понеділок',
      tuesday: 'Вівторок',
      wednesday: 'Середа',
      thursday: 'Четвер',
      friday: 'Пʼятниця',
    };

    return labels[weekday];
  }

  private compareClassNames(first: string, second: string): number {
    return first.localeCompare(second, 'uk', { numeric: true, sensitivity: 'base' });
  }

  toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private parseIsoDate(value: string): Date | null {
    if (!value) {
      return null;
    }

    const [year, month, day] = value.split('-').map(Number);

    if (!year || !month || !day) {
      return null;
    }

    return new Date(year, month - 1, day);
  }

}

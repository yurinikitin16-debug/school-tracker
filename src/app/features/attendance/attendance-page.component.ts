import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AcademicCalendarException,
  AttendanceExceptionStatus,
  AttendanceRecord,
  AttendanceViewStatus,
  Student,
  StudentMeal,
} from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiDatePickerComponent } from '../../shared/ui/date-picker/ui-date-picker.component';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiConfirmDialogComponent } from '../../shared/ui/confirm-dialog/ui-confirm-dialog.component';
import { UiIconComponent, UiIconName } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiStatCardComponent } from '../../shared/ui/stat-card/ui-stat-card.component';
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
    UiStatCardComponent,
    UiToolbarComponent,
  ],
  templateUrl: './attendance-page.component.html',
  styleUrl: './attendance-page.component.scss',
})
export class AttendancePageComponent {
  private readonly schoolData = inject(SchoolDataService);

  readonly weekdays: Weekday[] = [
    { id: 1, label: 'Понеділок' },
    { id: 2, label: 'Вівторок' },
    { id: 3, label: 'Середа' },
    { id: 4, label: 'Четвер' },
    { id: 5, label: 'Пʼятниця' },
  ];
  readonly students = signal<Student[]>([]);
  readonly attendance = signal<AttendanceRecord[]>([]);
  readonly savedAttendance = signal<AttendanceRecord[]>([]);
  readonly meals = signal<StudentMeal[]>([]);
  readonly savedMeals = signal<StudentMeal[]>([]);
  readonly calendarExceptions = signal<AcademicCalendarException[]>([]);
  readonly tableMode = signal<TableMode>('attendance');

  readonly selectedClass = signal('8-А');
  readonly selectedStatus = signal<StatusFilter>('all');
  readonly searchTerm = signal('');
  readonly selectedCell = signal<SelectedCell | null>(null);
  readonly editingCell = signal<SelectedCell | null>(null);
  readonly cellEditorPosition = signal<FloatingEditorPosition | null>(null);
  readonly inlineStatus = signal<AttendanceViewStatus>('present');
  readonly inlineReason = signal('');
  readonly inlineComment = signal('');
  readonly draftStatus = signal<AttendanceViewStatus>('present');
  readonly draftReason = signal('');
  readonly draftComment = signal('');
  readonly draftFullWeekAbsent = signal(false);
  readonly saveNotice = signal('');
  readonly confirmationAction = signal<ConfirmationAction | null>(null);
  readonly attendanceDate = signal(this.resolveAttendanceDate(new Date()));
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
  readonly changedTotalCount = computed(() => this.changedCellCount() + this.changedMealCount());
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

  readonly classOptions = computed<UiSelectOption[]>(() =>
    [...new Set(this.students().map((student) => student.className))].map((className) => ({
      label: className,
      value: className,
    })),
  );

  readonly statusOptions: UiSelectOption[] = [
    { label: 'Усі статуси', value: 'all' },
    { label: 'Відсутні', value: 'A' },
    { label: 'Хворіє', value: 'S' },
    { label: 'Звільнені', value: 'E' },
  ];

  readonly tableModeOptions: { label: string; value: TableMode }[] = [
    { label: 'Неявки', value: 'attendance' },
    { label: 'Харчування', value: 'meals' },
    { label: 'Разом', value: 'combined' },
  ];

  readonly editStatusOptions: UiSelectOption[] = [
    { label: 'Присутній', value: 'present' },
    { label: 'Відсутній', value: 'A' },
    { label: 'Хворіє', value: 'S' },
    { label: 'Звільнений', value: 'E' },
  ];

  readonly allDayStatusOptions: UiSelectOption[] = [
    { label: 'Відсутній', value: 'A' },
    { label: 'Хворіє', value: 'S' },
    { label: 'Звільнений', value: 'E' },
  ];

  readonly reasonOptions: UiSelectOption[] = [
    { label: 'Не вказано', value: '' },
    { label: 'Сімейні обставини', value: 'Сімейні обставини' },
    { label: 'Хвороба', value: 'Хвороба' },
    { label: 'Олімпіада', value: 'Олімпіада' },
    { label: 'Медична довідка', value: 'Медична довідка' },
    { label: 'Особисті справи', value: 'Особисті справи' },
  ];

  readonly selectedStudent = computed(() => {
    const cell = this.selectedCell();
    return cell ? this.students().find((student) => student.id === cell.studentId) : undefined;
  });

  readonly visibleDays = computed<WeekdayColumn[]>(() => {
    const start = this.weekRange().start;

    return this.weekdays.map((weekday, index) => {
      const date = new Date(start);
      date.setDate(start.getDate() + index);

      return {
        ...weekday,
        date,
        dateLabel: this.formatColumnDate(date),
        ...this.resolveSchoolDay(date),
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
    if (!this.students().some((student) => student.className === this.selectedClass())) {
      return {
        title: 'У класі поки немає учнів',
        description: 'Додайте учнів у довіднику, щоб вести відвідування.',
        icon: 'users' as const,
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
          this.visibleSchoolDays().some((day) => this.statusFor(row, day.id) === selectedStatus);

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
      days.some((day) => !this.mealFor(student.id, this.toIsoDate(day.date))?.hadMeal),
    ).length;

    return { studentsWithoutMeal };
  });

  constructor() {
    forkJoin({
      students: this.schoolData.getStudents(),
      attendance: this.schoolData.getAttendance(),
      meals: this.schoolData.getStudentMeals(),
    }).subscribe(({ students, attendance, meals }) => {
      this.students.set(students);
      const weeklyAttendance = this.normalizeAttendanceToWeekdays(attendance);
      this.attendance.set(weeklyAttendance);
      this.savedAttendance.set(weeklyAttendance.map((record) => ({ ...record })));
      this.meals.set(meals.map((meal) => ({ ...meal })));
      this.savedMeals.set(meals.map((meal) => ({ ...meal })));
      this.selectedClass.set(students[0]?.className ?? '');
    });

    this.schoolData.getAcademicCalendarExceptions().subscribe((calendarExceptions) => {
      this.calendarExceptions.set(calendarExceptions);
      this.closeCellEditor();
    });
  }

  statusFor(row: AttendanceRow, lessonId: number): AttendanceViewStatus {
    return row.records.get(lessonId)?.status ?? 'present';
  }

  recordFor(studentId: number, lessonId: number): AttendanceRecord | undefined {
    return this.attendance().find((record) => record.studentId === studentId && record.lessonId === lessonId);
  }

  mealFor(studentId: number, date: string): StudentMeal | undefined {
    return this.meals().find((meal) => meal.studentId === studentId && meal.date === date);
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

  statusLabel(status: AttendanceViewStatus): string {
    const labels: Record<AttendanceViewStatus, string> = {
      present: 'Присутній',
      A: 'Відсутній',
      S: 'Хворіє',
      E: 'Звільнений',
    };

    return labels[status];
  }

  statusMark(status: AttendanceViewStatus): string {
    const marks: Record<AttendanceViewStatus, string> = {
      present: '✓',
      A: 'Відсутній',
      S: 'Хворіє',
      E: 'Звільнений',
    };

    return marks[status];
  }

  cellText(row: AttendanceRow, lessonId: number): string {
    const day = this.visibleDays().find((item) => item.id === lessonId);
    if (day && this.tableMode() === 'meals') {
      return this.mealText(row, day);
    }

    const record = row.records.get(lessonId);
    const attendanceText = record ? record.reason || this.statusLabel(record.status) : this.statusMark('present');

    if (day && this.tableMode() === 'combined') {
      return `${attendanceText} / ${this.mealText(row, day)}`;
    }

    return attendanceText;
  }

  mealText(row: AttendanceRow, day: WeekdayColumn): string {
    if (!day.isSchoolDay) {
      return '—';
    }

    if (this.statusFor(row, day.id) !== 'present') {
      return 'Не був';
    }

    return this.mealFor(row.student.id, this.toIsoDate(day.date))?.hadMeal ? 'Харчувався' : 'Не харчувався';
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
    const current = this.mealFor(row.student.id, date);
    const withoutCurrent = this.meals().filter((meal) => meal.studentId !== row.student.id || meal.date !== date);

    if (current?.hadMeal) {
      this.meals.set(withoutCurrent);
      return;
    }

    this.meals.set([...withoutCurrent, { studentId: row.student.id, date, hadMeal: true }]);
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

  updateClass(value: string): void {
    this.selectedClass.set(value);
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
    this.inlineStatus.set(record?.status ?? 'present');
    this.inlineReason.set(record?.reason ?? '');
    this.inlineComment.set(record?.comment ?? '');
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
    this.inlineComment.set('');
  }

  updateInlineStatus(value: string): void {
    const status = value as AttendanceViewStatus;
    this.inlineStatus.set(status);

    if (status !== 'A') {
      this.inlineReason.set('');
      this.inlineComment.set('');
    }

    this.applyInlineChanges();
  }

  updateInlineReason(value: string): void {
    this.inlineReason.set(value);
    this.applyInlineChanges();
  }

  updateInlineComment(value: string): void {
    this.inlineComment.set(value);
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
    this.draftStatus.set(firstRecord?.status ?? 'A');
    this.draftReason.set(firstRecord?.reason ?? '');
    this.draftComment.set(firstRecord?.comment ?? '');
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
    this.draftReason.set('');
    this.draftComment.set('');
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
    this.draftStatus.set(record?.status ?? 'present');
    this.draftReason.set(record?.reason ?? '');
    this.draftComment.set(record?.comment ?? '');
  }

  closeAttendanceEditor(): void {
    this.selectedCell.set(null);
    this.draftStatus.set('present');
    this.draftReason.set('');
    this.draftComment.set('');
    this.draftFullWeekAbsent.set(false);
  }

  updateDraftStatus(value: string): void {
    const status = value as AttendanceViewStatus;

    this.draftStatus.set(status);

    if (status !== 'A') {
      this.draftReason.set('');
      this.draftComment.set('');
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
    this.meals.set(this.meals().filter((meal) => meal.studentId !== cell.studentId || !dates.has(meal.date)));
    const status = this.draftStatus() as AttendanceExceptionStatus;
    const allDayRecords = days.map<AttendanceRecord>((day) => ({
      studentId: cell.studentId,
      lessonId: day.id,
      status,
      reason: status === 'A' ? this.draftReason() || undefined : undefined,
      comment: status === 'A' ? this.draftComment().trim() || undefined : undefined,
    }));

    this.attendance.set([...withoutStudentDays, ...allDayRecords]);
    this.closeAttendanceEditor();
  }

  studentShortName(student: Student): string {
    return `${student.lastName} ${student.firstName.charAt(0)}.`;
  }

  saveChanges(): void {
    this.savedAttendance.set(this.attendance().map((record) => ({ ...record })));
    this.savedMeals.set(this.meals().map((meal) => ({ ...meal })));
    this.saveNotice.set('Зміни збережено');

    window.setTimeout(() => this.saveNotice.set(''), 3000);
  }

  requestSaveChanges(): void {
    this.confirmationAction.set('save');
  }

  requestDiscardChanges(): void {
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
    const withoutCurrent = this.attendance().filter(
      (record) => record.studentId !== cell.studentId || record.lessonId !== cell.lessonId,
    );

    if (status === 'present') {
      this.attendance.set(withoutCurrent);
      this.restoreSavedMealForCell(cell);
      return;
    }

    const day = this.visibleDays().find((item) => item.id === cell.lessonId);
    if (day) {
      const date = this.toIsoDate(day.date);
      this.meals.set(this.meals().filter((meal) => meal.studentId !== cell.studentId || meal.date !== date));
    }

    this.attendance.set([
      ...withoutCurrent,
      {
        studentId: cell.studentId,
        lessonId: cell.lessonId,
        status: status as AttendanceExceptionStatus,
        reason: status === 'A' ? this.inlineReason() || undefined : undefined,
        comment: status === 'A' ? this.inlineComment().trim() || undefined : undefined,
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
    this.attendanceDate.set(this.resolveAttendanceDate(date));
  }

  moveAttendanceDate(direction: -1 | 1): void {
    const nextDate = new Date(this.attendanceDate());
    nextDate.setDate(nextDate.getDate() + direction * 7);

    this.attendanceDate.set(nextDate);
  }

  goToToday(): void {
    this.attendanceDate.set(this.resolveAttendanceDate(new Date()));
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
    if (this.editingCell()) {
      this.closeCellEditor();
    }
  }

  private resolveAttendanceDate(date: Date): Date {
    const resolved = new Date(date);
    const day = resolved.getDay();

    if (day === 0) {
      resolved.setDate(resolved.getDate() - 2);
    }

    if (day === 6) {
      resolved.setDate(resolved.getDate() - 1);
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

    return {
      isSchoolDay: exception?.isSchoolDay ?? true,
      note: exception?.note,
    };
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

  toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

}

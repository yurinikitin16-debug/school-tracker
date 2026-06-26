import { CommonModule } from '@angular/common';
import { Component, computed, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  AttendanceExceptionStatus,
  AttendanceRecord,
  AttendanceViewStatus,
  Lesson,
  Student,
} from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiDatePickerComponent } from '../../shared/ui/date-picker/ui-date-picker.component';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiConfirmDialogComponent } from '../../shared/ui/confirm-dialog/ui-confirm-dialog.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
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

type StatusFilter = 'all' | AttendanceViewStatus;
type ConfirmationAction = 'save' | 'discard';

interface SelectedCell {
  studentId: number;
  lessonId: number;
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

  readonly students = signal<Student[]>([]);
  readonly lessons = signal<Lesson[]>([]);
  readonly attendance = signal<AttendanceRecord[]>([]);
  readonly savedAttendance = signal<AttendanceRecord[]>([]);

  readonly selectedClass = signal('8-А');
  readonly selectedStatus = signal<StatusFilter>('all');
  readonly searchTerm = signal('');
  readonly selectedCell = signal<SelectedCell | null>(null);
  readonly editingCell = signal<SelectedCell | null>(null);
  readonly inlineStatus = signal<AttendanceViewStatus>('present');
  readonly inlineReason = signal('');
  readonly inlineComment = signal('');
  readonly draftStatus = signal<AttendanceViewStatus>('present');
  readonly draftReason = signal('');
  readonly draftComment = signal('');
  readonly draftAllDayAbsent = signal(false);
  readonly saveNotice = signal('');
  readonly confirmationAction = signal<ConfirmationAction | null>(null);
  readonly attendanceDate = signal(this.resolveAttendanceDate(new Date()));
  readonly dateLabel = computed(() => this.formatDate(this.attendanceDate(), false));
  readonly headerDateLabel = computed(() => this.formatDate(this.attendanceDate(), true));
  readonly classLessons = computed(() =>
    this.lessons().filter((lesson) => lesson.className === this.selectedClass()),
  );
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

  readonly selectedLesson = computed(() => {
    const cell = this.selectedCell();
    return cell ? this.lessons().find((lesson) => lesson.id === cell.lessonId) : undefined;
  });

  readonly visibleLessons = computed(() =>
    this.lessons().filter((lesson) => lesson.className === this.selectedClass()),
  );

  readonly emptyState = computed(() => {
    if (!this.students().some((student) => student.className === this.selectedClass())) {
      return {
        title: 'У класі поки немає учнів',
        description: 'Додайте учнів у довіднику, щоб вести відвідування.',
        icon: 'users' as const,
      };
    }

    if (!this.classLessons().length) {
      return {
        title: 'На цей день уроків немає',
        description: 'Оберіть іншу дату або перевірте розклад класу.',
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
    const lessonIds = new Set(this.visibleLessons().map((lesson) => lesson.id));

    return this.students()
      .filter((student) => student.className === this.selectedClass())
      .map((student) => {
        const records = new Map<number, AttendanceRecord>();

        this.attendance()
          .filter((record) => record.studentId === student.id && lessonIds.has(record.lessonId))
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
          this.visibleLessons().some((lesson) => this.statusFor(row, lesson.id) === selectedStatus);

        return searchMatches && statusMatches;
      });
  });

  readonly dailySummary = computed(() => {
    const students = this.students().filter((student) => student.className === this.selectedClass());
    const lessons = this.classLessons();

    if (!lessons.length) {
      return { totalStudents: students.length, fullyPresent: 0, fullyAbsent: 0 };
    }

    const records = new Set(
      this.attendance().map((record) => `${record.studentId}:${record.lessonId}`),
    );
    const fullyPresent = students.filter((student) =>
      lessons.every((lesson) => !records.has(`${student.id}:${lesson.id}`)),
    ).length;
    const fullyAbsent = students.filter((student) =>
      lessons.every((lesson) => records.has(`${student.id}:${lesson.id}`)),
    ).length;

    return { totalStudents: students.length, fullyPresent, fullyAbsent };
  });

  constructor() {
    forkJoin({
      students: this.schoolData.getStudents(),
      lessons: this.schoolData.getLessons(),
      attendance: this.schoolData.getAttendance(),
    }).subscribe(({ students, lessons, attendance }) => {
      this.students.set(students);
      this.lessons.set(lessons);
      this.attendance.set(attendance);
      this.savedAttendance.set(attendance);
      this.selectedClass.set(students[0]?.className ?? '');
    });
  }

  statusFor(row: AttendanceRow, lessonId: number): AttendanceViewStatus {
    return row.records.get(lessonId)?.status ?? 'present';
  }

  recordFor(studentId: number, lessonId: number): AttendanceRecord | undefined {
    return this.attendance().find((record) => record.studentId === studentId && record.lessonId === lessonId);
  }

  isCellChanged(studentId: number, lessonId: number): boolean {
    const current = this.recordFor(studentId, lessonId);
    const saved = this.savedAttendance().find(
      (record) => record.studentId === studentId && record.lessonId === lessonId,
    );

    return !this.recordsMatch(current, saved);
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
    const record = row.records.get(lessonId);
    return record ? record.reason || this.statusLabel(record.status) : this.statusMark('present');
  }

  lessonMissedCount(lessonId: number): number {
    return this.rows().filter((row) => row.records.has(lessonId)).length;
  }

  updateClass(value: string): void {
    this.selectedClass.set(value);
  }

  updateStatus(value: string): void {
    this.selectedStatus.set(value as StatusFilter);
  }

  openCellEditor(row: AttendanceRow, lesson: Lesson): void {
    const record = row.records.get(lesson.id);

    this.editingCell.set({ studentId: row.student.id, lessonId: lesson.id });
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
    const lesson = this.visibleLessons()[0];

    if (lesson) {
      const lessons = this.classLessons();
      const dayRecords = lessons
        .map((classLesson) => this.recordFor(row.student.id, classLesson.id))
        .filter((record): record is AttendanceRecord => !!record);
      const isAbsentAllDay = lessons.length > 0 && dayRecords.length === lessons.length;
      const firstRecord = dayRecords[0];

      this.selectedCell.set({ studentId: row.student.id, lessonId: lesson.id });
      this.draftAllDayAbsent.set(isAbsentAllDay);
      this.draftStatus.set(firstRecord?.status ?? 'A');
      this.draftReason.set(firstRecord?.reason ?? '');
      this.draftComment.set(firstRecord?.comment ?? '');
    }
  }

  updateDraftAllDayAbsent(isAbsentAllDay: boolean): void {
    this.draftAllDayAbsent.set(isAbsentAllDay);

    if (isAbsentAllDay) {
      return;
    }

    const cell = this.selectedCell();

    if (!cell) {
      return;
    }

    const lessonIds = new Set(this.classLessons().map((lesson) => lesson.id));
    this.attendance.set(
      this.attendance().filter(
        (record) => record.studentId !== cell.studentId || !lessonIds.has(record.lessonId),
      ),
    );
    this.draftStatus.set('A');
    this.draftReason.set('');
    this.draftComment.set('');
  }

  openAttendanceEditor(row: AttendanceRow, lesson: Lesson): void {
    const record = row.records.get(lesson.id);

    this.selectedCell.set({
      studentId: row.student.id,
      lessonId: lesson.id,
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
    this.draftAllDayAbsent.set(false);
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

    if (!this.draftAllDayAbsent()) {
      this.closeAttendanceEditor();
      return;
    }

    const lessons = this.classLessons();
    const lessonIds = new Set(lessons.map((lesson) => lesson.id));
    const withoutStudentLessons = this.attendance().filter(
      (record) => record.studentId !== cell.studentId || !lessonIds.has(record.lessonId),
    );
    const status = this.draftStatus() as AttendanceExceptionStatus;
    const allDayRecords = lessons.map<AttendanceRecord>((lesson) => ({
      studentId: cell.studentId,
      lessonId: lesson.id,
      status,
      reason: status === 'A' ? this.draftReason() || undefined : undefined,
      comment: status === 'A' ? this.draftComment().trim() || undefined : undefined,
    }));

    this.attendance.set([...withoutStudentLessons, ...allDayRecords]);
    this.closeAttendanceEditor();
  }

  studentShortName(student: Student): string {
    return `${student.lastName} ${student.firstName.charAt(0)}.`;
  }

  saveChanges(): void {
    this.savedAttendance.set(this.attendance().map((record) => ({ ...record })));
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
      return;
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

  updateAttendanceDate(date: Date): void {
    this.attendanceDate.set(date);
  }

  moveAttendanceDate(direction: -1 | 1): void {
    const nextDate = new Date(this.attendanceDate());
    nextDate.setDate(nextDate.getDate() + direction);

    while (nextDate.getDay() === 0 || nextDate.getDay() === 6) {
      nextDate.setDate(nextDate.getDate() + direction);
    }

    this.attendanceDate.set(nextDate);
  }

  goToToday(): void {
    this.attendanceDate.set(this.resolveAttendanceDate(new Date()));
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (this.editingCell() && !target?.closest('.cell-editor, .status-cell')) {
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

  private formatDate(date: Date, includeWeekday: boolean): string {
    return new Intl.DateTimeFormat('uk-UA', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      ...(includeWeekday ? { weekday: 'long' } : {}),
    }).format(date);
  }

  private recordsMatch(first?: AttendanceRecord, second?: AttendanceRecord): boolean {
    return (
      first?.status === second?.status &&
      first?.reason === second?.reason &&
      first?.comment === second?.comment
    );
  }

}

import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { catchError, finalize, forkJoin, of } from 'rxjs';

import { AcademicYearService } from '../../core/services/academic-year.service';
import {
  AttendanceApiService,
  AttendanceApiStatus,
  AttendanceWeekMatrixDto,
  AttendanceWeekStudentDto,
} from '../../core/services/attendance-api.service';
import { ClassDto, ClassesApiService } from '../../core/services/classes-api.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiStatCardComponent } from '../../shared/ui/stat-card/ui-stat-card.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

type ReportView = 'overview' | 'students' | 'classes' | 'meals';
type StudentSort = 'risk' | 'name';

interface ReportStudent {
  id: number;
  firstName: string;
  lastName: string;
  classId: number;
  className: string;
}

interface OverviewDay {
  date: string;
  dayLabel: string;
  weekdayLabel: string;
  startsWeek: boolean;
  isSchoolDay: boolean;
}

interface OverviewCell {
  code: string;
  label: string;
  tone: 'present' | 'A' | 'S' | 'E';
}

interface StudentReportRow {
  student: ReportStudent;
  absenceDays: number;
  missedMealDays: number;
}

interface ClassReportRow {
  classId: number;
  className: string;
  totalStudents: number;
  studentsWithAbsences: number;
  totalAbsences: number;
  missedMeals: number;
  absencePercent: number;
  studentIds: number[];
}

interface MealReportRow {
  student: ReportStudent;
  mealDays: number;
  missedMealDays: number;
}

@Component({
  selector: 'app-weekly-reports-page',
  imports: [
    CommonModule,
    UiEmptyStateComponent,
    UiIconComponent,
    UiInputComponent,
    UiPageHeaderComponent,
    UiSelectComponent,
    UiStatCardComponent,
    UiToolbarComponent,
  ],
  templateUrl: './weekly-reports-page.component.html',
  styleUrl: './weekly-reports-page.component.scss',
})
export class WeeklyReportsPageComponent {
  private readonly academicYear = inject(AcademicYearService);
  private readonly attendanceApi = inject(AttendanceApiService);
  private readonly classesApi = inject(ClassesApiService);

  readonly classes = signal<ClassDto[]>([]);
  readonly matrices = signal<AttendanceWeekMatrixDto[]>([]);
  readonly selectedClassId = signal<string>('');
  readonly selectedMonth = signal('');
  readonly selectedView = signal<ReportView>('overview');
  readonly selectedStudentSort = signal<StudentSort>('risk');
  readonly selectedClassReport = signal<ClassReportRow | null>(null);
  readonly searchTerm = signal('');
  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);

  readonly classOptions = computed<UiSelectOption[]>(() => {
    const activeClasses = this.activeClasses();
    const options = activeClasses.map((schoolClass) => ({
      label: schoolClass.name,
      value: schoolClass.id.toString(),
    }));

    return activeClasses.length > 1
      ? [{ label: 'Загалом', value: 'all' }, ...options]
      : options;
  });

  readonly monthOptions = computed<UiSelectOption[]>(() => {
    const year = this.academicYear.currentAcademicYear();
    return year ? this.buildMonthOptions(year.startsOn, year.endsOn) : [];
  });

  readonly studentSortOptions: UiSelectOption[] = [
    { label: 'Найбільше пропусків', value: 'risk' },
    { label: 'Прізвище А-Я', value: 'name' },
  ];

  readonly overviewDays = computed<OverviewDay[]>(() =>
    this.buildOverviewDates().map((date, index) => {
      const dayDate = new Date(`${date}T12:00:00`);
      const matrixDay = this.matrices()
        .flatMap((matrix) => matrix.days)
        .find((day) => day.date === date);

      return {
        date,
        dayLabel: new Intl.DateTimeFormat('uk-UA', { day: 'numeric' }).format(dayDate),
        weekdayLabel: new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }).format(dayDate),
        startsWeek: index > 0 && dayDate.getDay() === 1,
        isSchoolDay: matrixDay?.isSchoolDay ?? true,
      };
    }),
  );

  readonly overviewRows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.reportStudents()
      .filter((student) => !query || this.studentName(student).toLowerCase().includes(query))
      .sort((first, second) => this.studentName(first).localeCompare(this.studentName(second), 'uk'));
  });

  readonly summary = computed(() => {
    const rows = this.overviewRows();
    const studentsWithAbsences = rows.filter((student) => this.overviewStudentTotal(student) > 0).length;
    const totalAbsences = rows.reduce((total, student) => total + this.overviewStudentTotal(student), 0);

    return { totalStudents: rows.length, studentsWithAbsences, totalAbsences };
  });

  readonly studentRows = computed<StudentReportRow[]>(() => {
    const rows = this.overviewRows().map((student) => ({
      student,
      absenceDays: this.overviewStudentTotal(student),
      missedMealDays: this.mealStudentTotal(student),
    }));

    return rows.sort((first, second) => {
      if (this.selectedStudentSort() === 'name') {
        return this.studentName(first.student).localeCompare(this.studentName(second.student), 'uk');
      }

      return second.absenceDays - first.absenceDays ||
        second.missedMealDays - first.missedMealDays ||
        this.studentName(first.student).localeCompare(this.studentName(second.student), 'uk');
    });
  });

  readonly classRows = computed<ClassReportRow[]>(() =>
    this.activeClasses().map((schoolClass) => {
      const students = this.reportStudents().filter((student) => student.classId === schoolClass.id);
      const studentIds = students
        .filter((student) => this.overviewStudentTotal(student) > 0)
        .map((student) => student.id);
      const totalAbsences = students.reduce((total, student) => total + this.overviewStudentTotal(student), 0);
      const missedMeals = students.reduce((total, student) => total + this.mealStudentTotal(student), 0);

      return {
        classId: schoolClass.id,
        className: schoolClass.name,
        totalStudents: students.length,
        studentsWithAbsences: studentIds.length,
        totalAbsences,
        missedMeals,
        absencePercent: students.length ? Math.round((studentIds.length / students.length) * 100) : 0,
        studentIds,
      };
    }),
  );

  readonly mealRows = computed<MealReportRow[]>(() =>
    this.overviewRows()
      .map((student) => {
        const schoolDays = this.schoolOverviewDays();
        const missedMealDays = this.mealStudentTotal(student);

        return {
          student,
          mealDays: Math.max(0, schoolDays.length - missedMealDays),
          missedMealDays,
        };
      })
      .sort((first, second) =>
        second.missedMealDays - first.missedMealDays ||
        this.studentName(first.student).localeCompare(this.studentName(second.student), 'uk'),
      ),
  );

  readonly mealSummary = computed(() => {
    const rows = this.mealRows();
    const studentsWithoutMeals = rows.filter((row) => row.missedMealDays > 0).length;
    const totalMeals = rows.reduce((total, row) => total + row.mealDays, 0);
    const missedMeals = rows.reduce((total, row) => total + row.missedMealDays, 0);

    return { studentsWithoutMeals, totalMeals, missedMeals };
  });

  readonly selectedClassReportStudents = computed(() => {
    const row = this.selectedClassReport();
    return row ? this.reportStudents().filter((student) => row.studentIds.includes(student.id)) : [];
  });

  constructor() {
    effect(() => {
      const academicYearId = this.academicYear.currentYearId();

      if (academicYearId) {
        this.loadClasses(academicYearId);
      }
    });

    effect(() => {
      const options = this.monthOptions();
      const selectedMonth = this.selectedMonth();

      if (options.length && !options.some((option) => option.value === selectedMonth)) {
        this.selectedMonth.set(this.defaultMonthValue(options));
      }
    });

    effect(() => {
      const selectedMonth = this.selectedMonth();
      const selectedClassId = this.selectedClassId();

      if (selectedMonth && selectedClassId && this.activeClasses().length) {
        this.loadReportData();
      }
    });
  }

  updateClass(classId: string): void {
    this.selectedClassId.set(classId);
    this.searchTerm.set('');
  }

  updateMonth(month: string): void {
    this.selectedMonth.set(month);
  }

  updateView(view: ReportView): void {
    this.selectedView.set(view);
  }

  updateStudentSort(sort: string): void {
    this.selectedStudentSort.set(sort as StudentSort);
  }

  openClassReport(row: ClassReportRow): void {
    if (row.studentsWithAbsences) {
      this.selectedClassReport.set(row);
    }
  }

  closeClassReport(): void {
    this.selectedClassReport.set(null);
  }

  studentName(student: ReportStudent): string {
    return `${student.lastName} ${student.firstName}`;
  }

  overviewCell(student: ReportStudent, date: string): OverviewCell {
    const cell = this.dayState(student, date);

    if (!cell || cell.attendance === 'PRESENT') {
      return { code: '✓', label: 'Присутній', tone: 'present' };
    }

    const labels: Record<Exclude<AttendanceApiStatus, 'PRESENT'>, OverviewCell> = {
      ABSENT_NO_REASON: { code: 'Н', label: 'Без причини', tone: 'A' },
      EXCUSED: { code: 'п/п', label: 'Поважна причина', tone: 'E' },
      SICK: { code: 'хв', label: 'Хворий', tone: 'S' },
    };

    return labels[cell.attendance];
  }

  mealCell(student: ReportStudent, date: string): OverviewCell {
    const cell = this.dayState(student, date);

    if (!cell || cell.meal) {
      return { code: '✓', label: 'Харчувався', tone: 'present' };
    }

    return { code: 'Ні', label: 'Не харчувався', tone: 'A' };
  }

  overviewStudentTotal(student: ReportStudent): number {
    return this.schoolOverviewDays().filter((day) => this.overviewCell(student, day.date).tone !== 'present').length;
  }

  overviewDayTotal(date: string): number {
    return this.overviewRows().filter((student) => this.overviewCell(student, date).tone !== 'present').length;
  }

  overviewGrandTotal(): number {
    return this.overviewRows().reduce((total, student) => total + this.overviewStudentTotal(student), 0);
  }

  mealStudentTotal(student: ReportStudent): number {
    return this.schoolOverviewDays().filter((day) => this.mealCell(student, day.date).tone !== 'present').length;
  }

  mealDayTotal(date: string): number {
    return this.overviewRows().filter((student) => this.mealCell(student, date).tone !== 'present').length;
  }

  mealGrandTotal(): number {
    return this.overviewRows().reduce((total, student) => total + this.mealStudentTotal(student), 0);
  }

  formatDate(date: string): string {
    return new Intl.DateTimeFormat('uk-UA', {
      weekday: 'short',
      day: 'numeric',
      month: 'long',
    }).format(new Date(`${date}T12:00:00`));
  }

  async exportReport(): Promise<void> {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();
    const classLabel = this.classOptions().find((option) => option.value === this.selectedClassId())?.label ?? '';
    const periodLabel = this.monthOptions().find((option) => option.value === this.selectedMonth())?.label ?? '';
    const overviewRows = [
      ['Звіт пропусків'],
      ['Клас', classLabel],
      ['Період', periodLabel],
      [],
      ['Учень', ...this.overviewDays().map((day) => day.date), 'Всього'],
      ...this.overviewRows().map((student) => [
        this.studentName(student),
        ...this.overviewDays().map((day) => this.overviewCell(student, day.date).code),
        this.overviewStudentTotal(student),
      ]),
      [
        'Всього',
        ...this.overviewDays().map((day) => this.overviewDayTotal(day.date)),
        this.overviewGrandTotal(),
      ],
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 28 }, ...this.overviewDays().map(() => ({ wch: 8 })), { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Пропуски');

    const mealRows = [
      ['Звіт харчування'],
      ['Клас', classLabel],
      ['Період', periodLabel],
      [],
      ['Учень', ...this.overviewDays().map((day) => day.date), 'Не харч.'],
      ...this.overviewRows().map((student) => [
        this.studentName(student),
        ...this.overviewDays().map((day) => this.mealCell(student, day.date).code),
        this.mealStudentTotal(student),
      ]),
      [
        'Всього',
        ...this.overviewDays().map((day) => this.mealDayTotal(day.date)),
        this.mealGrandTotal(),
      ],
    ];
    const mealsSheet = XLSX.utils.aoa_to_sheet(mealRows);
    mealsSheet['!cols'] = [{ wch: 28 }, ...this.overviewDays().map(() => ({ wch: 8 })), { wch: 10 }];
    XLSX.utils.book_append_sheet(workbook, mealsSheet, 'Харчування');

    XLSX.writeFile(workbook, `school-report-${this.selectedClassId()}-${this.selectedMonth()}.xlsx`);
  }

  private loadClasses(academicYearId: number): void {
    this.classesApi
      .getClasses(academicYearId)
      .pipe(catchError(() => of([])))
      .subscribe((classes) => {
        const activeClasses = classes.filter((schoolClass) => schoolClass.isActive);

        this.classes.set(activeClasses);

        if (!activeClasses.length) {
          this.selectedClassId.set('');
          return;
        }

        if (!activeClasses.some((schoolClass) => schoolClass.id.toString() === this.selectedClassId())) {
          this.selectedClassId.set(this.findLatestClass(activeClasses)?.id.toString() ?? activeClasses[0].id.toString());
        }
      });
  }

  private loadReportData(): void {
    const classIds = this.selectedReportClassIds();
    const weekStarts = this.weekStartsForSelectedMonth();

    if (!classIds.length || !weekStarts.length) {
      this.matrices.set([]);
      return;
    }

    this.isLoading.set(true);
    this.loadFailed.set(false);

    forkJoin(
      classIds.flatMap((classId) =>
        weekStarts.map((weekStart) =>
          this.attendanceApi.getWeek(classId, weekStart).pipe(catchError(() => of(null))),
        ),
      ),
    ).pipe(finalize(() => this.isLoading.set(false))).subscribe((matrices) => {
      const loadedMatrices = matrices.filter((matrix): matrix is AttendanceWeekMatrixDto => !!matrix);
      this.loadFailed.set(loadedMatrices.length !== matrices.length);
      this.matrices.set(loadedMatrices);
    });
  }

  private activeClasses(): ClassDto[] {
    return [...this.classes()].sort((first, second) =>
      first.name.localeCompare(second.name, 'uk', { numeric: true, sensitivity: 'base' }),
    );
  }

  private selectedReportClassIds(): number[] {
    if (this.selectedClassId() === 'all') {
      return this.activeClasses().map((schoolClass) => schoolClass.id);
    }

    const classId = Number(this.selectedClassId());
    return Number.isFinite(classId) ? [classId] : [];
  }

  private reportStudents(): ReportStudent[] {
    const students = new Map<number, ReportStudent>();

    this.matrices().forEach((matrix) => {
      const schoolClass = this.classes().find((item) => item.id === matrix.classId);

      matrix.students.forEach((student) => {
        students.set(student.id, this.mapStudent(student, matrix.classId, schoolClass?.name ?? ''));
      });
    });

    return [...students.values()];
  }

  private mapStudent(student: AttendanceWeekStudentDto, classId: number, className: string): ReportStudent {
    return {
      id: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      classId,
      className,
    };
  }

  private dayState(student: ReportStudent, date: string): { attendance: AttendanceApiStatus; meal: boolean } | null {
    const matrix = this.matrices().find((item) =>
      item.classId === student.classId &&
      item.days.some((day) => day.date === date),
    );

    return matrix?.students.find((item) => item.id === student.id)?.days[date] ?? null;
  }

  private schoolOverviewDays(): OverviewDay[] {
    return this.overviewDays().filter((day) => day.isSchoolDay);
  }

  private buildMonthOptions(startsOn: string, endsOn: string): UiSelectOption[] {
    const start = this.parseIsoDate(startsOn);
    const end = this.parseIsoDate(endsOn);

    if (!start || !end) {
      return [];
    }

    const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
    const lastMonth = new Date(end.getFullYear(), end.getMonth(), 1);
    const options: UiSelectOption[] = [];

    while (cursor <= lastMonth) {
      options.push({
        label: this.formatMonth(cursor),
        value: this.monthKey(cursor),
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    return options;
  }

  private defaultMonthValue(options: UiSelectOption[]): string {
    const currentMonth = this.monthKey(new Date());

    return options.some((option) => option.value === currentMonth)
      ? currentMonth
      : options[0].value;
  }

  private buildOverviewDates(): string[] {
    const selectedMonth = this.selectedMonth();
    const [year, month] = selectedMonth.split('-').map(Number);

    if (!year || !month) {
      return [];
    }

    const academicYear = this.academicYear.currentAcademicYear();
    const startsOn = this.parseIsoDate(academicYear?.startsOn ?? '');
    const endsOn = this.parseIsoDate(academicYear?.endsOn ?? '');
    const cursor = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);
    const dates: string[] = [];

    while (cursor <= monthEnd) {
      const day = cursor.getDay();
      const isWeekday = day >= 1 && day <= 5;
      const isInsideAcademicYear = (!startsOn || cursor >= startsOn) && (!endsOn || cursor <= endsOn);

      if (isWeekday && isInsideAcademicYear) {
        dates.push(this.toIsoDate(cursor));
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    return dates;
  }

  private weekStartsForSelectedMonth(): string[] {
    const weekStarts = new Set<string>();

    this.buildOverviewDates().forEach((date) => {
      const weekStart = new Date(`${date}T12:00:00`);
      const dayOffset = (weekStart.getDay() + 6) % 7;

      weekStart.setDate(weekStart.getDate() - dayOffset);
      weekStarts.add(this.toIsoDate(weekStart));
    });

    return [...weekStarts].sort((first, second) => first.localeCompare(second));
  }

  private findLatestClass(classes: ClassDto[]): ClassDto | undefined {
    return [...classes].sort((first, second) => second.id - first.id)[0];
  }

  private formatMonth(date: Date): string {
    return new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(date);
  }

  private monthKey(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private toIsoDate(date: Date): string {
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

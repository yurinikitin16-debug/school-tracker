import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AttendanceReportDay, Student, StudentMeal } from '../../core/models/school.models';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiStatCardComponent } from '../../shared/ui/stat-card/ui-stat-card.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

type ReportPeriod = 'week' | 'month';
type ReportView = 'overview' | 'students' | 'classes' | 'meals';
type StudentSort = 'risk' | 'name';

interface ReportStudentList {
  day: AttendanceReportDay;
}

interface ClassReportRow {
  className: string;
  totalStudents: number;
  studentsWithAbsences: number;
  totalAbsences: number;
  absencePercent: number;
  studentIds: number[];
}

interface MealReportRow {
  student: Student;
  mealDays: number;
  missedMealDays: number;
}

interface OverviewDay {
  date: string;
  dayLabel: string;
  weekdayLabel: string;
  startsWeek: boolean;
}

interface OverviewCell {
  code: string;
  label: string;
  tone: 'present' | 'A' | 'S' | 'E';
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
  private readonly schoolData = inject(SchoolDataService);
  private readonly academicYear = inject(AcademicYearService);

  readonly students = signal<Student[]>([]);
  readonly reportDays = signal<AttendanceReportDay[]>([]);
  readonly meals = signal<StudentMeal[]>([]);
  readonly selectedClass = signal('8-А');
  readonly selectedPeriod = signal<ReportPeriod>('week');
  readonly selectedMonth = signal('');
  readonly selectedView = signal<ReportView>('overview');
  readonly selectedStudentSort = signal<StudentSort>('risk');
  readonly selectedStudentList = signal<ReportStudentList | null>(null);
  readonly selectedClassReport = signal<ClassReportRow | null>(null);
  readonly searchTerm = signal('');

  readonly classOptions = computed<UiSelectOption[]>(() =>
    [
      { label: 'Загалом', value: 'all' },
      ...[...new Set(this.students().map((student) => student.className))].map((className) => ({
        label: className,
        value: className,
      })),
    ],
  );

  readonly monthOptions = computed<UiSelectOption[]>(() => {
    const year = this.academicYear.currentAcademicYear();

    if (!year) {
      return this.monthOptionsFromReportDays();
    }

    return this.buildMonthOptions(year.startsOn, year.endsOn);
  });

  readonly studentSortOptions: UiSelectOption[] = [
    { label: 'Найбільше неявок', value: 'risk' },
    { label: 'Прізвище А-Я', value: 'name' },
  ];

  readonly visibleDays = computed(() => {
    const days = this.selectedClass() === 'all'
      ? this.aggregateSchoolDays(this.reportDays())
      : this.reportDays().filter((day) => day.className === this.selectedClass());

    days.sort((first, second) => second.date.localeCompare(first.date));

    return this.selectedPeriod() === 'week' ? days.slice(0, 5) : days;
  });

  readonly summary = computed(() => {
    const days = this.visibleDays();
    const totalStudents = this.selectedClass() === 'all'
      ? this.students().length
      : this.students().filter((student) => student.className === this.selectedClass()).length;
    const studentsWithAbsences = new Set(days.flatMap((day) => this.absentStudentIds(day))).size;
    const totalAbsences = days.reduce((total, day) => total + this.absentStudentIds(day).length, 0);

    return { totalStudents, studentsWithAbsences, totalAbsences };
  });

  readonly overviewDays = computed<OverviewDay[]>(() => {
    const dates = this.buildOverviewDates();

    return dates.map((date, index) => {
      const dayDate = new Date(`${date}T12:00:00`);

      return {
        date,
        dayLabel: new Intl.DateTimeFormat('uk-UA', { day: 'numeric' }).format(dayDate),
        weekdayLabel: new Intl.DateTimeFormat('uk-UA', { weekday: 'short' }).format(dayDate),
        startsWeek: index > 0 && dayDate.getDay() === 1,
      };
    });
  });

  readonly overviewRows = computed(() => {
    const query = this.searchTerm().trim().toLowerCase();

    return this.students()
      .filter((student) => this.selectedClass() === 'all' || student.className === this.selectedClass())
      .filter((student) => !query || this.studentName(student).toLowerCase().includes(query))
      .sort((first, second) => this.studentName(first).localeCompare(this.studentName(second), 'uk'));
  });
  readonly mealSummary = computed(() => {
    const rows = this.mealRows();
    const studentsWithoutMeals = rows.filter((row) => row.missedMealDays > 0).length;
    const totalMeals = rows.reduce((total, row) => total + row.mealDays, 0);
    const missedMeals = rows.reduce((total, row) => total + row.missedMealDays, 0);

    return { studentsWithoutMeals, totalMeals, missedMeals };
  });

  readonly selectedStudents = computed(() => {
    const selection = this.selectedStudentList();

    return selection
      ? this.students().filter((student) => this.absentStudentIds(selection.day).includes(student.id))
      : [];
  });

  readonly studentRows = computed(() => {
    const rows = this.students()
      .filter((student) => this.selectedClass() === 'all' || student.className === this.selectedClass())
      .map((student) => {
        const absenceDays = this.visibleDays().filter((day) => this.absentStudentIds(day).includes(student.id)).length;

        return { student, absenceDays };
      });

    return rows.sort((first, second) => {
      if (this.selectedStudentSort() === 'name') {
        return this.studentName(first.student).localeCompare(this.studentName(second.student), 'uk');
      }

      return second.absenceDays - first.absenceDays ||
        this.studentName(first.student).localeCompare(this.studentName(second.student), 'uk');
    });
  });

  readonly classRows = computed<ClassReportRow[]>(() => {
    const classNames = [...new Set(this.students().map((student) => student.className))].sort((first, second) =>
      first.localeCompare(second, 'uk'),
    );

    return classNames.map((className) => {
      const classStudents = this.students().filter((student) => student.className === className);
      const classDays = this.reportDaysForClass(className);
      const studentAbsences = new Map<number, number>();

      classDays.forEach((day) => {
        this.absentStudentIds(day).forEach((studentId) => {
          studentAbsences.set(studentId, (studentAbsences.get(studentId) ?? 0) + 1);
        });
      });

      const studentIds = [...studentAbsences.keys()];
      const totalAbsences = [...studentAbsences.values()].reduce((total, count) => total + count, 0);

      return {
        className,
        totalStudents: classStudents.length,
        studentsWithAbsences: studentIds.length,
        totalAbsences,
        absencePercent: classStudents.length ? Math.round((studentIds.length / classStudents.length) * 100) : 0,
        studentIds,
      };
    });
  });

  readonly mealRows = computed<MealReportRow[]>(() => {
    const dates = this.visibleDays().map((day) => day.date);

    return this.students()
      .filter((student) => this.selectedClass() === 'all' || student.className === this.selectedClass())
      .map((student) => {
        const mealDays = dates.filter((date) => this.hasMeal(student.id, date)).length;

        return {
          student,
          mealDays,
          missedMealDays: Math.max(0, dates.length - mealDays),
        };
      })
      .sort((first, second) =>
        second.missedMealDays - first.missedMealDays ||
        this.studentName(first.student).localeCompare(this.studentName(second.student), 'uk'),
      );
  });

  constructor() {
    effect(() => {
      const options = this.monthOptions();
      const selectedMonth = this.selectedMonth();

      if (!options.length) {
        return;
      }

      if (!options.some((option) => option.value === selectedMonth)) {
        this.selectedMonth.set(this.defaultMonthValue(options));
      }
    });

    forkJoin({
      students: this.schoolData.getStudents(),
      reportDays: this.schoolData.getAttendanceReportDays(),
      meals: this.schoolData.getStudentMeals(),
    }).subscribe(({ students, reportDays, meals }) => {
      this.students.set(students);
      this.reportDays.set(reportDays);
      this.meals.set(meals.filter((meal) => !meal.hadMeal));
      this.selectedClass.set(students[0]?.className ?? '');
    });
  }

  updateClass(className: string): void {
    this.selectedClass.set(className);
    this.searchTerm.set('');
  }

  updatePeriod(period: string): void {
    this.selectedPeriod.set(period as ReportPeriod);
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

  openStudentList(day: AttendanceReportDay): void {
    if (this.absentStudentIds(day).length) {
      this.selectedStudentList.set({ day });
    }
  }

  closeStudentList(): void {
    this.selectedStudentList.set(null);
  }

  openClassReport(row: ClassReportRow): void {
    if (row.studentsWithAbsences) {
      this.selectedClassReport.set(row);
    }
  }

  closeClassReport(): void {
    this.selectedClassReport.set(null);
  }

  readonly selectedClassReportStudents = computed(() => {
    const row = this.selectedClassReport();
    return row ? this.students().filter((student) => row.studentIds.includes(student.id)) : [];
  });

  absentStudentIds(day: AttendanceReportDay): number[] {
    return [...new Set([...day.fullyAbsentStudentIds, ...day.partiallyAbsentStudentIds])];
  }

  studentName(student: Student): string {
    return `${student.lastName} ${student.firstName}`;
  }

  hasMeal(studentId: number, date: string): boolean {
    return !this.meals().some((meal) => meal.studentId === studentId && meal.date === date && meal.hadMeal === false);
  }

  overviewCell(student: Student, date: string): OverviewCell {
    const day = this.reportDays().find((item) => item.className === student.className && item.date === date);

    if (!day || !this.absentStudentIds(day).includes(student.id)) {
      return {
        code: '✓',
        label: 'Присутній',
        tone: 'present',
      };
    }

    if (day.fullyAbsentStudentIds.includes(student.id)) {
      return {
        code: 'Н',
        label: 'Без причини',
        tone: 'A',
      };
    }

    const isSick = (student.id + Number(date.slice(-2))) % 3 === 0;

    return isSick
      ? { code: 'хв', label: 'Хворий', tone: 'S' }
      : { code: 'п/п', label: 'Поважна причина', tone: 'E' };
  }

  overviewStudentTotal(student: Student): number {
    return this.overviewDays().filter((day) => this.overviewCell(student, day.date).tone !== 'present').length;
  }

  overviewDayTotal(date: string): number {
    return this.overviewRows().filter((student) => this.overviewCell(student, date).tone !== 'present').length;
  }

  overviewGrandTotal(): number {
    return this.overviewRows().reduce((total, student) => total + this.overviewStudentTotal(student), 0);
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
    const classLabel = this.selectedClass() === 'all' ? 'Загалом' : this.selectedClass();
    const periodLabel = this.monthOptions().find((option) => option.value === this.selectedMonth())?.label ?? '';
    const overviewRows = [
      ['Звіт неявок'],
      ['Клас', classLabel],
      ['Період', periodLabel],
      [],
      ['Дата', 'Учнів з неявкою'],
      ...this.visibleDays().map((day) => [
        this.formatDate(day.date),
        this.absentStudentIds(day).length,
      ]),
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 24 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Огляд');

    const studentHeaders = [
      'Учень',
      ...(this.selectedClass() === 'all' ? ['Клас'] : []),
      'Днів неявки',
    ];
    const studentRows = this.studentRows().map((row) => [
      this.studentName(row.student),
      ...(this.selectedClass() === 'all' ? [row.student.className] : []),
      row.absenceDays,
    ]);
    const studentsSheet = XLSX.utils.aoa_to_sheet([['Неявки по учнях'], [], studentHeaders, ...studentRows]);
    studentsSheet['!cols'] = [
      { wch: 28 },
      ...(this.selectedClass() === 'all' ? [{ wch: 10 }] : []),
      { wch: 14 },
    ];
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'По учнях');

    const classRows = this.classRows().map((row) => [
      row.className,
      row.totalStudents,
      row.studentsWithAbsences,
      row.totalAbsences,
      row.absencePercent,
    ]);
    const classesSheet = XLSX.utils.aoa_to_sheet([
      ['Неявки по класах'],
      [],
      ['Клас', 'Учнів', 'Учнів з неявками', 'Всього неявок', '% учнів з неявками'],
      ...classRows,
    ]);
    classesSheet['!cols'] = [{ wch: 10 }, { wch: 10 }, { wch: 22 }, { wch: 16 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(workbook, classesSheet, 'По класах');

    const mealHeaders = [
      'Учень',
      ...(this.selectedClass() === 'all' ? ['Клас'] : []),
      'Харчувався днів',
      'Не харчувався днів',
    ];
    const mealRows = this.mealRows().map((row) => [
      this.studentName(row.student),
      ...(this.selectedClass() === 'all' ? [row.student.className] : []),
      row.mealDays,
      row.missedMealDays,
    ]);
    const mealsSheet = XLSX.utils.aoa_to_sheet([['Харчування по учнях'], [], mealHeaders, ...mealRows]);
    mealsSheet['!cols'] = [
      { wch: 28 },
      ...(this.selectedClass() === 'all' ? [{ wch: 10 }] : []),
      { wch: 16 },
      { wch: 18 },
    ];
    XLSX.utils.book_append_sheet(workbook, mealsSheet, 'Харчування');

    XLSX.writeFile(workbook, `absence-report-${this.selectedClass()}-${this.selectedPeriod()}.xlsx`);
  }

  private reportDaysForClass(className: string): AttendanceReportDay[] {
    const days = this.reportDays()
      .filter((day) => day.className === className)
      .sort((first, second) => second.date.localeCompare(first.date));

    return this.selectedPeriod() === 'week' ? days.slice(0, 5) : days;
  }

  private aggregateSchoolDays(days: AttendanceReportDay[]): AttendanceReportDay[] {
    const daysByDate = new Map<string, AttendanceReportDay>();

    for (const day of days) {
      const existing = daysByDate.get(day.date);

      if (existing) {
        existing.fullyAbsentStudents += day.fullyAbsentStudents;
        existing.fullyAbsentStudentIds.push(...day.fullyAbsentStudentIds);
        existing.partiallyAbsentStudents += day.partiallyAbsentStudents;
        existing.partiallyAbsentStudentIds.push(...day.partiallyAbsentStudentIds);
        existing.lessonsWithAbsences += day.lessonsWithAbsences;
        continue;
      }

      daysByDate.set(day.date, {
        ...day,
        className: 'all',
        fullyAbsentStudentIds: [...day.fullyAbsentStudentIds],
        partiallyAbsentStudentIds: [...day.partiallyAbsentStudentIds],
      });
    }

    return [...daysByDate.values()];
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

  private monthOptionsFromReportDays(): UiSelectOption[] {
    const monthKeys = [...new Set(this.reportDays().map((day) => day.date.slice(0, 7)))]
      .sort((first, second) => first.localeCompare(second));

    return monthKeys.map((month) => {
      const [year, monthIndex] = month.split('-').map(Number);
      return {
        label: this.formatMonth(new Date(year, monthIndex - 1, 1)),
        value: month,
      };
    });
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

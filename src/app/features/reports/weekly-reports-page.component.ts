import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AttendanceReportDay, Student } from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiStatCardComponent } from '../../shared/ui/stat-card/ui-stat-card.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

type ReportPeriod = 'week' | 'month';
type ReportView = 'overview' | 'students' | 'classes';
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

@Component({
  selector: 'app-weekly-reports-page',
  imports: [
    CommonModule,
    UiEmptyStateComponent,
    UiIconComponent,
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

  readonly students = signal<Student[]>([]);
  readonly reportDays = signal<AttendanceReportDay[]>([]);
  readonly selectedClass = signal('8-А');
  readonly selectedPeriod = signal<ReportPeriod>('week');
  readonly selectedView = signal<ReportView>('overview');
  readonly selectedStudentSort = signal<StudentSort>('risk');
  readonly selectedStudentList = signal<ReportStudentList | null>(null);
  readonly selectedClassReport = signal<ClassReportRow | null>(null);

  readonly classOptions = computed<UiSelectOption[]>(() =>
    [
      { label: 'Загалом', value: 'all' },
      ...[...new Set(this.students().map((student) => student.className))].map((className) => ({
        label: className,
        value: className,
      })),
    ],
  );

  readonly periodOptions: UiSelectOption[] = [
    { label: 'Останній тиждень', value: 'week' },
    { label: 'Поточний місяць', value: 'month' },
  ];

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

  constructor() {
    forkJoin({
      students: this.schoolData.getStudents(),
      reportDays: this.schoolData.getAttendanceReportDays(),
    }).subscribe(({ students, reportDays }) => {
      this.students.set(students);
      this.reportDays.set(reportDays);
      this.selectedClass.set(students[0]?.className ?? '');
    });
  }

  updateClass(className: string): void {
    this.selectedClass.set(className);
  }

  updatePeriod(period: string): void {
    this.selectedPeriod.set(period as ReportPeriod);
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
    const periodLabel = this.periodOptions.find((option) => option.value === this.selectedPeriod())?.label ?? '';
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
}

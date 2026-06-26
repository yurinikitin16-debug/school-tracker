import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { AttendanceReportDay, AttendanceReportLesson, Lesson, Student } from '../../core/models/school.models';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiStatCardComponent } from '../../shared/ui/stat-card/ui-stat-card.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

type ReportPeriod = 'week' | 'month';
type ReportView = 'overview' | 'students' | 'lessons';
type StudentSort = 'risk' | 'name';
type ReportStudentListKind = 'fullyAbsent' | 'partiallyAbsent';

interface ReportStudentList {
  day: AttendanceReportDay;
  kind: ReportStudentListKind;
}

interface ReportLessonRow extends AttendanceReportLesson {
  missedLessons: number;
  studentsAffected: number;
  studentIds: number[];
  attendancePercent: number;
}

@Component({
  selector: 'app-reports-page',
  imports: [
    CommonModule,
    UiEmptyStateComponent,
    UiIconComponent,
    UiPageHeaderComponent,
    UiSelectComponent,
    UiStatCardComponent,
    UiToolbarComponent,
  ],
  templateUrl: './reports-page.component.html',
  styleUrl: './reports-page.component.scss',
})
export class ReportsPageComponent {
  private readonly schoolData = inject(SchoolDataService);

  readonly students = signal<Student[]>([]);
  readonly lessons = signal<Lesson[]>([]);
  readonly reportDays = signal<AttendanceReportDay[]>([]);
  readonly reportLessons = signal<AttendanceReportLesson[]>([]);
  readonly selectedClass = signal('8-А');
  readonly selectedPeriod = signal<ReportPeriod>('week');
  readonly selectedView = signal<ReportView>('overview');
  readonly selectedStudentSort = signal<StudentSort>('risk');
  readonly selectedStudentList = signal<ReportStudentList | null>(null);
  readonly selectedStudentForLessons = signal<Student | null>(null);
  readonly selectedStudentForFullDays = signal<Student | null>(null);
  readonly selectedLessonForStudents = signal<ReportLessonRow | null>(null);

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
    { label: 'Найбільше пропусків', value: 'risk' },
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

    return {
      totalStudents,
      fullyAbsent: days.reduce((total, day) => total + day.fullyAbsentStudents, 0),
      missedAny: days.reduce((total, day) => total + day.fullyAbsentStudents + day.partiallyAbsentStudents, 0),
    };
  });

  readonly selectedStudents = computed(() => {
    const selection = this.selectedStudentList();

    if (!selection) {
      return [];
    }

    const ids = selection.kind === 'fullyAbsent'
      ? selection.day.fullyAbsentStudentIds
      : selection.day.partiallyAbsentStudentIds;

    return this.students().filter((student) => ids.includes(student.id));
  });
  readonly selectedStudentListTitle = computed(() =>
    this.selectedStudentList()?.kind === 'fullyAbsent' ? 'Відсутні весь день' : 'Пропустили частину дня',
  );

  readonly studentRows = computed(() => {
    const lessonsByClass = new Map<string, number>();

    this.lessons().forEach((lesson) => {
      lessonsByClass.set(lesson.className, (lessonsByClass.get(lesson.className) ?? 0) + 1);
    });

    const rows = this.students()
      .filter((student) => this.selectedClass() === 'all' || student.className === this.selectedClass())
      .map((student) => {
        let fullDays = 0;
        let partialDays = 0;
        let missedLessons = 0;

        this.visibleDays().forEach((day) => {
          if (day.fullyAbsentStudentIds.includes(student.id)) {
            fullDays += 1;
            missedLessons += lessonsByClass.get(student.className) ?? 0;
          }

          if (day.partiallyAbsentStudentIds.includes(student.id)) {
            partialDays += 1;
            missedLessons += 1;
          }
        });

        return { student, fullDays, partialDays, missedLessons };
      });

    return rows.sort((first, second) => {
      if (this.selectedStudentSort() === 'name') {
        return `${first.student.lastName} ${first.student.firstName}`.localeCompare(
          `${second.student.lastName} ${second.student.firstName}`,
          'uk',
        );
      }

      return second.missedLessons - first.missedLessons ||
        second.fullDays - first.fullDays ||
        `${first.student.lastName} ${first.student.firstName}`.localeCompare(
          `${second.student.lastName} ${second.student.firstName}`,
          'uk',
        );
    });
  });

  readonly lessonRows = computed(() =>
    this.reportLessons()
      .filter((lesson) => this.selectedClass() === 'all' || lesson.className === this.selectedClass())
      .map((lesson) => ({
        ...lesson,
        missedLessons: this.selectedPeriod() === 'week' ? lesson.weekMissedLessons : lesson.monthMissedLessons,
        studentsAffected: this.selectedPeriod() === 'week' ? lesson.weekStudentsAffected : lesson.monthStudentsAffected,
        studentIds: this.selectedPeriod() === 'week' ? lesson.weekStudentIds : lesson.monthStudentIds,
        attendancePercent: this.selectedPeriod() === 'week' ? lesson.weekAttendancePercent : lesson.monthAttendancePercent,
      }) satisfies ReportLessonRow)
      .sort((first, second) => second.missedLessons - first.missedLessons || first.order - second.order),
  );

  constructor() {
    forkJoin({
      students: this.schoolData.getStudents(),
      lessons: this.schoolData.getLessons(),
      reportDays: this.schoolData.getAttendanceReportDays(),
      reportLessons: this.schoolData.getAttendanceReportLessons(),
    }).subscribe(({ students, lessons, reportDays, reportLessons }) => {
      this.students.set(students);
      this.lessons.set(lessons);
      this.reportDays.set(reportDays);
      this.reportLessons.set(reportLessons);
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

  openStudentList(day: AttendanceReportDay, kind: ReportStudentListKind): void {
    const count = kind === 'fullyAbsent' ? day.fullyAbsentStudents : day.partiallyAbsentStudents;

    if (count) {
      this.selectedStudentList.set({ day, kind });
    }
  }

  closeStudentList(): void {
    this.selectedStudentList.set(null);
  }

  openStudentLessons(student: Student, missedLessons: number): void {
    if (missedLessons) {
      this.selectedStudentForLessons.set(student);
    }
  }

  closeStudentLessons(): void {
    this.selectedStudentForLessons.set(null);
  }

  openStudentFullDays(student: Student, fullDays: number): void {
    if (fullDays) {
      this.selectedStudentForFullDays.set(student);
    }
  }

  closeStudentFullDays(): void {
    this.selectedStudentForFullDays.set(null);
  }

  openLessonStudents(lesson: ReportLessonRow): void {
    if (lesson.studentsAffected) {
      this.selectedLessonForStudents.set(lesson);
    }
  }

  closeLessonStudents(): void {
    this.selectedLessonForStudents.set(null);
  }

  readonly selectedStudentLessonRows = computed(() => {
    const student = this.selectedStudentForLessons();
    return student ? this.lessonRows().filter((lesson) => lesson.studentIds.includes(student.id)) : [];
  });

  readonly selectedLessonStudents = computed(() => {
    const lesson = this.selectedLessonForStudents();
    return lesson ? this.students().filter((student) => lesson.studentIds.includes(student.id)) : [];
  });

  readonly selectedStudentFullDays = computed(() => {
    const student = this.selectedStudentForFullDays();
    return student
      ? this.visibleDays().filter((day) => day.fullyAbsentStudentIds.includes(student.id))
      : [];
  });

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
      ['Звіт відвідування'],
      ['Клас', classLabel],
      ['Період', periodLabel],
      [],
      ['Дата', 'Відсутні весь день', 'Пропустили частину дня', 'Уроки з пропусками'],
      ...this.visibleDays().map((day) => [
        this.formatDate(day.date),
        day.fullyAbsentStudents,
        day.partiallyAbsentStudents,
        day.lessonsWithAbsences,
      ]),
    ];
    const overviewSheet = XLSX.utils.aoa_to_sheet(overviewRows);
    overviewSheet['!cols'] = [{ wch: 22 }, { wch: 24 }, { wch: 28 }, { wch: 22 }];
    XLSX.utils.book_append_sheet(workbook, overviewSheet, 'Огляд');

    const studentHeaders = [
      'Учень',
      ...(this.selectedClass() === 'all' ? ['Клас'] : []),
      'Повних пропущених днів',
      'Часткових пропусків',
      'Пропущено уроків',
    ];
    const studentRows = this.studentRows().map((row) => [
      `${row.student.lastName} ${row.student.firstName}`,
      ...(this.selectedClass() === 'all' ? [row.student.className] : []),
      row.fullDays,
      row.partialDays,
      row.missedLessons,
    ]);
    const studentsSheet = XLSX.utils.aoa_to_sheet([['Пропуски по учнях'], [], studentHeaders, ...studentRows]);
    studentsSheet['!cols'] = [
      { wch: 28 },
      ...(this.selectedClass() === 'all' ? [{ wch: 10 }] : []),
      { wch: 28 },
      { wch: 22 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, studentsSheet, 'По учнях');

    const lessonHeaders = [
      ...(this.selectedClass() === 'all' ? ['Клас'] : []),
      'Урок',
      'Предмет',
      'Учнів з пропусками',
      'Відвідуваність, %',
      'Пропущено уроків',
    ];
    const lessonRows = this.lessonRows().map((lesson) => [
      ...(this.selectedClass() === 'all' ? [lesson.className] : []),
      lesson.order,
      lesson.subject,
      lesson.studentsAffected,
      lesson.attendancePercent,
      lesson.missedLessons,
    ]);
    const lessonsSheet = XLSX.utils.aoa_to_sheet([['Пропуски по уроках'], [], lessonHeaders, ...lessonRows]);
    lessonsSheet['!cols'] = [
      ...(this.selectedClass() === 'all' ? [{ wch: 10 }] : []),
      { wch: 10 },
      { wch: 24 },
      { wch: 24 },
      { wch: 20 },
      { wch: 20 },
    ];
    XLSX.utils.book_append_sheet(workbook, lessonsSheet, 'По уроках');

    XLSX.writeFile(workbook, `attendance-report-${this.selectedClass()}-${this.selectedPeriod()}.xlsx`);
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

import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';
import { ScheduleLesson, SchoolClass, Subject, Teacher } from '../../core/models/school.models';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiEmptyStateComponent } from '../../shared/ui/empty-state/ui-empty-state.component';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

interface Weekday {
  value: number;
  label: string;
}

@Component({
  selector: 'app-schedule-page',
  imports: [
    CommonModule,
    UiEmptyStateComponent,
    UiPageHeaderComponent,
    UiSelectComponent,
    UiSidePanelComponent,
    UiToolbarComponent,
  ],
  templateUrl: './schedule-page.component.html',
  styleUrl: './schedule-page.component.scss',
})
export class SchedulePageComponent {
  private readonly schoolData = inject(SchoolDataService);
  private readonly academicYear = inject(AcademicYearService);

  readonly weekdays: Weekday[] = [
    { value: 1, label: 'Понеділок' },
    { value: 2, label: 'Вівторок' },
    { value: 3, label: 'Середа' },
    { value: 4, label: 'Четвер' },
    { value: 5, label: 'Пʼятниця' },
  ];
  readonly lessonNumbers = [1, 2, 3, 4, 5, 6, 7, 8];

  readonly classes = signal<SchoolClass[]>([]);
  readonly subjects = signal<Subject[]>([]);
  readonly teachers = signal<Teacher[]>([]);
  readonly scheduleLessons = signal<ScheduleLesson[]>([]);
  readonly selectedClass = signal('');
  readonly selectedLessonId = signal<number | null>(null);
  readonly draftWeekday = signal('1');
  readonly draftLessonNumber = signal('1');
  readonly draftSubject = signal('');
  readonly draftTeacherId = signal('');

  readonly classOptions = computed<UiSelectOption[]>(() =>
    this.classes()
      .filter((schoolClass) => schoolClass.academicYear === this.academicYear.currentYear() && schoolClass.isActive)
      .map((schoolClass) => ({ label: schoolClass.name, value: schoolClass.name })),
  );
  readonly subjectOptions = computed<UiSelectOption[]>(() =>
    this.subjects()
      .filter((subject) => subject.isActive)
      .map((subject) => ({ label: subject.name, value: subject.name })),
  );
  readonly teacherOptions = computed<UiSelectOption[]>(() =>
    this.teachers().map((teacher) => ({ label: teacher.fullName, value: String(teacher.id) })),
  );
  readonly weekdayOptions = computed<UiSelectOption[]>(() =>
    this.weekdays.map((weekday) => ({ label: weekday.label, value: String(weekday.value) })),
  );
  readonly lessonNumberOptions = computed<UiSelectOption[]>(() =>
    this.lessonNumbers.map((lessonNumber) => ({ label: `${lessonNumber} урок`, value: String(lessonNumber) })),
  );
  readonly selectedClassLessons = computed(() =>
    this.scheduleLessons().filter((lesson) => lesson.className === this.selectedClass()),
  );
  readonly isPanelOpen = computed(() => this.selectedLessonId() !== null);
  readonly isCreatingLesson = computed(() => this.selectedLessonId() === 0);
  readonly panelTitle = computed(() => this.isCreatingLesson() ? 'Додати урок' : 'Редагувати урок');

  constructor() {
    forkJoin({
      classes: this.schoolData.getClasses(),
      subjects: this.schoolData.getSubjects(),
      teachers: this.schoolData.getTeachers(),
      scheduleLessons: this.schoolData.getScheduleLessons(),
    }).subscribe(({ classes, subjects, teachers, scheduleLessons }) => {
      this.classes.set(classes);
      this.subjects.set(subjects);
      this.teachers.set(teachers);
      this.scheduleLessons.set(scheduleLessons.map((lesson) => ({ ...lesson })));
      this.selectedClass.set(this.classOptions()[0]?.value ?? '');
      this.draftSubject.set(this.subjectOptions()[0]?.value ?? '');
      this.draftTeacherId.set(this.teacherOptions()[0]?.value ?? '');
    });
  }

  setClass(className: string): void {
    this.selectedClass.set(className);
    this.closePanel();
  }

  lessonFor(weekday: number, lessonNumber: number): ScheduleLesson | undefined {
    return this.selectedClassLessons().find((lesson) => (
      lesson.weekday === weekday && lesson.lessonNumber === lessonNumber
    ));
  }

  teacherName(teacherId: number): string {
    return this.teachers().find((teacher) => teacher.id === teacherId)?.fullName ?? 'Вчитель не вибраний';
  }

  openCreate(weekday = 1, lessonNumber = 1): void {
    this.selectedLessonId.set(0);
    this.draftWeekday.set(String(weekday));
    this.draftLessonNumber.set(String(lessonNumber));
    this.draftSubject.set(this.subjectOptions()[0]?.value ?? '');
    this.draftTeacherId.set(this.teacherOptions()[0]?.value ?? '');
  }

  openEdit(lesson: ScheduleLesson): void {
    this.selectedLessonId.set(lesson.id);
    this.draftWeekday.set(String(lesson.weekday));
    this.draftLessonNumber.set(String(lesson.lessonNumber));
    this.draftSubject.set(lesson.subject);
    this.draftTeacherId.set(String(lesson.teacherId));
  }

  closePanel(): void {
    this.selectedLessonId.set(null);
  }

  saveLesson(): void {
    const selectedLessonId = this.selectedLessonId();
    const className = this.selectedClass();
    const subject = this.draftSubject();
    const teacherId = Number(this.draftTeacherId());
    const weekday = Number(this.draftWeekday());
    const lessonNumber = Number(this.draftLessonNumber());

    if (selectedLessonId === null || !className || !subject || !teacherId) {
      return;
    }

    const existingCellLesson = this.scheduleLessons().find((lesson) => (
      lesson.className === className
      && lesson.weekday === weekday
      && lesson.lessonNumber === lessonNumber
      && lesson.id !== selectedLessonId
    ));
    const nextLesson: ScheduleLesson = {
      id: selectedLessonId === 0 ? Math.max(0, ...this.scheduleLessons().map((lesson) => lesson.id)) + 1 : selectedLessonId,
      className,
      weekday,
      lessonNumber,
      subject,
      teacherId,
    };

    if (selectedLessonId === 0) {
      this.scheduleLessons.update((lessons) => [
        ...lessons.filter((lesson) => lesson.id !== existingCellLesson?.id),
        nextLesson,
      ]);
    } else {
      this.scheduleLessons.update((lessons) => lessons
        .filter((lesson) => lesson.id !== existingCellLesson?.id)
        .map((lesson) => lesson.id === selectedLessonId ? nextLesson : lesson));
    }

    this.closePanel();
  }

  removeLesson(): void {
    const selectedLessonId = this.selectedLessonId();

    if (!selectedLessonId) {
      return;
    }

    this.scheduleLessons.update((lessons) => lessons.filter((lesson) => lesson.id !== selectedLessonId));
    this.closePanel();
  }
}

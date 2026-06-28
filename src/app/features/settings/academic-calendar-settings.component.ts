import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { AcademicCalendarException } from '../../core/models/school.models';
import { AcademicYearService } from '../../core/services/academic-year.service';
import { SchoolDataService } from '../../core/services/school-data.service';
import { UiIconComponent } from '../../shared/ui/icon/ui-icon.component';
import { UiInputComponent } from '../../shared/ui/input/ui-input.component';
import { UiSelectComponent, UiSelectOption } from '../../shared/ui/select/ui-select.component';
import { UiSidePanelComponent } from '../../shared/ui/side-panel/ui-side-panel.component';
import { UiToolbarComponent } from '../../shared/ui/toolbar/ui-toolbar.component';

type CalendarStatus = 'school' | 'day-off';

interface CalendarDay {
  date: string;
  day: number;
  isWeekend: boolean;
  isSchoolDay: boolean;
  exception?: AcademicCalendarException;
}

@Component({
  selector: 'app-academic-calendar-settings',
  imports: [CommonModule, UiIconComponent, UiInputComponent, UiSelectComponent, UiSidePanelComponent, UiToolbarComponent],
  templateUrl: './academic-calendar-settings.component.html',
  styleUrl: './academic-calendar-settings.component.scss',
})
export class AcademicCalendarSettingsComponent {
  private readonly schoolData = inject(SchoolDataService);
  private readonly academicYear = inject(AcademicYearService);

  readonly exceptions = signal<AcademicCalendarException[]>([]);
  readonly selectedYear = signal(this.academicYear.currentYear());
  readonly month = signal('');
  readonly selectedDates = signal<string[]>([]);
  readonly selectedDate = signal<string | null>(null);
  readonly dragStartDate = signal<string | null>(null);
  readonly isDragging = signal(false);
  readonly isEditorOpen = signal(false);
  readonly draftStatus = signal<CalendarStatus>('day-off');
  readonly draftNote = signal('');

  readonly yearOptions: UiSelectOption[] = [
    { label: '2024/2025', value: '2024/2025' },
    { label: '2025/2026', value: '2025/2026' },
    { label: '2026/2027', value: '2026/2027' },
  ];

  readonly statusOptions: UiSelectOption[] = [
    { label: 'Навчальний день', value: 'school' },
    { label: 'Вихідний або канікули', value: 'day-off' },
  ];

  readonly monthLabel = computed(() => {
    const [year, month] = this.monthParts(this.month());
    const label = new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(new Date(year, month - 1, 1));
    return label.charAt(0).toUpperCase() + label.slice(1);
  });

  readonly days = computed<(CalendarDay | null)[]>(() => {
    const [year, month] = this.monthParts(this.month());
    const firstOffset = (new Date(year, month - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(year, month, 0).getDate();
    const exceptionsByDate = new Map(
      this.exceptions()
        .filter((exception) => exception.academicYear === this.selectedYear())
        .map((exception) => [exception.date, exception]),
    );

    return Array.from({ length: 42 }, (_, index) => {
      const day = index - firstOffset + 1;
      if (day < 1 || day > daysInMonth) {
        return null;
      }

      const date = this.toIsoDate(year, month, day);
      const isWeekend = this.isWeekend(date);
      const exception = exceptionsByDate.get(date);
      return { date, day, isWeekend, isSchoolDay: exception?.isSchoolDay ?? !isWeekend, exception };
    });
  });

  readonly isPanelOpen = computed(() => this.isEditorOpen());
  readonly selectedDateLabels = computed(() => this.selectedDates().map((date) => this.formatShortDate(date)));
  readonly panelTitle = computed(() => this.selectedDate() ? this.formatDate(this.selectedDate()!) : 'День');

  constructor() {
    this.month.set(this.academicYearStart(this.selectedYear()));
    this.schoolData.getAcademicCalendarExceptions().subscribe((exceptions) => {
      this.exceptions.set(exceptions.map((exception) => ({ ...exception })));
    });
  }

  @HostListener('document:mouseup')
  stopSelection(): void {
    if (this.isDragging() && this.selectedDates().length) {
      this.isEditorOpen.set(true);
    }

    this.isDragging.set(false);
    this.dragStartDate.set(null);
  }

  updateYear(year: string): void {
    this.selectedYear.set(year);
    this.month.set(this.academicYearStart(year));
    this.closePanel();
  }

  changeMonth(direction: number): void {
    const [year, month] = this.monthParts(this.month());
    const next = new Date(year, month - 1 + direction, 1);
    this.month.set(this.toIsoDate(next.getFullYear(), next.getMonth() + 1, 1));
    this.closePanel();
  }

  startSelection(day: CalendarDay, event: MouseEvent): void {
    event.preventDefault();
    this.isEditorOpen.set(false);
    this.isDragging.set(true);
    this.dragStartDate.set(day.date);
    this.openDates([day.date]);
  }

  extendSelection(day: CalendarDay): void {
    const startDate = this.dragStartDate();
    if (!this.isDragging() || !startDate) {
      return;
    }

    this.openDates(this.dateRange(startDate, day.date));
  }

  isSelected(date: string): boolean {
    return this.selectedDates().includes(date);
  }

  openDay(day: CalendarDay): void {
    this.selectedDate.set(day.date);
    this.selectedDates.set([day.date]);
    this.isEditorOpen.set(true);
    this.draftStatus.set(day.isSchoolDay ? 'school' : 'day-off');
    this.draftNote.set(day.exception?.note ?? '');
  }

  closePanel(): void {
    this.selectedDate.set(null);
    this.selectedDates.set([]);
    this.dragStartDate.set(null);
    this.isDragging.set(false);
    this.isEditorOpen.set(false);
    this.draftStatus.set('day-off');
    this.draftNote.set('');
  }

  saveDay(): void {
    const dates = this.selectedDates();
    if (!dates.length) {
      return;
    }

    const isSchoolDay = this.draftStatus() === 'school';
    const note = this.draftNote().trim();
    const selectedDates = new Set(dates);

    this.exceptions.update((exceptions) => {
      let nextId = Math.max(0, ...exceptions.map((exception) => exception.id)) + 1;
      const updated = exceptions
        .filter((exception) => !(
          exception.academicYear === this.selectedYear() &&
          selectedDates.has(exception.date) &&
          isSchoolDay === !this.isWeekend(exception.date) &&
          !note
        ))
        .map((exception) => {
          if (exception.academicYear !== this.selectedYear() || !selectedDates.has(exception.date)) {
            return exception;
          }

          return { ...exception, isSchoolDay, note: note || undefined };
        });

      for (const date of dates) {
        const alreadyExists = updated.some((exception) => exception.academicYear === this.selectedYear() && exception.date === date);
        const hasDefaultValue = isSchoolDay === !this.isWeekend(date) && !note;
        if (!alreadyExists && !hasDefaultValue) {
          updated.push({
            id: nextId,
            academicYear: this.selectedYear(),
            date,
            isSchoolDay,
            note: note || undefined,
          });
          nextId += 1;
        }
      }

      return updated;
    });

    this.schoolData.updateAcademicCalendarExceptions(this.exceptions());
    this.closePanel();
  }

  private openDates(dates: string[]): void {
    const selectedDates = [...new Set(dates)].sort();
    const firstDate = selectedDates[0];
    const firstDay = this.days().find((day) => day?.date === firstDate);

    this.selectedDate.set(firstDate ?? null);
    this.selectedDates.set(selectedDates);
    this.draftStatus.set(firstDay?.isSchoolDay ? 'school' : 'day-off');
    this.draftNote.set(selectedDates.length === 1 ? firstDay?.exception?.note ?? '' : '');
  }

  private dateRange(startDate: string, endDate: string): string[] {
    const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDate.split('-').map(Number);
    const start = new Date(startYear, startMonth - 1, startDay);
    const end = new Date(endYear, endMonth - 1, endDay);
    const direction = start <= end ? 1 : -1;
    const dates: string[] = [];

    for (let current = new Date(start); direction === 1 ? current <= end : current >= end; current.setDate(current.getDate() + direction)) {
      dates.push(this.toIsoDate(current.getFullYear(), current.getMonth() + 1, current.getDate()));
    }

    return dates;
  }

  private academicYearStart(year: string): string {
    return `${year.slice(0, 4)}-09-01`;
  }

  private monthParts(date: string): [number, number] {
    const [year, month] = date.split('-').map(Number);
    return [year, month];
  }

  private toIsoDate(year: number, month: number, day: number): string {
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  private isWeekend(date: string): boolean {
    const [year, month, day] = date.split('-').map(Number);
    const weekday = new Date(year, month - 1, day).getDay();
    return weekday === 0 || weekday === 6;
  }

  private formatDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(year, month - 1, day));
  }

  private formatShortDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Intl.DateTimeFormat('uk-UA', { weekday: 'short', day: 'numeric', month: 'long' }).format(new Date(year, month - 1, day));
  }
}

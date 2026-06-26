import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
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
  readonly selectedDate = signal<string | null>(null);
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

  readonly isPanelOpen = computed(() => this.selectedDate() !== null);
  readonly panelTitle = computed(() => this.selectedDate() ? this.formatDate(this.selectedDate()!) : 'День');

  constructor() {
    this.month.set(this.academicYearStart(this.selectedYear()));
    this.schoolData.getAcademicCalendarExceptions().subscribe((exceptions) => {
      this.exceptions.set(exceptions.map((exception) => ({ ...exception })));
    });
  }

  updateYear(year: string): void {
    this.selectedYear.set(year);
    this.month.set(this.academicYearStart(year));
  }

  changeMonth(direction: number): void {
    const [year, month] = this.monthParts(this.month());
    const next = new Date(year, month - 1 + direction, 1);
    this.month.set(this.toIsoDate(next.getFullYear(), next.getMonth() + 1, 1));
  }

  openDay(day: CalendarDay): void {
    this.selectedDate.set(day.date);
    this.draftStatus.set(day.isSchoolDay ? 'school' : 'day-off');
    this.draftNote.set(day.exception?.note ?? '');
  }

  closePanel(): void {
    this.selectedDate.set(null);
    this.draftStatus.set('day-off');
    this.draftNote.set('');
  }

  saveDay(): void {
    const date = this.selectedDate();
    if (!date) {
      return;
    }

    const isSchoolDay = this.draftStatus() === 'school';
    const note = this.draftNote().trim();
    const existing = this.exceptions().find((exception) => exception.academicYear === this.selectedYear() && exception.date === date);
    const hasDefaultValue = isSchoolDay === !this.isWeekend(date) && !note;

    if (hasDefaultValue) {
      this.exceptions.update((exceptions) => exceptions.filter((exception) => exception !== existing));
    } else if (existing) {
      this.exceptions.update((exceptions) => exceptions.map((exception) => (
        exception === existing ? { ...exception, isSchoolDay, note: note || undefined } : exception
      )));
    } else {
      const id = Math.max(0, ...this.exceptions().map((exception) => exception.id)) + 1;
      this.exceptions.update((exceptions) => [...exceptions, {
        id,
        academicYear: this.selectedYear(),
        date,
        isSchoolDay,
        note: note || undefined,
      }]);
    }

    this.closePanel();
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
}

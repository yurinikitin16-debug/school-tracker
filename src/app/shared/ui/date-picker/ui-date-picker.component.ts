import { Component, EventEmitter, HostListener, Input, Output, computed, signal } from '@angular/core';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isInSelectedWeek: boolean;
  isToday: boolean;
  isWeekend: boolean;
  isDisabled: boolean;
  weekKey: string;
}

@Component({
  selector: 'ui-date-picker',
  templateUrl: './ui-date-picker.component.html',
  styleUrl: './ui-date-picker.component.scss',
})
export class UiDatePickerComponent {
  readonly isOpen = signal(false);
  readonly hoveredWeekKey = signal('');
  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly calendarMonthLabel = computed(() =>
    new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(this.calendarMonth()),
  );
  readonly calendarDays = computed(() => this.buildCalendarDays(this.calendarMonth(), this.selectedDate));

  @Input({ required: true }) label = '';
  @Input({ required: true }) selectedDate = new Date();
  @Input() selectionMode: 'day' | 'week' = 'day';
  @Input() disabledDates: string[] = [];
  @Output() selectedDateChange = new EventEmitter<Date>();

  toggle(): void {
    this.calendarMonth.set(new Date(this.selectedDate.getFullYear(), this.selectedDate.getMonth(), 1));
    this.isOpen.update((value) => !value);
  }

  previousMonth(): void {
    const month = this.calendarMonth();
    this.calendarMonth.set(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  }

  nextMonth(): void {
    const month = this.calendarMonth();
    this.calendarMonth.set(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  }

  selectDate(day: CalendarDay): void {
    if (day.isDisabled) {
      return;
    }

    this.selectedDateChange.emit(day.date);
    this.calendarMonth.set(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    this.isOpen.set(false);
  }

  hoverDay(day: CalendarDay): void {
    this.hoveredWeekKey.set(this.selectionMode === 'week' ? day.weekKey : '');
  }

  clearHoveredWeek(): void {
    this.hoveredWeekKey.set('');
  }

  isWeekHovered(day: CalendarDay): boolean {
    return this.selectionMode === 'week' && this.hoveredWeekKey() === day.weekKey;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;

    if (this.isOpen() && !target?.closest('.date-picker')) {
      this.isOpen.set(false);
    }
  }

  private buildCalendarDays(month: Date, selectedDate: Date): CalendarDay[] {
    const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const startDate = new Date(firstDay);
    const today = new Date();

    startDate.setDate(firstDay.getDate() - startOffset);

    return Array.from({ length: 42 }, (_, index) => {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + index);

      const weekStart = this.startOfWeek(date);

      return {
        date,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month.getMonth(),
        isSelected: this.isSameDate(date, selectedDate),
        isInSelectedWeek: this.isSameWeek(date, selectedDate),
        isToday: this.isSameDate(date, today),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        isDisabled: date.getDay() === 0 || date.getDay() === 6 || this.disabledDates.includes(this.toIsoDate(date)),
        weekKey: weekStart.toISOString(),
      };
    });
  }

  private startOfWeek(date: Date): Date {
    const start = new Date(date);
    const dayOffset = (start.getDay() + 6) % 7;

    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - dayOffset);

    return start;
  }

  private isSameWeek(first: Date, second: Date): boolean {
    return this.isSameDate(this.startOfWeek(first), this.startOfWeek(second));
  }

  private isSameDate(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }

  private toIsoDate(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }
}

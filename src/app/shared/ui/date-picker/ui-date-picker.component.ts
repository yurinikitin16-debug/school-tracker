import { Component, EventEmitter, HostListener, Input, Output, computed, signal } from '@angular/core';

interface CalendarDay {
  date: Date;
  day: number;
  isCurrentMonth: boolean;
  isSelected: boolean;
  isToday: boolean;
  isWeekend: boolean;
}

@Component({
  selector: 'ui-date-picker',
  templateUrl: './ui-date-picker.component.html',
  styleUrl: './ui-date-picker.component.scss',
})
export class UiDatePickerComponent {
  readonly isOpen = signal(false);
  readonly calendarMonth = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  readonly calendarMonthLabel = computed(() =>
    new Intl.DateTimeFormat('uk-UA', { month: 'long', year: 'numeric' }).format(this.calendarMonth()),
  );
  readonly calendarDays = computed(() => this.buildCalendarDays(this.calendarMonth(), this.selectedDate));

  @Input({ required: true }) label = '';
  @Input({ required: true }) selectedDate = new Date();
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
    if (day.isWeekend) {
      return;
    }

    this.selectedDateChange.emit(day.date);
    this.calendarMonth.set(new Date(day.date.getFullYear(), day.date.getMonth(), 1));
    this.isOpen.set(false);
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

      return {
        date,
        day: date.getDate(),
        isCurrentMonth: date.getMonth() === month.getMonth(),
        isSelected: this.isSameDate(date, selectedDate),
        isToday: this.isSameDate(date, today),
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
      };
    });
  }

  private isSameDate(first: Date, second: Date): boolean {
    return (
      first.getFullYear() === second.getFullYear() &&
      first.getMonth() === second.getMonth() &&
      first.getDate() === second.getDate()
    );
  }
}

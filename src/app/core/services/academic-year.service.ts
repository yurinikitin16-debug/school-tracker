import { Injectable, signal } from '@angular/core';

const CURRENT_ACADEMIC_YEAR_KEY = 'school-track.current-academic-year';
const DEFAULT_ACADEMIC_YEAR = '2025/2026';

@Injectable({ providedIn: 'root' })
export class AcademicYearService {
  readonly currentYear = signal(this.readCurrentYear());

  setCurrentYear(year: string): void {
    this.currentYear.set(year);
    localStorage.setItem(CURRENT_ACADEMIC_YEAR_KEY, year);
  }

  private readCurrentYear(): string {
    return typeof localStorage === 'undefined'
      ? DEFAULT_ACADEMIC_YEAR
      : localStorage.getItem(CURRENT_ACADEMIC_YEAR_KEY) ?? DEFAULT_ACADEMIC_YEAR;
  }
}

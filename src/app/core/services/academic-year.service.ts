import { Injectable, inject, signal } from '@angular/core';
import { catchError, of, tap } from 'rxjs';

import { ApiClientService } from './api-client.service';

const CURRENT_ACADEMIC_YEAR_KEY = 'school-track.current-academic-year';

export interface CurrentAcademicYear {
  id: number;
  name: string;
  startsOn: string;
  endsOn: string;
}

interface AppContextResponse {
  currentAcademicYear: CurrentAcademicYear | null;
}

@Injectable({ providedIn: 'root' })
export class AcademicYearService {
  private readonly api = inject(ApiClientService);

  readonly currentYear = signal(this.readCurrentYear());
  readonly currentYearId = signal<number | null>(null);
  readonly currentAcademicYear = signal<CurrentAcademicYear | null>(null);
  readonly isLoading = signal(false);

  loadAppContext(): void {
    this.isLoading.set(true);

    this.api
      .get<AppContextResponse>('/api/app-context')
      .pipe(
        tap((context) => {
          if (context.currentAcademicYear) {
            this.setCurrentAcademicYear(context.currentAcademicYear);
          }
        }),
        catchError(() => of(null)),
      )
      .subscribe(() => {
        this.isLoading.set(false);
      });
  }

  setCurrentYear(year: string): void {
    this.currentYear.set(year);
    localStorage.setItem(CURRENT_ACADEMIC_YEAR_KEY, year);
  }

  setCurrentAcademicYear(year: CurrentAcademicYear): void {
    this.currentAcademicYear.set(year);
    this.currentYearId.set(year.id);
    this.setCurrentYear(year.name);
  }

  private readCurrentYear(): string {
    return typeof localStorage === 'undefined'
      ? ''
      : localStorage.getItem(CURRENT_ACADEMIC_YEAR_KEY) ?? '';
  }
}

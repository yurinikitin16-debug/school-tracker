import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { ApiClientService } from './api-client.service';

export type AttendanceApiStatus = 'PRESENT' | 'ABSENT_NO_REASON' | 'EXCUSED' | 'SICK';

export interface AttendanceWeekDayDto {
  date: string;
  weekday: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';
  isSchoolDay: boolean;
  note: string | null;
}

export interface AttendanceWeekStudentDto {
  id: number;
  lastName: string;
  firstName: string;
  days: Record<string, {
    attendance: AttendanceApiStatus;
    meal: boolean;
  }>;
}

export interface AttendanceWeekMatrixDto {
  classId: number;
  academicYearId: number;
  weekStart: string;
  weekEnd: string;
  days: AttendanceWeekDayDto[];
  students: AttendanceWeekStudentDto[];
}

export interface AttendanceWeekChangeDto {
  studentId: number;
  date: string;
  attendance: AttendanceApiStatus;
  meal: boolean;
}

export interface UpdateAttendanceWeekRequest {
  classId: number;
  weekStart: string;
  changes: AttendanceWeekChangeDto[];
}

@Injectable({ providedIn: 'root' })
export class AttendanceApiService {
  private readonly api = inject(ApiClientService);

  getWeek(classId: number, weekStart: string): Observable<AttendanceWeekMatrixDto> {
    return this.api.get<AttendanceWeekMatrixDto>('/api/attendance/week', { classId, weekStart });
  }

  updateWeek(request: UpdateAttendanceWeekRequest): Observable<AttendanceWeekMatrixDto> {
    return this.api.patch<AttendanceWeekMatrixDto, UpdateAttendanceWeekRequest>('/api/attendance/week', request);
  }
}

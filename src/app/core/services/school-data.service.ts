import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { MOCK_ACADEMIC_CALENDAR_EXCEPTIONS, MOCK_ATTENDANCE, MOCK_ATTENDANCE_REASONS, MOCK_ATTENDANCE_REPORT_DAYS, MOCK_ATTENDANCE_REPORT_LESSONS, MOCK_CLASSES, MOCK_LESSONS, MOCK_STUDENT_MEALS, MOCK_STUDENTS } from '../data/mock-school-data';
import { AcademicCalendarException, AttendanceReason, AttendanceRecord, AttendanceReportDay, AttendanceReportLesson, Lesson, SchoolClass, Student, StudentMeal } from '../models/school.models';

@Injectable({ providedIn: 'root' })
export class SchoolDataService {
  private readonly academicCalendarExceptionsSubject = new BehaviorSubject<AcademicCalendarException[]>(
    MOCK_ACADEMIC_CALENDAR_EXCEPTIONS.map((exception) => ({ ...exception })),
  );

  getStudents(): Observable<Student[]> {
    return of(MOCK_STUDENTS);
  }

  getClasses(): Observable<SchoolClass[]> {
    return of(MOCK_CLASSES);
  }

  getAcademicCalendarExceptions(): Observable<AcademicCalendarException[]> {
    return this.academicCalendarExceptionsSubject.asObservable();
  }

  updateAcademicCalendarExceptions(exceptions: AcademicCalendarException[]): void {
    this.academicCalendarExceptionsSubject.next(exceptions.map((exception) => ({ ...exception })));
  }

  getLessons(): Observable<Lesson[]> {
    return of(MOCK_LESSONS);
  }

  getAttendance(): Observable<AttendanceRecord[]> {
    return of(MOCK_ATTENDANCE);
  }

  getStudentMeals(): Observable<StudentMeal[]> {
    return of(MOCK_STUDENT_MEALS);
  }

  getAttendanceReportDays(): Observable<AttendanceReportDay[]> {
    return of(MOCK_ATTENDANCE_REPORT_DAYS);
  }

  getAttendanceReportLessons(): Observable<AttendanceReportLesson[]> {
    return of(MOCK_ATTENDANCE_REPORT_LESSONS);
  }

  getAttendanceReasons(): Observable<AttendanceReason[]> {
    return of(MOCK_ATTENDANCE_REASONS);
  }
}

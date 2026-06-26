import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { MOCK_ACADEMIC_CALENDAR_EXCEPTIONS, MOCK_ATTENDANCE, MOCK_ATTENDANCE_REASONS, MOCK_ATTENDANCE_REPORT_DAYS, MOCK_ATTENDANCE_REPORT_LESSONS, MOCK_CLASSES, MOCK_LESSONS, MOCK_SCHEDULE_LESSONS, MOCK_STUDENTS, MOCK_SUBJECTS, MOCK_TEACHERS } from '../data/mock-school-data';
import { AcademicCalendarException, AttendanceReason, AttendanceRecord, AttendanceReportDay, AttendanceReportLesson, Lesson, ScheduleLesson, SchoolClass, Student, Subject, Teacher } from '../models/school.models';

@Injectable({ providedIn: 'root' })
export class SchoolDataService {
  getStudents(): Observable<Student[]> {
    return of(MOCK_STUDENTS);
  }

  getClasses(): Observable<SchoolClass[]> {
    return of(MOCK_CLASSES);
  }

  getTeachers(): Observable<Teacher[]> {
    return of(MOCK_TEACHERS);
  }

  getSubjects(): Observable<Subject[]> {
    return of(MOCK_SUBJECTS);
  }

  getAcademicCalendarExceptions(): Observable<AcademicCalendarException[]> {
    return of(MOCK_ACADEMIC_CALENDAR_EXCEPTIONS);
  }

  getLessons(): Observable<Lesson[]> {
    return of(MOCK_LESSONS);
  }

  getScheduleLessons(): Observable<ScheduleLesson[]> {
    return of(MOCK_SCHEDULE_LESSONS);
  }

  getAttendance(): Observable<AttendanceRecord[]> {
    return of(MOCK_ATTENDANCE);
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

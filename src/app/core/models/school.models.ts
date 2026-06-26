export type AttendanceExceptionStatus = 'A' | 'S' | 'E';
export type AttendanceViewStatus = 'present' | AttendanceExceptionStatus;

export interface Student {
  id: number;
  firstName: string;
  lastName: string;
  middleName?: string;
  className: string;
  birthDate: string;
  isActive: boolean;
}

export interface SchoolClass {
  id: number;
  name: string;
  academicYear: string;
  isActive: boolean;
}

export interface Teacher {
  id: number;
  fullName: string;
  subject: string;
}

export interface Subject {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Lesson {
  id: number;
  order: number;
  subject: string;
  className: string;
  teacherId: number;
  startsAt: string;
  endsAt: string;
}

export interface ScheduleLesson {
  id: number;
  className: string;
  weekday: number;
  lessonNumber: number;
  subject: string;
  teacherId: number;
}

export interface AttendanceRecord {
  studentId: number;
  lessonId: number;
  status: AttendanceExceptionStatus;
  reason?: string;
  comment?: string;
}

export interface AttendanceSummary {
  totalStudents: number;
  present: number;
  absent: number;
  sick: number;
  excused: number;
  lessonsToday: number;
  lessonsTotal: number;
}

export interface AttendanceReportDay {
  date: string;
  className: string;
  fullyAbsentStudents: number;
  fullyAbsentStudentIds: number[];
  partiallyAbsentStudents: number;
  partiallyAbsentStudentIds: number[];
  lessonsWithAbsences: number;
}

export interface AttendanceReportLesson {
  className: string;
  order: number;
  subject: string;
  weekMissedLessons: number;
  monthMissedLessons: number;
  weekStudentsAffected: number;
  monthStudentsAffected: number;
  weekStudentIds: number[];
  monthStudentIds: number[];
  weekAttendancePercent: number;
  monthAttendancePercent: number;
}

export interface AttendanceReason {
  id: number;
  code: string;
  name: string;
  isActive: boolean;
}

export interface AcademicCalendarException {
  id: number;
  academicYear: string;
  date: string;
  isSchoolDay: boolean;
  note?: string;
}

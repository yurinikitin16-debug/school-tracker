import { AcademicCalendarException, AttendanceReason, AttendanceRecord, AttendanceReportDay, AttendanceReportLesson, Lesson, ScheduleLesson, SchoolClass, Student, Subject, Teacher } from '../models/school.models';

export const MOCK_STUDENTS: Student[] = [
  { id: 1, firstName: 'Андрій', lastName: 'Іваненко', middleName: 'Олександрович', className: '8-А', birthDate: '2010-04-15', isActive: true },
  { id: 2, firstName: 'Софія', lastName: 'Петренко', middleName: 'Михайлівна', className: '8-А', birthDate: '2010-07-22', isActive: true },
  { id: 3, firstName: 'Максим', lastName: 'Коваленко', middleName: 'Сергійович', className: '8-А', birthDate: '2010-02-03', isActive: true },
  { id: 4, firstName: 'Дарія', lastName: 'Шевченко', middleName: 'Олегівна', className: '8-А', birthDate: '2010-09-11', isActive: true },
  { id: 5, firstName: 'Артем', lastName: 'Бондаренко', middleName: 'Віталійович', className: '8-А', birthDate: '2010-12-28', isActive: true },
  { id: 6, firstName: 'Вікторія', lastName: 'Мельник', middleName: 'Андріївна', className: '8-А', birthDate: '2010-06-05', isActive: true },
  { id: 7, firstName: 'Олексій', lastName: 'Грищенко', middleName: 'Ігорович', className: '8-А', birthDate: '2010-03-19', isActive: true },
  { id: 8, firstName: 'Марія', lastName: 'Романюк', middleName: 'Василівна', className: '8-Б', birthDate: '2010-08-17', isActive: true },
  { id: 9, firstName: 'Назар', lastName: 'Ткаченко', middleName: 'Петрович', className: '8-Б', birthDate: '2010-01-25', isActive: true },
];

export const MOCK_CLASSES: SchoolClass[] = [
  { id: 1, name: '8-А', academicYear: '2025/2026', isActive: true },
  { id: 2, name: '8-Б', academicYear: '2025/2026', isActive: true },
  { id: 3, name: '7-А', academicYear: '2025/2026', isActive: true },
  { id: 4, name: '9-А', academicYear: '2024/2025', isActive: false },
];

export const MOCK_TEACHERS: Teacher[] = [
  { id: 1, fullName: 'Петренко О.С.', subject: 'Математика' },
  { id: 2, fullName: 'Іваненко Н.М.', subject: 'Українська мова' },
  { id: 3, fullName: 'Коваленко І.В.', subject: 'Англійська мова' },
  { id: 4, fullName: 'Мельник В.П.', subject: 'Історія' },
  { id: 5, fullName: 'Бондар С.І.', subject: 'Фізика' },
  { id: 6, fullName: 'Грищенко О.В.', subject: 'Інформатика' },
];

export const MOCK_SUBJECTS: Subject[] = [
  { id: 1, name: 'Математика', isActive: true },
  { id: 2, name: 'Українська мова', isActive: true },
  { id: 3, name: 'Англійська мова', isActive: true },
  { id: 4, name: 'Історія', isActive: true },
  { id: 5, name: 'Фізика', isActive: true },
  { id: 6, name: 'Інформатика', isActive: true },
];

export const MOCK_ACADEMIC_CALENDAR_EXCEPTIONS: AcademicCalendarException[] = [
  { id: 1, academicYear: '2025/2026', date: '2026-06-29', isSchoolDay: false, note: 'Канікули' },
];

export const MOCK_LESSONS: Lesson[] = [
  { id: 101, order: 1, subject: 'Математика', className: '8-А', teacherId: 1, startsAt: '08:30', endsAt: '09:15' },
  { id: 102, order: 2, subject: 'Українська мова', className: '8-А', teacherId: 2, startsAt: '09:25', endsAt: '10:10' },
  { id: 103, order: 3, subject: 'Англійська мова', className: '8-А', teacherId: 3, startsAt: '10:30', endsAt: '11:15' },
  { id: 104, order: 4, subject: 'Історія', className: '8-А', teacherId: 4, startsAt: '11:25', endsAt: '12:10' },
  { id: 105, order: 5, subject: 'Фізика', className: '8-А', teacherId: 5, startsAt: '12:20', endsAt: '13:05' },
  { id: 106, order: 6, subject: 'Інформатика', className: '8-А', teacherId: 6, startsAt: '13:15', endsAt: '14:00' },
  { id: 201, order: 1, subject: 'Українська мова', className: '8-Б', teacherId: 2, startsAt: '08:30', endsAt: '09:15' },
  { id: 202, order: 2, subject: 'Математика', className: '8-Б', teacherId: 1, startsAt: '09:25', endsAt: '10:10' },
  { id: 203, order: 3, subject: 'Історія', className: '8-Б', teacherId: 4, startsAt: '10:30', endsAt: '11:15' },
];

export const MOCK_SCHEDULE_LESSONS: ScheduleLesson[] = [
  { id: 1, className: '8-А', weekday: 1, lessonNumber: 1, subject: 'Математика', teacherId: 1 },
  { id: 2, className: '8-А', weekday: 1, lessonNumber: 2, subject: 'Українська мова', teacherId: 2 },
  { id: 3, className: '8-А', weekday: 1, lessonNumber: 3, subject: 'Англійська мова', teacherId: 3 },
  { id: 4, className: '8-А', weekday: 1, lessonNumber: 4, subject: 'Історія', teacherId: 4 },
  { id: 5, className: '8-А', weekday: 2, lessonNumber: 1, subject: 'Фізика', teacherId: 5 },
  { id: 6, className: '8-А', weekday: 2, lessonNumber: 2, subject: 'Математика', teacherId: 1 },
  { id: 7, className: '8-А', weekday: 2, lessonNumber: 3, subject: 'Українська мова', teacherId: 2 },
  { id: 8, className: '8-А', weekday: 2, lessonNumber: 4, subject: 'Інформатика', teacherId: 6 },
  { id: 9, className: '8-А', weekday: 3, lessonNumber: 1, subject: 'Англійська мова', teacherId: 3 },
  { id: 10, className: '8-А', weekday: 3, lessonNumber: 2, subject: 'Математика', teacherId: 1 },
  { id: 11, className: '8-А', weekday: 3, lessonNumber: 3, subject: 'Історія', teacherId: 4 },
  { id: 12, className: '8-А', weekday: 4, lessonNumber: 1, subject: 'Українська мова', teacherId: 2 },
  { id: 13, className: '8-А', weekday: 4, lessonNumber: 2, subject: 'Фізика', teacherId: 5 },
  { id: 14, className: '8-А', weekday: 4, lessonNumber: 3, subject: 'Інформатика', teacherId: 6 },
  { id: 15, className: '8-А', weekday: 5, lessonNumber: 1, subject: 'Математика', teacherId: 1 },
  { id: 16, className: '8-А', weekday: 5, lessonNumber: 2, subject: 'Англійська мова', teacherId: 3 },
  { id: 17, className: '8-Б', weekday: 1, lessonNumber: 1, subject: 'Українська мова', teacherId: 2 },
  { id: 18, className: '8-Б', weekday: 1, lessonNumber: 2, subject: 'Математика', teacherId: 1 },
  { id: 19, className: '8-Б', weekday: 2, lessonNumber: 1, subject: 'Історія', teacherId: 4 },
  { id: 20, className: '8-Б', weekday: 3, lessonNumber: 1, subject: 'Англійська мова', teacherId: 3 },
];

export const MOCK_ATTENDANCE: AttendanceRecord[] = [
  { studentId: 1, lessonId: 102, status: 'A', reason: 'Особисті справи' },
  { studentId: 2, lessonId: 102, status: 'A', reason: 'Сімейні обставини', comment: 'Виїзд з родиною' },
  { studentId: 3, lessonId: 101, status: 'S', reason: 'Хвороба' },
  { studentId: 5, lessonId: 101, status: 'A', reason: 'Причина не вказана' },
  { studentId: 5, lessonId: 102, status: 'A', reason: 'Причина не вказана' },
  { studentId: 5, lessonId: 103, status: 'A', reason: 'Причина не вказана' },
  { studentId: 5, lessonId: 104, status: 'A', reason: 'Причина не вказана' },
  { studentId: 5, lessonId: 105, status: 'A', reason: 'Причина не вказана' },
  { studentId: 5, lessonId: 106, status: 'A', reason: 'Причина не вказана' },
  { studentId: 7, lessonId: 104, status: 'E', reason: 'Олімпіада' },
  { studentId: 8, lessonId: 201, status: 'S', reason: 'Хвороба' },
  { studentId: 9, lessonId: 202, status: 'E', reason: 'Медична довідка' },
];

export const MOCK_ATTENDANCE_REPORT_DAYS: AttendanceReportDay[] = [
  { date: '2026-06-15', className: '8-А', fullyAbsentStudents: 1, fullyAbsentStudentIds: [5], partiallyAbsentStudents: 2, partiallyAbsentStudentIds: [1, 2], lessonsWithAbsences: 3 },
  { date: '2026-06-16', className: '8-А', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [4], lessonsWithAbsences: 2 },
  { date: '2026-06-17', className: '8-А', fullyAbsentStudents: 1, fullyAbsentStudentIds: [3], partiallyAbsentStudents: 2, partiallyAbsentStudentIds: [1, 7], lessonsWithAbsences: 4 },
  { date: '2026-06-18', className: '8-А', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 3, partiallyAbsentStudentIds: [2, 3, 6], lessonsWithAbsences: 3 },
  { date: '2026-06-19', className: '8-А', fullyAbsentStudents: 1, fullyAbsentStudentIds: [5], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [2], lessonsWithAbsences: 4 },
  { date: '2026-06-22', className: '8-А', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 2, partiallyAbsentStudentIds: [1, 6], lessonsWithAbsences: 3 },
  { date: '2026-06-23', className: '8-А', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [7], lessonsWithAbsences: 2 },
  { date: '2026-06-24', className: '8-А', fullyAbsentStudents: 2, fullyAbsentStudentIds: [2, 5], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [1], lessonsWithAbsences: 5 },
  { date: '2026-06-25', className: '8-А', fullyAbsentStudents: 1, fullyAbsentStudentIds: [1], partiallyAbsentStudents: 2, partiallyAbsentStudentIds: [3, 7], lessonsWithAbsences: 4 },
  { date: '2026-06-26', className: '8-А', fullyAbsentStudents: 1, fullyAbsentStudentIds: [5], partiallyAbsentStudents: 3, partiallyAbsentStudentIds: [1, 2, 7], lessonsWithAbsences: 4 },
  { date: '2026-06-15', className: '8-Б', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [8], lessonsWithAbsences: 1 },
  { date: '2026-06-16', className: '8-Б', fullyAbsentStudents: 1, fullyAbsentStudentIds: [8], partiallyAbsentStudents: 0, partiallyAbsentStudentIds: [], lessonsWithAbsences: 2 },
  { date: '2026-06-17', className: '8-Б', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 2, partiallyAbsentStudentIds: [8, 9], lessonsWithAbsences: 2 },
  { date: '2026-06-18', className: '8-Б', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [9], lessonsWithAbsences: 2 },
  { date: '2026-06-19', className: '8-Б', fullyAbsentStudents: 1, fullyAbsentStudentIds: [9], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [8], lessonsWithAbsences: 3 },
  { date: '2026-06-22', className: '8-Б', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [8], lessonsWithAbsences: 1 },
  { date: '2026-06-23', className: '8-Б', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 2, partiallyAbsentStudentIds: [8, 9], lessonsWithAbsences: 2 },
  { date: '2026-06-24', className: '8-Б', fullyAbsentStudents: 1, fullyAbsentStudentIds: [8], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [9], lessonsWithAbsences: 3 },
  { date: '2026-06-25', className: '8-Б', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 1, partiallyAbsentStudentIds: [8], lessonsWithAbsences: 1 },
  { date: '2026-06-26', className: '8-Б', fullyAbsentStudents: 0, fullyAbsentStudentIds: [], partiallyAbsentStudents: 2, partiallyAbsentStudentIds: [8, 9], lessonsWithAbsences: 2 },
];

export const MOCK_ATTENDANCE_REPORT_LESSONS: AttendanceReportLesson[] = [
  { className: '8-А', order: 1, subject: 'Математика', weekMissedLessons: 5, monthMissedLessons: 11, weekStudentsAffected: 3, monthStudentsAffected: 5, weekStudentIds: [1, 3, 5], monthStudentIds: [1, 2, 3, 5, 7], weekAttendancePercent: 88, monthAttendancePercent: 90 },
  { className: '8-А', order: 2, subject: 'Українська мова', weekMissedLessons: 7, monthMissedLessons: 15, weekStudentsAffected: 4, monthStudentsAffected: 6, weekStudentIds: [1, 2, 5, 7], monthStudentIds: [1, 2, 3, 5, 6, 7], weekAttendancePercent: 83, monthAttendancePercent: 86 },
  { className: '8-А', order: 3, subject: 'Англійська мова', weekMissedLessons: 3, monthMissedLessons: 8, weekStudentsAffected: 2, monthStudentsAffected: 4, weekStudentIds: [1, 5], monthStudentIds: [1, 2, 4, 5], weekAttendancePercent: 93, monthAttendancePercent: 92 },
  { className: '8-А', order: 4, subject: 'Історія', weekMissedLessons: 4, monthMissedLessons: 10, weekStudentsAffected: 3, monthStudentsAffected: 5, weekStudentIds: [1, 2, 5], monthStudentIds: [1, 2, 3, 5, 7], weekAttendancePercent: 90, monthAttendancePercent: 89 },
  { className: '8-А', order: 5, subject: 'Фізика', weekMissedLessons: 2, monthMissedLessons: 6, weekStudentsAffected: 2, monthStudentsAffected: 3, weekStudentIds: [2, 5], monthStudentIds: [2, 3, 5], weekAttendancePercent: 94, monthAttendancePercent: 94 },
  { className: '8-А', order: 6, subject: 'Інформатика', weekMissedLessons: 1, monthMissedLessons: 4, weekStudentsAffected: 1, monthStudentsAffected: 3, weekStudentIds: [5], monthStudentIds: [1, 5, 7], weekAttendancePercent: 97, monthAttendancePercent: 96 },
  { className: '8-Б', order: 1, subject: 'Українська мова', weekMissedLessons: 2, monthMissedLessons: 5, weekStudentsAffected: 2, monthStudentsAffected: 2, weekStudentIds: [8, 9], monthStudentIds: [8, 9], weekAttendancePercent: 87, monthAttendancePercent: 89 },
  { className: '8-Б', order: 2, subject: 'Математика', weekMissedLessons: 3, monthMissedLessons: 7, weekStudentsAffected: 2, monthStudentsAffected: 2, weekStudentIds: [8, 9], monthStudentIds: [8, 9], weekAttendancePercent: 80, monthAttendancePercent: 85 },
  { className: '8-Б', order: 3, subject: 'Історія', weekMissedLessons: 1, monthMissedLessons: 4, weekStudentsAffected: 1, monthStudentsAffected: 2, weekStudentIds: [9], monthStudentIds: [8, 9], weekAttendancePercent: 93, monthAttendancePercent: 91 },
];

export const MOCK_ATTENDANCE_REASONS: AttendanceReason[] = [
  { id: 1, code: 'FAM', name: 'Сімейні обставини', isActive: true },
  { id: 2, code: 'MED', name: 'Медична довідка', isActive: true },
  { id: 3, code: 'OLY', name: 'Олімпіада', isActive: true },
  { id: 4, code: 'PER', name: 'Особисті справи', isActive: true },
  { id: 5, code: 'TRN', name: 'Транспортні обставини', isActive: false },
];

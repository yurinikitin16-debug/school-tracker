export type SchoolStage = 'primary' | 'middle' | 'high' | 'unknown';

export const SCHOOL_STAGE_LABELS: Record<SchoolStage, string> = {
  primary: 'Початкові класи',
  middle: 'Середня школа',
  high: 'Старша школа',
  unknown: 'Без категорії',
};

export const SCHOOL_STAGE_ORDER: SchoolStage[] = ['primary', 'middle', 'high', 'unknown'];

export function getSchoolStage(className: string): SchoolStage {
  const grade = Number(className.match(/\d+/)?.[0]);

  if (!grade) {
    return 'unknown';
  }

  if (grade <= 4) {
    return 'primary';
  }

  if (grade <= 9) {
    return 'middle';
  }

  return 'high';
}

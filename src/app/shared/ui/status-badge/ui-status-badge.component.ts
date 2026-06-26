import { Component, Input } from '@angular/core';
import { AttendanceViewStatus } from '../../../core/models/school.models';

@Component({
  selector: 'ui-status-badge',
  template: `
    <span class="badge" [class]="'badge badge--' + status">
      @if (dot) {
        <i aria-hidden="true"></i>
      }
      {{ label }}
    </span>
  `,
  styles: `
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      min-height: 26px;
      padding: 0 10px;
      border-radius: 999px;
      font-size: 12px;
      font-weight: 800;
      line-height: 1;
      white-space: nowrap;
    }

    .badge i {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: currentColor;
    }

    .badge--present {
      background: #dcf7e8;
      color: #128653;
    }

    .badge--A {
      background: #ffe4e8;
      color: #dc2644;
    }

    .badge--S {
      background: #fee2e2;
      color: #c71d1d;
    }

    .badge--E {
      background: #e7efff;
      color: #2f5fd0;
    }
  `,
})
export class UiStatusBadgeComponent {
  @Input() status: AttendanceViewStatus = 'present';
  @Input() dot = true;

  readonly labels: Record<AttendanceViewStatus, string> = {
    present: 'Присутній',
    A: 'Відсутній',
    S: 'Хворіє',
    E: 'Звільнений',
  };

  get label(): string {
    return this.labels[this.status];
  }
}

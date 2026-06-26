import { Component, Input } from '@angular/core';
import { UiIconComponent, UiIconName } from '../icon/ui-icon.component';

type StatTone = 'primary' | 'success' | 'warning' | 'danger' | 'neutral';

@Component({
  selector: 'ui-stat-card',
  imports: [UiIconComponent],
  template: `
    <article class="stat-card" [class.stat-card--centered]="centered">
      <span class="stat-card__icon" [class]="'stat-card__icon stat-card__icon--' + tone">
        <ui-icon [name]="icon" />
      </span>
      <span class="stat-card__label">{{ label }}</span>
      <strong>{{ value }}</strong>
      @if (hint) {
        <em [class]="'stat-card__hint stat-card__hint--' + tone">{{ hint }}</em>
      }
    </article>
  `,
  styleUrl: './ui-stat-card.component.scss',
})
export class UiStatCardComponent {
  @Input({ required: true }) label = '';
  @Input({ required: true }) value: string | number = '';
  @Input() hint = '';
  @Input() icon: UiIconName = 'dashboard';
  @Input() tone: StatTone = 'primary';
  @Input() centered = false;
}

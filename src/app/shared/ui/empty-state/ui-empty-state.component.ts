import { Component, Input } from '@angular/core';
import { UiIconComponent, UiIconName } from '../icon/ui-icon.component';

@Component({
  selector: 'ui-empty-state',
  imports: [UiIconComponent],
  template: `
    <section class="empty-state">
      <span class="empty-state__icon">
        <ui-icon [name]="icon" />
      </span>
      <h2>{{ title }}</h2>
      @if (description) {
        <p>{{ description }}</p>
      }
      <ng-content />
    </section>
  `,
  styleUrl: './ui-empty-state.component.scss',
})
export class UiEmptyStateComponent {
  @Input() title = 'Немає даних';
  @Input() description = '';
  @Input() icon: UiIconName = 'database';
}

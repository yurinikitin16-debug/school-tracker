import { Component, Input } from '@angular/core';

type CardPadding = 'none' | 'sm' | 'md';

@Component({
  selector: 'ui-card',
  template: '<section class="ui-card" [class]="paddingClass"><ng-content /></section>',
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .ui-card {
      min-width: 0;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
      box-shadow: var(--shadow-card);
    }

    .ui-card--sm {
      padding: 14px;
    }

    .ui-card--md {
      padding: 18px;
    }
  `,
})
export class UiCardComponent {
  @Input() padding: CardPadding = 'md';

  get paddingClass(): string {
    return this.padding === 'none' ? '' : `ui-card--${this.padding}`;
  }
}

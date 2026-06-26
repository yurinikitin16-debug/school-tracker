import { Component, Input } from '@angular/core';

@Component({
  selector: 'ui-page-header',
  template: `
    <header class="page-header">
      <div>
        @if (eyebrow) {
          <p>{{ eyebrow }}</p>
        }
        <h1>{{ title }}</h1>
      </div>
      @if (hasActions) {
        <div class="page-header__actions">
          <ng-content />
        </div>
      }
    </header>
  `,
  styles: `
    .page-header {
      display: grid;
      grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
      align-items: center;
      gap: 16px;
      min-width: 0;
    }

    p {
      margin: 0 0 6px;
      color: var(--color-muted);
      font-size: 13px;
      font-weight: 800;
    }

    h1 {
      margin: 0;
      color: var(--color-text);
      font-size: 30px;
      line-height: 1.1;
    }

    .page-header__actions {
      grid-column: 2;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    @media (max-width: 720px) {
      .page-header {
        display: flex;
        align-items: flex-start;
        flex-direction: column;
      }

      .page-header__actions {
        align-self: center;
      }
    }
  `,
})
export class UiPageHeaderComponent {
  @Input({ required: true }) title = '';
  @Input() eyebrow = '';
  @Input() hasActions = false;
}

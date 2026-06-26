import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { UiPageHeaderComponent } from '../../shared/ui/page-header/ui-page-header.component';

@Component({
  selector: 'app-placeholder-page',
  imports: [UiPageHeaderComponent],
  template: `
    <section class="placeholder-page">
      <ui-page-header eyebrow="Розділ" [title]="title" />

      <div class="placeholder-card">
        <span>Скоро</span>
        <h2>{{ title }}</h2>
        <p>Сторінка підключена до навігації. Наповнення буде незабаром.</p>
      </div>
    </section>
  `,
  styles: `
    .placeholder-page {
      display: grid;
      gap: 18px;
    }

    .placeholder-card {
      display: grid;
      gap: 8px;
      min-height: 360px;
      align-content: center;
      justify-items: center;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-card);
      background: var(--color-surface);
      color: var(--color-text);
      text-align: center;
      box-shadow: var(--shadow-card);
    }

    .placeholder-card span {
      color: var(--color-primary);
      font-size: 13px;
      font-weight: 800;
      text-transform: uppercase;
    }

    .placeholder-card h2 {
      margin: 0;
      font-size: 28px;
    }

    .placeholder-card p {
      max-width: 460px;
      margin: 0;
      color: var(--color-muted);
      line-height: 1.6;
    }
  `,
})
export class PlaceholderPageComponent {
  private readonly route = inject(ActivatedRoute);

  get title(): string {
    return this.route.snapshot.data['title'] ?? 'Розділ';
  }
}

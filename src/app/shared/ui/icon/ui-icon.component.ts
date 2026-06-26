import { Component, Input } from '@angular/core';

export type UiIconName =
  | 'book-open'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'dashboard'
  | 'database'
  | 'download'
  | 'graduation-cap'
  | 'home'
  | 'menu'
  | 'pencil'
  | 'search'
  | 'settings'
  | 'users'
  | 'x';

@Component({
  selector: 'ui-icon',
  template: `
    <svg
      aria-hidden="true"
      class="icon"
      fill="none"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      @switch (name) {
        @case ('book-open') {
          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z" />
          <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z" />
        }
        @case ('calendar') {
          <path d="M7 3v3M17 3v3M4 9h16" />
          <path d="M5 5h14a1 1 0 0 1 1 1v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a1 1 0 0 1 1-1Z" />
        }
        @case ('chart') {
          <path d="M4 19V5M4 19h16" />
          <path d="m7 15 3-3 3 2 5-7" />
        }
        @case ('check') {
          <path d="m5 12 4 4L19 6" />
        }
        @case ('chevron-down') {
          <path d="m6 9 6 6 6-6" />
        }
        @case ('chevron-left') {
          <path d="m15 18-6-6 6-6" />
        }
        @case ('chevron-right') {
          <path d="m9 18 6-6-6-6" />
        }
        @case ('dashboard') {
          <path d="M4 13h7V4H4v9ZM13 20h7V4h-7v16ZM4 20h7v-5H4v5Z" />
        }
        @case ('database') {
          <path d="M5 6c0-1.66 3.13-3 7-3s7 1.34 7 3-3.13 3-7 3-7-1.34-7-3Z" />
          <path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6" />
          <path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6" />
        }
        @case ('download') {
          <path d="M12 3v12" />
          <path d="m7 10 5 5 5-5" />
          <path d="M5 21h14" />
        }
        @case ('graduation-cap') {
          <path d="m3 8 9-4 9 4-9 4-9-4Z" />
          <path d="M7 10v5c0 1.66 2.24 3 5 3s5-1.34 5-3v-5" />
          <path d="M21 8v6" />
        }
        @case ('home') {
          <path d="m4 11 8-7 8 7" />
          <path d="M6 10v10h12V10" />
        }
        @case ('menu') {
          <path d="M4 7h16M4 12h16M4 17h16" />
        }
        @case ('pencil') {
          <path d="m4 20 4.2-1 10.5-10.5a2.1 2.1 0 0 0-3-3L5.2 16 4 20Z" />
          <path d="m13.8 7.4 3 3" />
        }
        @case ('search') {
          <path d="M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" />
          <path d="m16 16 4 4" />
        }
        @case ('settings') {
          <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.36a1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09A1.7 1.7 0 0 0 19.4 15Z" />
        }
        @case ('users') {
          <path d="M16 20c0-2.2-2.69-4-6-4s-6 1.8-6 4" />
          <path d="M10 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
          <path d="M20 19c0-1.75-1.28-3.25-3.11-3.88" />
          <path d="M15.5 5.35a4 4 0 0 1 0 7.3" />
        }
        @case ('x') {
          <path d="m6 6 12 12M18 6 6 18" />
        }
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-grid;
      width: 1em;
      height: 1em;
      place-items: center;
    }

    .icon {
      width: 1em;
      height: 1em;
      stroke: currentColor;
      stroke-linecap: round;
      stroke-linejoin: round;
      stroke-width: 2;
    }
  `,
})
export class UiIconComponent {
  @Input({ required: true }) name: UiIconName = 'home';
}

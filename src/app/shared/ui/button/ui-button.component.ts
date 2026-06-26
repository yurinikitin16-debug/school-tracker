import { Component, Input } from '@angular/core';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md';
type ButtonType = 'button' | 'submit' | 'reset';

@Component({
  selector: 'ui-button',
  template: `
    <button
      class="ui-button"
      [class]="'ui-button ui-button--' + variant + ' ui-button--' + size"
      [class.ui-button--wide]="wide"
      [type]="type"
      [disabled]="disabled"
      [attr.aria-label]="ariaLabel || null"
    >
      @if (icon) {
        <span class="ui-button__icon" aria-hidden="true">{{ icon }}</span>
      }
      <span class="ui-button__content"><ng-content /></span>
    </button>
  `,
  styleUrl: './ui-button.component.scss',
})
export class UiButtonComponent {
  @Input() variant: ButtonVariant = 'secondary';
  @Input() size: ButtonSize = 'md';
  @Input() type: ButtonType = 'button';
  @Input() icon = '';
  @Input() ariaLabel = '';
  @Input() disabled = false;
  @Input() wide = false;
}

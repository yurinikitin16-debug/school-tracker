import { Component } from '@angular/core';

@Component({
  selector: 'ui-toolbar',
  template: '<div class="toolbar"><ng-content /></div>',
  styles: `
    :host {
      display: block;
      min-width: 0;
    }

    .toolbar {
      display: flex;
      align-items: center;
      gap: 10px;
      min-width: 0;
      flex-wrap: wrap;
    }

    :host(.toolbar-nowrap) .toolbar {
      flex-wrap: nowrap;
    }
  `,
})
export class UiToolbarComponent {}

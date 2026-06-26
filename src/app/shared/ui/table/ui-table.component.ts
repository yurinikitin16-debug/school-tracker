import { Component, Input } from '@angular/core';

export interface UiTableColumn {
  key: string;
  label: string;
  align?: 'left' | 'center' | 'right';
}

@Component({
  selector: 'ui-table',
  template: `
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            @for (column of columns; track column.key) {
              <th [class]="'align-' + (column.align || 'left')">{{ column.label }}</th>
            }
          </tr>
        </thead>
        <tbody>
          @for (row of rows; track $index) {
            <tr>
              @for (column of columns; track column.key) {
                <td [class]="'align-' + (column.align || 'left')">{{ row[column.key] }}</td>
              }
            </tr>
          }
        </tbody>
      </table>
    </div>
  `,
  styleUrl: './ui-table.component.scss',
})
export class UiTableComponent {
  @Input() columns: UiTableColumn[] = [];
  @Input() rows: Record<string, string | number | boolean | null | undefined>[] = [];
}

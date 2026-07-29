import { Injectable, signal } from '@angular/core';

export interface ToastMessage {
  id: number;
  text: string;
  tone: 'error' | 'success';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 1;
  readonly message = signal<ToastMessage | null>(null);

  showError(text = 'Виникла проблема'): void {
    this.show(text, 'error');
  }

  showSuccess(text: string): void {
    this.show(text, 'success');
  }

  private show(text: string, tone: ToastMessage['tone']): void {
    const id = this.nextId++;
    this.message.set({ id, text, tone });

    window.setTimeout(() => {
      if (this.message()?.id === id) {
        this.message.set(null);
      }
    }, 3000);
  }
}

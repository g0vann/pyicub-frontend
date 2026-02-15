import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface PluginFeedbackMessage {
  mode: 'alert' | 'confirm' | 'prompt';
  title: string;
  text: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  placeholder?: string;
}

@Injectable({ providedIn: 'root' })
export class PluginFeedbackService {
  private readonly messageSource = new BehaviorSubject<PluginFeedbackMessage | null>(null);
  readonly message$ = this.messageSource.asObservable();
  private readonly toastSource = new BehaviorSubject<string | null>(null);
  readonly toast$ = this.toastSource.asObservable();
  private toastTimer: ReturnType<typeof setTimeout> | null = null;
  private confirmResolver: ((value: boolean) => void) | null = null;
  private promptResolver: ((value: string | null) => void) | null = null;

  show(text: string, title = 'Messaggio') {
    this.messageSource.next({ mode: 'alert', title, text });
  }

  clear() {
    if (this.confirmResolver) {
      this.confirmResolver(false);
      this.confirmResolver = null;
    }
    if (this.promptResolver) {
      this.promptResolver(null);
      this.promptResolver = null;
    }
    this.messageSource.next(null);
  }

  showToast(text: string, duration = 3000) {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastSource.next(text);
    this.toastTimer = setTimeout(() => {
      this.toastSource.next(null);
      this.toastTimer = null;
    }, duration);
  }

  clearToast() {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
    this.toastSource.next(null);
  }

  confirm(
    text: string,
    title = 'Conferma',
    confirmLabel = 'Conferma',
    cancelLabel = 'Annulla'
  ): Promise<boolean> {
    if (this.confirmResolver) {
      this.confirmResolver(false);
      this.confirmResolver = null;
    }

    this.messageSource.next({
      mode: 'confirm',
      title,
      text,
      confirmLabel,
      cancelLabel
    });

    return new Promise<boolean>((resolve) => {
      this.confirmResolver = resolve;
    });
  }

  resolveConfirm(result: boolean) {
    if (this.confirmResolver) {
      this.confirmResolver(result);
      this.confirmResolver = null;
    }
    this.messageSource.next(null);
  }

  prompt(
    text: string,
    title = 'Inserisci un valore',
    defaultValue = '',
    placeholder = '',
    confirmLabel = 'Conferma',
    cancelLabel = 'Annulla'
  ): Promise<string | null> {
    if (this.confirmResolver) {
      this.confirmResolver(false);
      this.confirmResolver = null;
    }
    if (this.promptResolver) {
      this.promptResolver(null);
      this.promptResolver = null;
    }

    this.messageSource.next({
      mode: 'prompt',
      title,
      text,
      defaultValue,
      placeholder,
      confirmLabel,
      cancelLabel
    });

    return new Promise<string | null>((resolve) => {
      this.promptResolver = resolve;
    });
  }

  resolvePrompt(value: string | null) {
    if (this.promptResolver) {
      this.promptResolver(value);
      this.promptResolver = null;
    }
    this.messageSource.next(null);
  }
}

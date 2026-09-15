import { Injectable, ApplicationRef, EnvironmentInjector, createComponent, ComponentRef } from '@angular/core';
import { DAlertComponent, DAlertConfig } from '../../components/d-alert/d-alert.component';

@Injectable({
  providedIn: 'root'
})
export class DAlertService {
  private alertRef: ComponentRef<DAlertComponent> | null = null;

  constructor(
    private appRef: ApplicationRef,
    private injector: EnvironmentInjector
  ) {}

  show(config: DAlertConfig) {
    this.close();

    this.alertRef = createComponent(DAlertComponent, {
      environmentInjector: this.injector
    });
    
    // Inject custom destroy callback to remove from DOM
    const originalOnDestroy = config._onDestroy;
    config._onDestroy = () => {
      if (originalOnDestroy) originalOnDestroy();
      this.close();
    };

    this.alertRef.instance.config = config;
    
    document.body.appendChild(this.alertRef.location.nativeElement);
    this.appRef.attachView(this.alertRef.hostView);
  }

  close() {
    if (this.alertRef) {
      this.appRef.detachView(this.alertRef.hostView);
      this.alertRef.destroy();
      this.alertRef = null;
    }
  }

  info(message: string, title?: string, onConfirm?: () => void) {
    this.show({ message, title, type: 'info', buttonType: 'okOnly', onConfirm });
  }

  success(message: string, title?: string, onConfirm?: () => void) {
    this.show({ message, title, type: 'success', buttonType: 'okOnly', onConfirm });
  }

  warn(message: string, title?: string, onConfirm?: () => void) {
    this.show({ message, title, type: 'warn', buttonType: 'okOnly', onConfirm });
  }

  error(message: string, title?: string, onConfirm?: () => void) {
    this.show({ message, title, type: 'error', buttonType: 'okOnly', onConfirm });
  }

  confirm(message: string, title?: string, onConfirm?: () => void, onCancel?: () => void) {
    this.show({ message, title, type: 'warn', buttonType: 'okCancel', onConfirm, onCancel });
  }

  prompt(message: string, title?: string, onConfirm?: (value?: string) => void, onCancel?: () => void, promptPlaceholder?: string) {
    this.show({ message, title, type: 'info', buttonType: 'okCancel', isPrompt: true, promptPlaceholder, onConfirm, onCancel });
  }
}

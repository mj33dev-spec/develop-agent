import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DLoadingService {
  private loadingContainer: HTMLDivElement | null = null;
  private fadeOutTimer: number | null = null;
  private progressInterval: number | null = null;
  private currentProgress = 0;
  private isProgressMode = false;

  private createLoadingDOM(): HTMLDivElement {
    if (this.loadingContainer) return this.loadingContainer;

    this.loadingContainer = document.createElement('div');
    this.loadingContainer.id = 'd-loading-overlay';
    document.body.appendChild(this.loadingContainer);
    
    return this.loadingContainer;
  }

  private destroyLoadingDOM() {
    if (this.loadingContainer && this.loadingContainer.parentNode) {
      this.loadingContainer.parentNode.removeChild(this.loadingContainer);
    }
    this.loadingContainer = null;
    this.isProgressMode = false;
    this.currentProgress = 0;
    
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
    if (this.fadeOutTimer) {
      window.clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }
  }

  private renderContent(message: string, isSuccess: boolean = false) {
    if (!this.loadingContainer) return;
    
    if (isSuccess) {
      this.loadingContainer.innerHTML = `
        <div class="d-loading-content success">
          <i class="bx bx-check-circle success-icon"></i>
          <div class="d-loading-text">${message || '완료되었습니다.'}</div>
        </div>
      `;
    } else if (this.isProgressMode) {
      this.loadingContainer.innerHTML = `
        <div class="d-loading-content">
          <div class="d-progress-wrapper">
            <div class="d-progress-bar" style="width: ${this.currentProgress}%"></div>
          </div>
          <div class="d-loading-text">${message || '진행 중...'} <span class="d-percent">${this.currentProgress}%</span></div>
        </div>
      `;
    } else {
      this.loadingContainer.innerHTML = `
        <div class="d-loading-content">
          <div class="d-spinner"></div>
          <div class="d-loading-text">${message || '잠시만 기다려주세요..'}</div>
        </div>
      `;
    }
  }

  show(message?: string) {
    if (this.fadeOutTimer) {
      window.clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    this.isProgressMode = false;
    const container = this.createLoadingDOM();
    container.className = 'd-loading-overlay active';
    this.renderContent(message || '잠시만 기다려주세요..');
  }

  progress(durationMs: number, message?: string) {
    if (this.fadeOutTimer) {
      window.clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    this.isProgressMode = true;
    this.currentProgress = 0;

    const container = this.createLoadingDOM();
    container.className = 'd-loading-overlay active';
    this.renderContent(message || '진행 중...');

    const startTime = Date.now();
    this.progressInterval = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const nextProgress = Math.min(100, Math.floor((elapsed / durationMs) * 100));
      
      if (nextProgress !== this.currentProgress) {
        this.currentProgress = nextProgress;
        
        const progressBar = this.loadingContainer?.querySelector('.d-progress-bar') as HTMLElement | null;
        const percentText = this.loadingContainer?.querySelector('.d-percent');
        
        if (progressBar) progressBar.style.width = `${this.currentProgress}%`;
        if (percentText) percentText.textContent = `${this.currentProgress}%`;
      }

      if (elapsed >= durationMs) {
        if (this.progressInterval) {
          window.clearInterval(this.progressInterval);
          this.progressInterval = null;
        }
      }
    }, 16);
  }

  showSuccess(message: string, durationMs: number = 1200) {
    if (this.fadeOutTimer) {
      window.clearTimeout(this.fadeOutTimer);
      this.fadeOutTimer = null;
    }
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    const container = this.createLoadingDOM();
    container.className = 'd-loading-overlay active';
    this.renderContent(message, true);

    this.fadeOutTimer = window.setTimeout(() => {
      if (this.loadingContainer) {
        this.loadingContainer.classList.add('fade-out');
        this.fadeOutTimer = window.setTimeout(() => {
          this.destroyLoadingDOM();
        }, 300);
      }
    }, durationMs);
  }

  dismiss(message?: string) {
    if (this.progressInterval) {
      window.clearInterval(this.progressInterval);
      this.progressInterval = null;
    }

    if (message) {
      this.showSuccess(message, 1000);
      return;
    }

    if (!this.loadingContainer) return;

    this.loadingContainer.classList.add('fade-out');
    this.fadeOutTimer = window.setTimeout(() => {
      this.destroyLoadingDOM();
    }, 200);
  }
}

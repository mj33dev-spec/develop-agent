import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DTooltipService } from './core/services/d-tooltip.service';
import { AuthService } from './core/services/auth.service';
import { DLoadingService } from './core/services/d-loading.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
  styles: [`
    :host {
      display: block;
      height: 100vh;
      width: 100vw;
    }
  `]
})
export class AppComponent implements OnInit {
  private tooltipService = inject(DTooltipService);
  private authService = inject(AuthService);
  private dLoading = inject(DLoadingService);

  ngOnInit() {
    this.tooltipService.init();

    // 초기 접속 시 로그인 상태 검사 동안 DLoading 표시
    if (!this.authService.isInitializedValue) {
      this.dLoading.show('로그인 상태를 확인 중입니다...');
      const sub = this.authService.isInitialized.subscribe(initialized => {
        if (initialized) {
          this.dLoading.dismiss();
          sub.unsubscribe();
        }
      });
    }
  }
}

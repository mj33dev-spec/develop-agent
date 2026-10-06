import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { CButtonComponent } from '../../components/c-button/c-button.component';
import { DAlertService } from '../../core/services/d-alert.service';

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule, CButtonComponent],
  templateUrl: './pricing.component.html',
  styleUrl: './pricing.component.scss'
})
export class PricingComponent {
  private router = inject(Router);
  private dAlert = inject(DAlertService);

  // 닫기 버튼 클릭 시 현재 탭/창 닫기
  closePage() {
    window.close();
    // 브라우저 정책으로 닫히지 않는 경우 홈으로 이동
    if (!window.closed) {
      this.router.navigate(['/']);
    }
  }

  onSubscribeSenior() {
    this.dAlert.info('시니어 개발자 플랜 결제 모듈이 곧 연동될 예정입니다.', '결제 준비 중');
  }
}

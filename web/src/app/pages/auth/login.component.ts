import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CButtonComponent } from '../../components/c-button/c-button.component';
import { CModalComponent } from '../../components/c-modal/c-modal.component';
import { DAlertService } from '../../core/services/d-alert.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, CButtonComponent, CModalComponent],
  template: `
    <div class="login-container">
      <div class="login-box">
        <h2>슈파베이스 채팅 로그인</h2>
        <p class="subtitle">서비스를 이용하려면 이메일과 비밀번호로 로그인해주세요.</p>
        
        <form #loginForm="ngForm">
          <div class="form-group">
            <label for="email">이메일</label>
            <input type="email" id="email" name="email" [(ngModel)]="email" required placeholder="you@example.com">
          </div>
          
          <div class="form-group">
            <label for="password">비밀번호</label>
            <input type="password" id="password" name="password" [(ngModel)]="password" required minlength="6" placeholder="••••••••">
          </div>
          
          <div class="button-group">
            <c-button theme="primary" [disabled]="isLoading" (onClick)="onSignIn()" customClass="w-full">
              <span *ngIf="isLoading">로딩 중...</span>
              <span *ngIf="!isLoading">로그인</span>
            </c-button>
          </div>
          
          <div class="extra-links">
            <span class="link-text" (click)="openSignUpModal()">회원가입</span>
          </div>
        </form>
      </div>
    </div>

    <!-- 회원가입 모달 -->
    <c-modal 
      [isOpen]="isSignUpModalOpen"
      title="새 계정 만들기"
      [isForm]="true"
      submitLabel="가입하기"
      cancelLabel="취소"
      [submitDisabled]="!signUpEmail || !signUpPassword || signUpPassword.length < 6 || isLoading"
      (onClose)="closeSignUpModal()"
      (onSubmit)="onSignUp()">
      
      <div class="form-group">
        <label for="signUpEmail">이메일</label>
        <input type="email" id="signUpEmail" name="signUpEmail" [(ngModel)]="signUpEmail" required placeholder="you@example.com">
      </div>
      
      <div class="form-group">
        <label for="signUpPassword">비밀번호</label>
        <input type="password" id="signUpPassword" name="signUpPassword" [(ngModel)]="signUpPassword" required minlength="6" placeholder="6자리 이상">
      </div>
    </c-modal>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background-color: #f3f4f6;
    }
    .login-box {
      background: white;
      padding: 2.5rem;
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      width: 100%;
      max-width: 400px;
    }
    h2 {
      margin-top: 0;
      margin-bottom: 0.5rem;
      color: #111827;
      text-align: center;
    }
    .subtitle {
      color: #6b7280;
      font-size: 0.875rem;
      text-align: center;
      margin-bottom: 2rem;
    }
    .form-group {
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
      font-weight: 500;
      color: #374151;
    }
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
      box-sizing: border-box;
    }
    input:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .button-group {
      display: flex;
      width: 100%;
      margin-bottom: 1rem;
    }
    c-button {
      display: block;
      width: 100%;
    }
    ::ng-deep .w-full {
      width: 100%;
    }
    .extra-links {
      display: flex;
      justify-content: center;
      margin-top: 1rem;
    }
    .link-text {
      color: #3b82f6;
      font-size: 0.875rem;
      cursor: pointer;
      text-decoration: none;
    }
    .link-text:hover {
      text-decoration: underline;
    }
  `]
})
export class LoginComponent {
  // 로그인 폼 상태
  email = '';
  password = '';

  // 회원가입 폼 상태
  signUpEmail = '';
  signUpPassword = '';

  // 공통 상태
  isLoading = false;
  isSignUpModalOpen = false;

  private authService = inject(AuthService);
  private router = inject(Router);
  private dAlert = inject(DAlertService);

  // 로그인 처리 로직
  async onSignIn() {
    if (!this.email || !this.password) {
      this.dAlert.error('이메일과 비밀번호를 모두 입력해주세요.', '입력 오류');
      return;
    }
    if (this.password.length < 6) {
      this.dAlert.error('비밀번호는 최소 6자리 이상이어야 합니다.', '입력 오류');
      return;
    }
    
    this.isLoading = true;
    try {
      await this.authService.signIn(this.email, this.password);
      this.dAlert.success('로그인이 완료되었습니다.', '로그인 성공', () => {
        this.router.navigate(['/']);
      });
    } catch (error: any) {
      let errorMsg = error.message;
      if (errorMsg === 'Invalid login credentials') {
        errorMsg = '아이디 또는 비밀번호가 올바르지 않습니다.';
      } else if (errorMsg === 'Email not confirmed') {
        errorMsg = '이메일 인증이 완료되지 않았습니다. 가짜 이메일을 사용 중이시라면 Supabase 설정에서 [Confirm email] 옵션을 꺼주세요.';
      }
      this.dAlert.error(errorMsg || '로그인 중 오류가 발생했습니다.', '로그인 실패');
    } finally {
      this.isLoading = false;
    }
  }

  // 모달 제어
  openSignUpModal() {
    this.isSignUpModalOpen = true;
    this.signUpEmail = '';
    this.signUpPassword = '';
  }

  closeSignUpModal() {
    this.isSignUpModalOpen = false;
  }

  // 회원가입 처리 로직
  async onSignUp() {
    if (!this.signUpEmail || !this.signUpPassword) return;
    this.isLoading = true;
    try {
      await this.authService.signUp(this.signUpEmail, this.signUpPassword);
      // 회원가입 성공 처리
      this.closeSignUpModal();
      this.dAlert.success('회원가입이 완료되었습니다. 자동으로 로그인됩니다.', '가입 성공', () => {
        this.router.navigate(['/']);
      });
    } catch (error: any) {
      let errorMsg = error.message;
      if (errorMsg === 'Email signups are disabled') {
        errorMsg = '이메일 회원가입이 차단되어 있습니다. Supabase 대시보드에서 이메일 가입을 활성화해주세요.';
      } else if (errorMsg.includes('already registered')) {
        errorMsg = '이미 가입된 이메일입니다.';
      } else if (errorMsg.includes('Password should be at least')) {
        errorMsg = '비밀번호는 최소 6자리 이상이어야 합니다.';
      }
      
      // DAlert 띄우기
      this.dAlert.error(errorMsg || '회원가입에 실패했습니다.', '가입 오류');
    } finally {
      this.isLoading = false;
    }
  }
}

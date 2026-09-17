import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { CButtonComponent } from '../../components/c-button/c-button.component';
import { CModalComponent } from '../../components/c-modal/c-modal.component';
import { DAlertService } from '../../core/services/d-alert.service';
import { DLoadingService } from '../../core/services/d-loading.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, CButtonComponent, CModalComponent],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
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
  private dLoading = inject(DLoadingService);

  ngOnInit() {
    // 자동 로그인 (세션이 이미 있으면 메인으로 리다이렉트)
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.router.navigate(['/']);
      }
    });
  }

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
    this.dLoading.show('로그인 중...');
    try {
      await this.authService.signIn(this.email, this.password);
      this.dLoading.dismiss('로그인이 완료되었습니다.');
      setTimeout(() => {
        this.router.navigate(['/']);
      }, 800);
    } catch (error: any) {
      this.dLoading.dismiss();
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

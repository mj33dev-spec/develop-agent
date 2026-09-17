import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { DAlertService } from '../../core/services/d-alert.service';
import { DLoadingService } from '../../core/services/d-loading.service';
import { CButtonComponent } from '../../components/c-button/c-button.component';

@Component({
  selector: 'app-account',
  standalone: true,
  imports: [CommonModule, FormsModule, CButtonComponent],
  templateUrl: './account.component.html',
  styleUrls: ['./account.component.scss']
})
export class AccountComponent implements OnInit {
  email: string = '';
  nickname: string = '';
  editNickname: string = '';

  newPassword: string = '';
  confirmPassword: string = '';

  private authService = inject(AuthService);
  private dAlert = inject(DAlertService);
  private dLoading = inject(DLoadingService);

  ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.email = user.email || '';
        this.nickname = this.authService.getUserNickname(user);
        this.editNickname = this.nickname;
      }
    });
  }

  onUpdateNickname() {
    const trimmed = this.editNickname.trim();
    if (!trimmed) {
      this.dAlert.error('닉네임을 입력해주세요.', '입력 오류');
      return;
    }
    if (trimmed === this.nickname) {
      this.dAlert.info('기존 닉네임과 동일합니다.', '안내');
      return;
    }

    // 통신 동작 전 DAlert confirm 지침 준수
    this.dAlert.confirm(`닉네임을 "${trimmed}"(으)로 변경하시겠습니까?`, '닉네임 변경', async () => {
      this.dLoading.show('닉네임 변경 중...');
      try {
        await this.authService.updateNickname(trimmed);
        this.nickname = trimmed;
        this.dLoading.dismiss('닉네임이 성공적으로 변경되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('닉네임 변경 실패: ' + (e.message || ''), '오류');
      }
    });
  }

  onUpdatePassword() {
    if (!this.newPassword) {
      this.dAlert.error('새 비밀번호를 입력해주세요.', '입력 오류');
      return;
    }
    if (this.newPassword.length < 6) {
      this.dAlert.error('비밀번호는 최소 6자리 이상이어야 합니다.', '입력 오류');
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.dAlert.error('새 비밀번호와 비밀번호 확인이 일치하지 않습니다.', '입력 오류');
      return;
    }

    // 통신 동작 전 DAlert confirm 지침 준수
    this.dAlert.confirm('비밀번호를 변경하시겠습니까?', '비밀번호 변경', async () => {
      this.dLoading.show('비밀번호 변경 중...');
      try {
        await this.authService.updatePassword(this.newPassword);
        this.newPassword = '';
        this.confirmPassword = '';
        this.dLoading.dismiss('비밀번호가 성공적으로 변경되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('비밀번호 변경 실패: ' + (e.message || ''), '오류');
      }
    });
  }
}

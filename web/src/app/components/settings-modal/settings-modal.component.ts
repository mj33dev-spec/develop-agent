import { Component, OnInit, inject, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { DAlertService } from '../../core/services/d-alert.service';
import { DLoadingService } from '../../core/services/d-loading.service';
import { CDropdownComponent, CDropdownOption } from '../c-dropdown/c-dropdown.component';
import { CButtonComponent } from '../c-button/c-button.component';
import { CToggleComponent } from '../c-toggle/c-toggle.component';
import { CModalComponent } from '../c-modal/c-modal.component';
import { CModalSidebarComponent } from '../c-modal/c-modal-sidebar/c-modal-sidebar.component';
import { CModalSidebarItemComponent } from '../c-modal/c-modal-sidebar/c-modal-sidebar-item/c-modal-sidebar-item.component';
import { CModalSidebarItemLabelComponent } from '../c-modal/c-modal-sidebar/c-modal-sidebar-item-label/c-modal-sidebar-item-label.component';

export type SettingsTab = 'account' | 'appearance' | 'behavior' | 'notifications' | 'custom' | 'data';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CDropdownComponent, 
    CButtonComponent, 
    CToggleComponent, 
    CModalComponent,
    CModalSidebarComponent,
    CModalSidebarItemComponent,
    CModalSidebarItemLabelComponent
  ],
  templateUrl: './settings-modal.component.html',
  styleUrl: './settings-modal.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class SettingsModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Input() activeTab: SettingsTab = 'account';
  @Output() isOpenChange = new EventEmitter<boolean>();

  // 유저 정보
  email: string = '';
  nickname: string = '';
  editNickname: string = '';

  // 비밀번호 변경 정보
  newPassword: string = '';
  confirmPassword: string = '';
  isManagingAccount: boolean = false;

  // AI 및 시스템 설정
  defaultModel: string = 'Gemini 3.6 Flash';
  defaultTheme: string = '플랫';
  isDarkMode: boolean = false;

  modelOptions: CDropdownOption[] = [
    { label: 'Gemini 3.6 Flash', value: 'gemini-flash', onClick: () => this.onModelSelect('Gemini 3.6 Flash') },
    { label: 'Gemini 3.1 Pro', value: 'gemini-pro', onClick: () => this.onModelSelect('Gemini 3.1 Pro') },
    { label: 'Groq Qwen 3.8', value: 'groq-qwen', onClick: () => this.onModelSelect('Groq Qwen 3.8') },
    { label: 'Groq GPT-OSS', value: 'groq-gpt', onClick: () => this.onModelSelect('Groq GPT-OSS') },
    { label: 'Groq Llama 3.3 70B', value: 'groq-llama', onClick: () => this.onModelSelect('Groq Llama 3.3 70B') },
    { label: 'Groq DeepSeek R1 70B', value: 'groq-deepseek', onClick: () => this.onModelSelect('Groq DeepSeek R1 70B') }
  ];

  private authService = inject(AuthService);
  private themeService = inject(ThemeService);
  private dAlert = inject(DAlertService);
  private dLoading = inject(DLoadingService);

  async ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.email = user.email || '';
        this.nickname = this.authService.getUserNickname(user);
        this.editNickname = this.nickname;
      }
    });

    try {
      const settings = await this.authService.getUserSettings();
      this.defaultModel = settings.defaultModel || this.defaultModel;
      this.defaultTheme = settings.defaultTheme || this.defaultTheme;
      this.isDarkMode = settings.isDarkMode ?? false;
    } catch (e) {
      console.error('설정 로드 오류:', e);
    }
  }

  setTab(tab: SettingsTab) {
    this.activeTab = tab;
    this.isManagingAccount = false;
  }

  closeModal() {
    this.isOpen = false;
    this.isOpenChange.emit(false);
    this.isManagingAccount = false;
  }

  toggleAccountManagement() {
    this.isManagingAccount = !this.isManagingAccount;
    if (this.isManagingAccount) {
      this.editNickname = this.nickname;
      this.newPassword = '';
      this.confirmPassword = '';
    }
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

    this.dAlert.confirm(`닉네임을 "${trimmed}"(으)로 변경하시겠습니까?`, '닉네임 변경', async () => {
      this.dLoading.show('닉네임 변경 중...');
      try {
        await this.authService.updateNickname(trimmed);
        this.nickname = trimmed;
        this.dLoading.dismiss('닉네임이 성공적으로 변경되었습니다.');
        this.isManagingAccount = false;
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

    this.dAlert.confirm('비밀번호를 변경하시겠습니까?', '비밀번호 변경', async () => {
      this.dLoading.show('비밀번호 변경 중...');
      try {
        await this.authService.updatePassword(this.newPassword);
        this.newPassword = '';
        this.confirmPassword = '';
        this.dLoading.dismiss('비밀번호가 성공적으로 변경되었습니다.');
        this.isManagingAccount = false;
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('비밀번호 변경 실패: ' + (e.message || ''), '오류');
      }
    });
  }

  async onModelSelect(modelName: string) {
    if (this.defaultModel === modelName) return;
    this.defaultModel = modelName;
    await this.autoSaveSettings();
  }

  async onDarkModeToggle(isDark: boolean) {
    this.isDarkMode = isDark;
    this.themeService.setDarkMode(isDark);
    await this.autoSaveSettings();
  }

  async onThemeSelect(theme: string) {
    this.defaultTheme = theme;
    this.themeService.setStyleTheme(theme);
    await this.autoSaveSettings();
  }

  private async autoSaveSettings() {
    this.dLoading.show('설정 저장 중...');
    try {
      await this.authService.updateUserSettings({
        defaultModel: this.defaultModel,
        defaultTheme: this.defaultTheme,
        isDarkMode: this.isDarkMode
      });
      this.dLoading.dismiss();
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('설정 저장 실패: ' + (e.message || ''), '오류');
    }
  }

  onResetDefaults() {
    this.dAlert.confirm('모든 설정을 기본값으로 복원하시겠습니까?', '기본값 복원', async () => {
      this.dLoading.show('기본값으로 복원 중...');
      try {
        const defaultSettings = {
          defaultModel: 'Gemini 3.6 Flash',
          defaultTheme: '플랫',
          isDarkMode: false
        };
        await this.authService.updateUserSettings(defaultSettings);
        this.defaultModel = defaultSettings.defaultModel;
        this.defaultTheme = defaultSettings.defaultTheme;
        this.isDarkMode = defaultSettings.isDarkMode;
        this.themeService.setDarkMode(false);
        this.themeService.setStyleTheme('플랫');
        this.dLoading.dismiss();
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('기본값 복원 실패: ' + (e.message || ''), '오류');
      }
    });
  }
}

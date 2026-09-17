import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DAlertService } from '../../core/services/d-alert.service';
import { DLoadingService } from '../../core/services/d-loading.service';
import { CButtonComponent } from '../../components/c-button/c-button.component';
import { CDropdownComponent, CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { CTabBarComponent } from '../../components/c-tab-bar/c-tab-bar.component';
import { CToggleComponent } from '../../components/c-toggle/c-toggle.component';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CButtonComponent, CDropdownComponent, CTabBarComponent, CToggleComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  // AI 및 시스템 설정 상태
  defaultModel: string = 'Gemini 3.6 Flash';
  defaultTheme: string = '뉴모피즘';
  isDarkMode: boolean = false;

  themeTabOptions: string[] = ['플랫', '글래스모피즘', '뉴모피즘'];

  modelOptions: CDropdownOption[] = [
    { label: 'Gemini 3.6 Flash', value: 'gemini-flash', onClick: () => this.defaultModel = 'Gemini 3.6 Flash' },
    { label: 'Gemini 3.1 Pro', value: 'gemini-pro', onClick: () => this.defaultModel = 'Gemini 3.1 Pro' },
    { label: 'Groq Qwen 3.8', value: 'groq-qwen', onClick: () => this.defaultModel = 'Groq Qwen 3.8' },
    { label: 'Groq GPT-OSS', value: 'groq-gpt', onClick: () => this.defaultModel = 'Groq GPT-OSS' },
    { label: 'Groq Llama 3.3 70B', value: 'groq-llama', onClick: () => this.defaultModel = 'Groq Llama 3.3 70B' },
    { label: 'Groq DeepSeek R1 70B', value: 'groq-deepseek', onClick: () => this.defaultModel = 'Groq DeepSeek R1 70B' }
  ];

  private router = inject(Router);
  private dAlert = inject(DAlertService);
  private dLoading = inject(DLoadingService);
  private authService = inject(AuthService);
  private themeService = inject(ThemeService);

  async ngOnInit() {
    this.dLoading.show('계정 DB에서 설정을 불러오는 중입니다...');
    try {
      const settings = await this.authService.getUserSettings();
      this.defaultModel = settings.defaultModel || this.defaultModel;
      this.defaultTheme = settings.defaultTheme || this.defaultTheme;
      this.isDarkMode = settings.isDarkMode ?? false;
      this.themeService.setDarkMode(this.isDarkMode);
      this.dLoading.dismiss();
    } catch (e: any) {
      this.dLoading.dismiss();
      console.error('계정 설정 로드 실패:', e);
    }
  }

  onDarkModeToggle(isDark: boolean) {
    this.isDarkMode = isDark;
    this.themeService.setDarkMode(isDark);
  }

  goBack() {
    this.router.navigate(['/']);
  }

  onSaveSettings() {
    this.dAlert.confirm('설정 옵션(AI 모델, 테마, 다크모드)을 계정 DB에 저장하시겠습니까?', '설정 저장', async () => {
      this.dLoading.show('계정 DB에 설정 저장 중...');
      try {
        const settings = {
          defaultModel: this.defaultModel,
          defaultTheme: this.defaultTheme,
          isDarkMode: this.isDarkMode
        };
        await this.authService.updateUserSettings(settings);
        this.themeService.setDarkMode(this.isDarkMode);
        this.dLoading.dismiss('계정 DB에 설정이 성공적으로 저장되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('계정 DB 설정 저장 실패: ' + (e.message || ''), '오류');
      }
    });
  }

  onResetDefaults() {
    this.dAlert.confirm('모든 설정을 기본값으로 복원하고 계정 DB에 저장하시겠습니까?', '기본값 복원', async () => {
      this.dLoading.show('기본값으로 복원 중...');
      try {
        const defaultSettings = {
          defaultModel: 'Gemini 3.6 Flash',
          defaultTheme: '뉴모피즘',
          isDarkMode: false
        };
        await this.authService.updateUserSettings(defaultSettings);
        this.defaultModel = defaultSettings.defaultModel;
        this.defaultTheme = defaultSettings.defaultTheme;
        this.isDarkMode = defaultSettings.isDarkMode;
        this.themeService.setDarkMode(false);
        this.dLoading.dismiss('계정 DB 설정이 기본값으로 복원되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('기본값 복원 실패: ' + (e.message || ''), '오류');
      }
    });
  }
}

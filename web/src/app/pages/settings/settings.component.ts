import { Component, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DAlertService } from '../../core/services/d-alert.service';
import { DLoadingService } from '../../core/services/d-loading.service';
import { CButtonComponent } from '../../components/c-button/c-button.component';
import { CDropdownComponent, CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { CTabBarComponent } from '../../components/c-tab-bar/c-tab-bar.component';
import { CToggleComponent } from '../../components/c-toggle/c-toggle.component';
import { GuideModalComponent } from '../../components/guide-modal/guide-modal.component';
import { ThemeSelectModalComponent } from '../../components/theme-select-modal/theme-select-modal.component';

import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CButtonComponent, CDropdownComponent, CTabBarComponent, CToggleComponent, GuideModalComponent, ThemeSelectModalComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class SettingsComponent implements OnInit {
  // AI 및 시스템 설정 상태
  defaultModel: string = 'Gemini 3.6 Flash';
  defaultTheme: string = '플랫';
  isDarkMode: boolean = false;
  isGuideModalOpen: boolean = false;
  isThemeModalOpen: boolean = false;

  // DB에 저장된 원본 설정 상태
  private savedModel: string = 'Gemini 3.6 Flash';
  private savedTheme: string = '플랫';
  private savedDarkMode: boolean = false;

  themeTabOptions: string[] = ['플랫', '글래스모피즘'];

  modelOptions: CDropdownOption[] = [
    { label: 'Gemini 3.6 Flash', value: 'gemini-flash', onClick: () => this.onModelSelect('Gemini 3.6 Flash') },
    { label: 'Gemini 3.1 Pro', value: 'gemini-pro', onClick: () => this.onModelSelect('Gemini 3.1 Pro') },
    { label: 'Groq Qwen 3.8', value: 'groq-qwen', onClick: () => this.onModelSelect('Groq Qwen 3.8') },
    { label: 'Groq GPT-OSS', value: 'groq-gpt', onClick: () => this.onModelSelect('Groq GPT-OSS') },
    { label: 'Groq Llama 3.3 70B', value: 'groq-llama', onClick: () => this.onModelSelect('Groq Llama 3.3 70B') },
    { label: 'Groq DeepSeek R1 70B', value: 'groq-deepseek', onClick: () => this.onModelSelect('Groq DeepSeek R1 70B') }
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

      this.savedModel = this.defaultModel;
      this.savedTheme = this.defaultTheme;
      this.savedDarkMode = this.isDarkMode;

      this.themeService.setDarkMode(this.isDarkMode);
      this.themeService.setStyleTheme(this.defaultTheme);
      this.dLoading.dismiss();
    } catch (e: any) {
      this.dLoading.dismiss();
      console.error('계정 설정 로드 실패:', e);
    }
  }

  canDeactivate(): boolean {
    return true;
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

  async onThemeTabChange(theme: string) {
    this.defaultTheme = theme;
    this.themeService.setStyleTheme(theme);
    await this.autoSaveSettings();
  }

  private async autoSaveSettings() {
    this.dLoading.show('계정 DB에 설정 저장 중...');
    try {
      const settings = {
        defaultModel: this.defaultModel,
        defaultTheme: this.defaultTheme,
        isDarkMode: this.isDarkMode
      };
      await this.authService.updateUserSettings(settings);
      this.savedModel = this.defaultModel;
      this.savedTheme = this.defaultTheme;
      this.savedDarkMode = this.isDarkMode;
      // 완료 시 완료 메시지 없이 로딩만 해제
      this.dLoading.dismiss();
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('계정 DB 설정 저장 실패: ' + (e.message || ''), '오류');
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  openGuideModal() {
    this.isGuideModalOpen = true;
  }

  openThemeSelectModal() {
    this.isThemeModalOpen = true;
  }

  onThemeSelectModalClosed() {
    this.isThemeModalOpen = false;
    this.defaultTheme = this.themeService.styleTheme;
    this.isDarkMode = this.themeService.isDarkMode;
  }

  onResetDefaults() {
    this.dAlert.confirm('모든 설정을 기본값으로 복원하고 계정 DB에 저장하시겠습니까?', '기본값 복원', async () => {
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
        this.savedModel = defaultSettings.defaultModel;
        this.savedTheme = defaultSettings.defaultTheme;
        this.savedDarkMode = defaultSettings.isDarkMode;
        this.themeService.setDarkMode(false);
        this.themeService.setStyleTheme('플랫');
        // 완료 시 로딩만 해제
        this.dLoading.dismiss();
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('기본값 복원 실패: ' + (e.message || ''), '오류');
      }
    });
  }
}


import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { DAlertService } from '../../core/services/d-alert.service';
import { DLoadingService } from '../../core/services/d-loading.service';
import { CButtonComponent } from '../../components/c-button/c-button.component';
import { CDropdownComponent, CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { CTabBarComponent } from '../../components/c-tab-bar/c-tab-bar.component';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, CButtonComponent, CDropdownComponent, CTabBarComponent],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  // AI 및 시스템 설정 상태
  defaultModel: string = 'Gemini 3.6 Flash';
  defaultTheme: string = '뉴모피즘';
  soundNotifications: boolean = true;
  autoSaveSession: boolean = true;

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

  ngOnInit() {
    // 로컬 스토리지에서 저장된 설정 로드
    const saved = localStorage.getItem('user_app_settings');
    if (saved) {
      try {
        const settings = JSON.parse(saved);
        this.defaultModel = settings.defaultModel || this.defaultModel;
        this.defaultTheme = settings.defaultTheme || this.defaultTheme;
        this.soundNotifications = settings.soundNotifications ?? true;
        this.autoSaveSession = settings.autoSaveSession ?? true;
      } catch (e) {
        console.error('Failed to parse settings:', e);
      }
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  toggleSoundNotifications() {
    this.soundNotifications = !this.soundNotifications;
  }

  toggleAutoSaveSession() {
    this.autoSaveSession = !this.autoSaveSession;
  }

  onSaveSettings() {
    this.dAlert.confirm('설정을 저장하시겠습니까?', '설정 저장', () => {
      this.dLoading.show('설정 저장 중...');
      try {
        const settings = {
          defaultModel: this.defaultModel,
          defaultTheme: this.defaultTheme,
          soundNotifications: this.soundNotifications,
          autoSaveSession: this.autoSaveSession
        };
        localStorage.setItem('user_app_settings', JSON.stringify(settings));
        this.dLoading.dismiss('설정이 성공적으로 저장되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('설정 저장 실패: ' + (e.message || ''), '오류');
      }
    });
  }

  onResetDefaults() {
    this.dAlert.confirm('모든 설정을 초기 상태로 복원하시겠습니까?', '기본값 복원', () => {
      this.defaultModel = 'Gemini 3.6 Flash';
      this.defaultTheme = '뉴모피즘';
      this.soundNotifications = true;
      this.autoSaveSession = true;
      localStorage.removeItem('user_app_settings');
      this.dAlert.success('설정이 기본값으로 복원되었습니다.', '복원 완료');
    });
  }
}

import { Component, Input, Output, EventEmitter, OnInit, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CModalComponent } from '../c-modal/c-modal.component';
import { CButtonComponent } from '../c-button/c-button.component';
import { CToggleComponent } from '../c-toggle/c-toggle.component';
import { ThemeService, StyleTheme } from '../../core/services/theme.service';
import { AuthService } from '../../core/services/auth.service';
import { DLoadingService } from '../../core/services/d-loading.service';

export interface ThemeOptionItem {
  id: StyleTheme;
  title: string;
  subtitle: string;
  icon: string;
  description: string;
}

@Component({
  selector: 'app-theme-select-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, CModalComponent, CButtonComponent, CToggleComponent],
  templateUrl: './theme-select-modal.component.html',
  styleUrls: ['./theme-select-modal.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class ThemeSelectModalComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() onClose = new EventEmitter<void>();

  selectedTheme: StyleTheme = '플랫';
  isDarkMode: boolean = false;

  themeOptions: ThemeOptionItem[] = [
    {
      id: '플랫',
      title: '플랫 테마 (Flat)',
      subtitle: '깔끔한 모던 테마',
      icon: 'bx bx-layer',
      description: '선명한 경계선과 깔끔하고 가독성 높은 현대적인 UI 스타일'
    },
    {
      id: '글래스모피즘',
      title: '글래스모피즘 (Glassmorphism)',
      subtitle: '유리 질감 테마',
      icon: 'bx bx-glass',
      description: '투명한 프리미엄 유리 질감과 몽환적인 배경 그라디언트 톤'
    }
  ];

  private themeService = inject(ThemeService);
  private authService = inject(AuthService);
  private dLoading = inject(DLoadingService);

  ngOnInit() {
    this.selectedTheme = this.themeService.styleTheme;
    this.isDarkMode = this.themeService.isDarkMode;
  }

  onSelectTheme(theme: StyleTheme) {
    this.selectedTheme = theme;
    this.themeService.setStyleTheme(theme);
  }

  onToggleDarkMode(isDark: boolean) {
    this.isDarkMode = isDark;
    this.themeService.setDarkMode(isDark);
  }

  async confirmTheme() {
    this.dLoading.show('선택한 테마를 저장하는 중입니다...');
    try {
      await this.authService.updateUserSettings({
        defaultTheme: this.selectedTheme,
        isDarkMode: this.isDarkMode
      });
      localStorage.setItem('has_selected_initial_theme', 'true');
      this.dLoading.dismiss();
      this.onClose.emit();
    } catch (e: any) {
      this.dLoading.dismiss();
      // 저장 실패 시에도 로컬 설정 적용 상태로 닫음
      localStorage.setItem('has_selected_initial_theme', 'true');
      this.onClose.emit();
    }
  }
}

import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

export type StyleTheme = '플랫' | '글래스모피즘';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
  private styleThemeSubject = new BehaviorSubject<StyleTheme>('플랫');
  private authService = inject(AuthService);

  constructor() {
    this.initTheme();
  }

  get isDarkMode$(): Observable<boolean> {
    return this.isDarkModeSubject.asObservable();
  }

  get isDarkMode(): boolean {
    return this.isDarkModeSubject.value;
  }

  get styleTheme$(): Observable<StyleTheme> {
    return this.styleThemeSubject.asObservable();
  }

  get styleTheme(): StyleTheme {
    return this.styleThemeSubject.value;
  }

  async initTheme() {
    try {
      const settings = await this.authService.getUserSettings();
      this.setDarkMode(settings.isDarkMode ?? false);
      this.setStyleTheme(settings.defaultTheme || '플랫');
    } catch (e) {
      const saved = localStorage.getItem('user_app_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.setDarkMode(parsed.isDarkMode ?? false);
          this.setStyleTheme(parsed.defaultTheme || '플랫');
        } catch (err) {}
      }
    }
  }

  setDarkMode(isDark: boolean) {
    this.isDarkModeSubject.next(isDark);
    if (isDark) {
      document.body.classList.add('dark-theme');
    } else {
      document.body.classList.remove('dark-theme');
    }
  }

  setStyleTheme(theme: string) {
    const validTheme: StyleTheme = theme === '글래스모피즘' ? '글래스모피즘' : '플랫';
    this.styleThemeSubject.next(validTheme);

    document.body.classList.remove('theme-flat', 'theme-glass', 'theme-neumorphic');

    if (validTheme === '글래스모피즘') {
      document.body.classList.add('theme-glass');
    } else {
      document.body.classList.add('theme-flat');
    }
  }

  toggleDarkMode() {
    this.setDarkMode(!this.isDarkMode);
  }
}

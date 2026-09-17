import { Injectable, inject } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private isDarkModeSubject = new BehaviorSubject<boolean>(false);
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

  async initTheme() {
    try {
      const settings = await this.authService.getUserSettings();
      this.setDarkMode(settings.isDarkMode ?? false);
    } catch (e) {
      const saved = localStorage.getItem('user_app_settings');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          this.setDarkMode(parsed.isDarkMode ?? false);
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

  toggleDarkMode() {
    this.setDarkMode(!this.isDarkMode);
  }
}

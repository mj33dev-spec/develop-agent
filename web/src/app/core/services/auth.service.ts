import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

function generateRandomNickname(): string {
  const adjectives = ['신난', '즐거운', '멋진', '열정적인', '도전하는', '자유로운', '창의적인', '빠른'];
  const nouns = ['개발자', '코더', '프로그래머', '엔지니어', '탐험가', '빌더', '아티스트'];
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${adj}${noun}_${randomNum}`;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  private userNicknameSubject = new BehaviorSubject<string>('');

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

    // 초기 세션 확인
    this.supabase.auth.getSession().then(async ({ data: { session } }) => {
      const user = session?.user ?? null;
      this.currentUserSubject.next(user);
      if (user) {
        await this.syncUserProfile(user);
      }
      this.isInitializedSubject.next(true);
    }).catch(() => {
      this.isInitializedSubject.next(true);
    });

    // 인증 상태 변경 감지
    this.supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      this.currentUserSubject.next(user);
      if (user) {
        await this.syncUserProfile(user);
      } else {
        this.userNicknameSubject.next('');
      }
      if (!this.isInitializedSubject.value) {
        this.isInitializedSubject.next(true);
      }
    });
  }

  private async syncUserProfile(user: User | null) {
    if (!user) {
      this.userNicknameSubject.next('');
      return;
    }

    try {
      // 1. public.users DB 테이블에서 닉네임 최우선 조회
      const { data: dbUser, error } = await this.supabase
        .from('users')
        .select('nickname')
        .eq('id', user.id)
        .maybeSingle();

      if (!error && dbUser && dbUser.nickname) {
        this.userNicknameSubject.next(dbUser.nickname);
        return;
      }

      // 2. DB에 없거나 비어있는 경우 user_metadata 또는 기본 이메일 아이디 사용
      const fallbackNickname = user.user_metadata?.['nickname'] || user.email?.split('@')[0] || '사용자';
      this.userNicknameSubject.next(fallbackNickname);

      // 3. users 테이블 동기화 (upsert)
      await this.supabase.from('users').upsert({
        id: user.id,
        email: user.email,
        nickname: fallbackNickname,
        updated_at: new Date().toISOString()
      });
    } catch (e) {
      console.error('syncUserProfile error:', e);
      const fallback = user.user_metadata?.['nickname'] || user.email?.split('@')[0] || '사용자';
      this.userNicknameSubject.next(fallback);
    }
  }

  get isInitialized(): Observable<boolean> {
    return this.isInitializedSubject.asObservable();
  }

  get isInitializedValue(): boolean {
    return this.isInitializedSubject.value;
  }

  get currentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  get userNickname$(): Observable<string> {
    return this.userNicknameSubject.asObservable();
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  getUserNickname(user?: User | null): string {
    if (this.userNicknameSubject.value) {
      return this.userNicknameSubject.value;
    }
    const u = user || this.currentUserSubject.value;
    if (!u) return '';
    return u.user_metadata?.['nickname'] || u.email?.split('@')[0] || '사용자';
  }

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    if (data.user) {
      await this.syncUserProfile(data.user);
    }
    return data;
  }

  async signUp(email: string, password: string, nickname?: string) {
    const finalNickname = nickname || generateRandomNickname();
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          nickname: finalNickname
        }
      }
    });
    if (error) throw error;

    if (data.user) {
      const { error: dbError } = await this.supabase.from('users').upsert({
        id: data.user.id,
        email: data.user.email,
        nickname: finalNickname,
        updated_at: new Date().toISOString()
      });
      if (dbError) {
        console.error('Failed to sync nickname to DB users table:', dbError);
      }
      this.userNicknameSubject.next(finalNickname);
    }
    return data;
  }

  async updateNickname(newNickname: string) {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) throw new Error('로그인이 필요합니다.');

    // 1. Supabase Auth 사용자 메타데이터 변경
    const { data, error } = await this.supabase.auth.updateUser({
      data: { nickname: newNickname }
    });
    if (error) throw error;

    if (data.user) {
      this.currentUserSubject.next(data.user);
    }

    // 2. DB public.users 테이블의 nickname 컬럼 변경
    const { error: dbError } = await this.supabase.from('users').upsert({
      id: currentUser.id,
      email: currentUser.email,
      nickname: newNickname,
      updated_at: new Date().toISOString()
    });

    if (dbError) {
      console.error('Failed to update public.users nickname column:', dbError);
    }

    // 3. 로컬 반응형 닉네임 상태 즉시 업데이트
    this.userNicknameSubject.next(newNickname);
    return data;
  }

  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  }

  async getUserSettings(): Promise<{ defaultModel: string; defaultTheme: string; isDarkMode: boolean }> {
    const user = this.currentUserSubject.value;
    if (!user) {
      const saved = localStorage.getItem('user_app_settings');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
      return { defaultModel: 'Gemini 3.6 Flash', defaultTheme: '뉴모피즘', isDarkMode: false };
    }

    try {
      const { data: dbUser } = await this.supabase
        .from('users')
        .select('default_model, default_theme, is_dark_mode, settings')
        .eq('id', user.id)
        .maybeSingle();

      if (dbUser) {
        const metaSettings = user.user_metadata?.['user_settings'];
        const settings = {
          defaultModel: dbUser.default_model || dbUser.settings?.defaultModel || metaSettings?.defaultModel || 'Gemini 3.6 Flash',
          defaultTheme: dbUser.default_theme || dbUser.settings?.defaultTheme || metaSettings?.defaultTheme || '뉴모피즘',
          isDarkMode: dbUser.is_dark_mode ?? dbUser.settings?.isDarkMode ?? metaSettings?.isDarkMode ?? false
        };
        return settings;
      }
    } catch (e) {
      console.warn('DB settings fetch warning:', e);
    }

    const metaSettings = user.user_metadata?.['user_settings'];
    if (metaSettings) {
      return {
        defaultModel: metaSettings.defaultModel || 'Gemini 3.6 Flash',
        defaultTheme: metaSettings.defaultTheme || '뉴모피즘',
        isDarkMode: metaSettings.isDarkMode ?? false
      };
    }

    const saved = localStorage.getItem('user_app_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }

    return { defaultModel: 'Gemini 3.6 Flash', defaultTheme: '뉴모피즘', isDarkMode: false };
  }

  async updateUserSettings(settings: Partial<{ defaultModel: string; defaultTheme: string; isDarkMode: boolean }>) {
    const user = this.currentUserSubject.value;
    if (!user) throw new Error('로그인이 필요합니다.');

    const current = await this.getUserSettings();
    const mergedSettings = { ...current, ...settings };

    // 1. Supabase Auth 사용자 메타데이터 업데이트
    const { data, error } = await this.supabase.auth.updateUser({
      data: {
        user_settings: mergedSettings
      }
    });
    if (error) throw error;
    if (data.user) {
      this.currentUserSubject.next(data.user);
    }

    // 2. DB public.users 테이블 연동
    try {
      await this.supabase
        .from('users')
        .update({
          default_model: mergedSettings.defaultModel,
          default_theme: mergedSettings.defaultTheme,
          is_dark_mode: mergedSettings.isDarkMode
        })
        .eq('id', user.id);
    } catch (dbErr) {
      console.warn('public.users 동기화 경고:', dbErr);
    }

    localStorage.setItem('user_app_settings', JSON.stringify(mergedSettings));
    return mergedSettings;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}

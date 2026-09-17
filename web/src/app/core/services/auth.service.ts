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

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    
    // 초기 세션 확인
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUserSubject.next(session?.user ?? null);
    });

    // 인증 상태 변경 감지
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUserSubject.next(session?.user ?? null);
    });
  }

  get currentUser(): Observable<User | null> {
    return this.currentUserSubject.asObservable();
  }

  getCurrentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  getUserNickname(user?: User | null): string {
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
      try {
        await this.supabase.from('users').upsert({
          id: data.user.id,
          email: data.user.email,
          nickname: finalNickname,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.log('User DB sync fallback:', e);
      }
    }
    return data;
  }

  async updateNickname(newNickname: string) {
    const currentUser = this.currentUserSubject.value;
    if (!currentUser) throw new Error('로그인이 필요합니다.');

    const { data, error } = await this.supabase.auth.updateUser({
      data: { nickname: newNickname }
    });
    if (error) throw error;

    if (data.user) {
      this.currentUserSubject.next(data.user);
      try {
        await this.supabase.from('users').upsert({
          id: data.user.id,
          email: data.user.email,
          nickname: newNickname,
          updated_at: new Date().toISOString()
        });
      } catch (e) {
        console.log('User DB sync fallback:', e);
      }
    }
    return data;
  }

  async updatePassword(newPassword: string) {
    const { data, error } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}

import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';

const SUPABASE_URL = 'https://bznbbefithulaeygelax.supabase.co';
const SUPABASE_KEY = 'sb_publishable_O_rZg-6Z8-36WiNaHQzQRQ_JP20poc4';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private supabase: SupabaseClient;
  private currentUserSubject = new BehaviorSubject<User | null>(null);

  constructor() {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
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

  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }
}

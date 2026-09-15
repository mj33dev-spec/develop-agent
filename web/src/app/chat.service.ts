import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bznbbefithulaeygelax.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_O_rZg-6Z8-36WiNaHQzQRQ_JP20poc4';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  sendMessage(prompt: string, provider: 'gemini' | 'groq' = 'gemini', model?: string): Observable<string> {
    const invokePromise = this.supabase.functions.invoke('chat', {
      body: { prompt, provider, model }
    }).then(({ data, error }) => {
      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }
      if (data && data.error) {
         console.error('Function returned error:', data.error);
         throw new Error(data.error);
      }
      return data;
    });

    return from(invokePromise).pipe(
      map(res => res?.response || 'No response')
    );
  }
}

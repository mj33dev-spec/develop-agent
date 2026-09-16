import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { createClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private supabase = createClient(environment.supabaseUrl, environment.supabaseKey);

  sendMessage(prompt: string, provider: 'gemini' | 'groq' | 'openrouter' = 'gemini', model?: string): Observable<string> {
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

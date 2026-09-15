import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:3000/chat';

  sendMessage(prompt: string, provider: 'gemini' | 'groq' = 'gemini', model?: string): Observable<string> {
    return this.http.post<{response: string}>(this.apiUrl, { prompt, provider, model }).pipe(
      map(res => res.response)
    );
  }
}

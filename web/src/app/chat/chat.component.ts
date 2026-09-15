import { Component, inject, Input, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../chat.service';
import { CDropdownComponent, CDropdownOption } from '../components/c-dropdown/c-dropdown.component';
import { CBadgeComponent } from '../components/c-badge/c-badge.component';

export interface Message {
  text: string;
  isUser: boolean;
  isLoading?: boolean;
  timestamp?: Date;
  processed?: boolean;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, CDropdownComponent, CBadgeComponent],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnChanges, OnDestroy {
  @Input() room: any;
  @ViewChild('chatMessages') chatMessagesRef!: ElementRef;
  
  private chatService = inject(ChatService);
  private chatSubscription?: Subscription;
  
  userInput = '';
  isLoading = false;
  
  selectedProvider = 'Gemini 3.6 Flash';
  modelOptions: CDropdownOption[] = [
    { label: 'Gemini 3.6 Flash', value: 'gemini', onClick: () => this.updateProvider('Gemini 3.6 Flash') },
    { label: 'Gemini 3.1 Pro', value: 'gemini', onClick: () => this.updateProvider('Gemini 3.1 Pro') },
    { label: 'Groq Qwen 3.8', value: 'groq', onClick: () => this.updateProvider('Groq Qwen 3.8') },
    { label: 'Groq GPT-OSS', value: 'groq', onClick: () => this.updateProvider('Groq GPT-OSS') }
  ];

  updateProvider(provider: string) {
    this.selectedProvider = provider;
    if (this.room) {
      this.room.provider = provider;
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['room']) {
      this.userInput = '';
      this.isLoading = false;
      this.scrollToBottom();
      
      if (this.room && this.room.provider) {
        this.selectedProvider = this.room.provider;
      }
      
      // If room has an un-processed initial message, we should process it
      if (this.room && this.room.messages.length === 2 && this.room.messages[1].isUser && !this.room.messages[1].processed) {
        this.room.messages[1].processed = true;
        this.processMessage(this.room.messages[1].text);
      }
    }
  }

  formatTime(date?: Date): string {
    if (!date) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours % 12 || 12;
    const displayMinutes = minutes < 10 ? '0' + minutes : minutes;
    return `${ampm} ${displayHours}:${displayMinutes}`;
  }

  handleEnter(event: Event) {
    if ((event as KeyboardEvent).isComposing) return;
    event.preventDefault();
    this.sendMessage();
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;
    
    if (scrollHeight >= 160) {
      textarea.style.height = '160px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }

  sendMessage() {
    if (!this.userInput.trim() || this.isLoading) return;
    const prompt = this.userInput.trim();
    this.userInput = '';
    
    this.room.messages.push({ text: prompt, isUser: true, timestamp: new Date(), processed: true });
    
    // Reset textarea height
    if (this.chatMessagesRef && this.chatMessagesRef.nativeElement) {
      const textarea = document.querySelector('.chat-input-area textarea') as HTMLTextAreaElement;
      if (textarea) textarea.style.height = 'auto';
    }

    this.processMessage(prompt);
  }

  processMessage(prompt: string) {
    this.isLoading = true;
    
    // 로딩 메시지 추가
    this.room.messages.push({ text: '', isUser: false, isLoading: true, timestamp: new Date() });

    let providerValue: 'gemini' | 'groq' = 'gemini';
    let modelValue: string | undefined;

    switch (this.selectedProvider) {
      case 'Gemini 3.6 Flash':
        providerValue = 'gemini';
        modelValue = 'gemini-3.6-flash';
        break;
      case 'Gemini 3.1 Pro':
        providerValue = 'gemini';
        modelValue = 'gemini-3.1-pro-preview';
        break;
      case 'Groq Qwen 3.8':
        providerValue = 'groq';
        modelValue = 'qwen/qwen3.8-27b';
        break;
      case 'Groq GPT-OSS':
        providerValue = 'groq';
        modelValue = 'openai/gpt-oss-20b';
        break;
    }

    this.chatSubscription = this.chatService.sendMessage(prompt, providerValue, modelValue).subscribe({
      next: (response) => {
        this.room.messages.pop(); // Remove loading message
        this.room.messages.push({ text: response, isUser: false, timestamp: new Date() });
        this.isLoading = false;
        this.scrollToBottom();
      },
      error: (err) => {
        this.room.messages.pop(); // Remove loading message
        this.room.messages.push({ text: 'AI 서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.', isUser: false, timestamp: new Date() });
        this.isLoading = false;
        this.scrollToBottom();
      }
    });
    
    this.scrollToBottom();
  }

  stopGenerating() {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
      this.chatSubscription = undefined;
    }
    if (this.isLoading) {
      this.isLoading = false;
      this.room.messages.pop(); // Remove the loading message
      this.room.messages.push({ text: '대답 생성이 중단되었습니다.', isUser: false, timestamp: new Date() });
      this.scrollToBottom();
    }
  }

  private scrollToBottom() {
    setTimeout(() => {
      if (this.chatMessagesRef && this.chatMessagesRef.nativeElement) {
        this.chatMessagesRef.nativeElement.scrollTop = this.chatMessagesRef.nativeElement.scrollHeight;
      }
    }, 50);
  }

  ngOnDestroy() {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
    }
  }
}

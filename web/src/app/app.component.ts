import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from './chat/chat.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CDropdownComponent, CDropdownOption } from './components/c-dropdown/c-dropdown.component';
import { CBadgeComponent } from './components/c-badge/c-badge.component';

export interface ChatRoom {
  id: string;
  title: string;
  messages: any[]; // We will type this properly later or use any
  provider?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ChatComponent, CommonModule, FormsModule, CDropdownComponent, CBadgeComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'temp-web';
  
  rooms: ChatRoom[] = [];
  activeRoomId: string | null = null;
  homeInput: string = '';
  
  selectedModel = 'Gemini 3.6 Flash';
  modelOptions: CDropdownOption[] = [
    { label: 'Gemini 3.6 Flash', value: 'gemini', onClick: () => this.selectedModel = 'Gemini 3.6 Flash' },
    { label: 'Gemini 3.1 Pro', value: 'gemini', onClick: () => this.selectedModel = 'Gemini 3.1 Pro' },
    { label: 'Groq Qwen 3.8', value: 'groq', onClick: () => this.selectedModel = 'Groq Qwen 3.8' },
    { label: 'Groq GPT-OSS', value: 'groq', onClick: () => this.selectedModel = 'Groq GPT-OSS' }
  ];

  handleEnter(event: Event) {
    if ((event as KeyboardEvent).isComposing) return;
    event.preventDefault();
    this.createNewRoom(this.homeInput);
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

  createNewRoom(initialMessage?: string) {
    const newRoom: ChatRoom = {
      id: Date.now().toString(),
      title: `새로운 채팅 ${this.rooms.length + 1}`,
      provider: this.selectedModel,
      messages: [
        { text: '안녕하세요! 저는 AI 챗봇 에이전트입니다. 무엇을 도와드릴까요?', isUser: false, timestamp: new Date() }
      ]
    };
    
    if (initialMessage && initialMessage.trim() !== '') {
      newRoom.messages.push({
        text: initialMessage,
        isUser: true,
        timestamp: new Date()
      });
      // We will let the ChatComponent handle the actual API call for this initial message
      // Or we can leave it to be handled there. Let's just push the user message for now.
    }

    this.rooms.unshift(newRoom); // Add to top
    this.activeRoomId = newRoom.id;
    
    if (initialMessage) {
      setTimeout(() => {
        this.homeInput = '';
        const textarea = document.querySelector('.main-textarea') as HTMLTextAreaElement;
        if (textarea) textarea.style.height = 'auto';
      }, 0);
    }
  }

  get activeRoom() {
    return this.rooms.find(r => r.id === this.activeRoomId);
  }

  selectRoom(roomId: string) {
    this.activeRoomId = roomId;
  }
}

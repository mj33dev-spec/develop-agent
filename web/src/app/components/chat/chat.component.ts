import { Component, inject, Input, Output, EventEmitter, OnChanges, SimpleChanges, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../core/services/chat.service';
import { RoomService } from '../../core/services/room.service';
import { DAlertService } from '../../core/services/d-alert.service';
import { DLoadingService } from '../../core/services/d-loading.service';
import { CDropdownComponent, CDropdownOption } from '../c-dropdown/c-dropdown.component';
import { CBadgeComponent } from '../c-badge/c-badge.component';

import { ChatInputService, AttachedItem } from '../../core/services/chat-input.service';

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
  @Output() onBack = new EventEmitter<void>();
  @Output() roomUpdated = new EventEmitter<any>();
  @ViewChild('chatMessages') chatMessagesRef!: ElementRef;

  goBack() {
    this.onBack.emit();
  }
  
  private chatService = inject(ChatService);
  private roomService = inject(RoomService);
  private dAlert = inject(DAlertService);
  private dLoading = inject(DLoadingService);
  private chatInputService = inject(ChatInputService);
  private chatSubscription?: Subscription;
  
  userInput = '';
  attachedItems: AttachedItem[] = [];
  isLoading = false;

  addMenuOptions: CDropdownOption[] = [];

  async loadAddMenuOptions() {
    const folderId = this.room?.folder_id !== undefined ? this.room.folder_id : null;
    const currentRoomId = this.room?.id;
    this.addMenuOptions = await this.chatInputService.loadAddMenuOptions(
      { folderId, currentRoomId },
      (textToInsert) => {
        this.userInput = (this.userInput || '') + textToInsert;
      },
      (dataUrl, fileName) => {
        this.onSelectAttachedItem({
          id: 'img_' + Date.now(),
          type: 'image',
          name: fileName,
          icon: 'bx bx-image icon-image',
          imageUrl: dataUrl,
          content: `![${fileName}](${dataUrl})\n`
        });
      },
      (item) => this.onSelectAttachedItem(item)
    );
  }

  onSelectAttachedItem(item: AttachedItem) {
    if (!this.attachedItems.some(i => i.id === item.id)) {
      this.attachedItems.push(item);
    }
  }

  removeAttachedItem(index: number) {
    this.attachedItems.splice(index, 1);
  }

  getItemIcon(item: any): string {
    const name = item.name || '';
    const ext = item.extension || (name.includes('.') ? name.split('.').pop() || '' : '');
    const icon = this.chatInputService.getFileIcon(ext);
    return (icon && icon !== 'bx bx-code-alt icon-other') ? icon : (item.icon || icon);
  }

  // 디스플레이용 메시지 텍스트 파싱 (기존 [첨부 파일: ...] 및 ![이미지](dataUrl) 긴 텍스트 숨김 처리)
  getDisplayText(text: string): string {
    if (!text) return '';
    let clean = text.replace(/\n?\[(첨부 파일|참조 채팅방): [\s\S]*$/, '');
    clean = clean.replace(/\n?!\[[^\]]*\]\((data:image\/[^;]+;base64,[^)]+|https?:\/\/[^)]+)\)/g, '');
    return clean.trim();
  }

  // 메시지 텍스트에서 파싱된 임시 뱃지 정보 (기존 레거시 데이터 및 이미지 마크다운 파싱 포함)
  getParsedAttachments(msg: any): AttachedItem[] {
    let items: AttachedItem[] = [];
    if (msg.attachments && msg.attachments.length > 0) {
      items = msg.attachments.map((att: any) => ({
        ...att,
        icon: this.getItemIcon(att)
      }));
    } else if (msg.text) {
      const imgMatch = msg.text.match(/!\[([^\]]*)\]\((data:image\/[^;]+;base64,[^)]+|https?:\/\/[^)]+)\)/);
      if (imgMatch) {
        const altName = imgMatch[1] || '이미지 첨부';
        const imgUrl = imgMatch[2];
        items = [{ id: 'legacy-img', type: 'image', name: altName, imageUrl: imgUrl, icon: 'bx bx-image icon-image' }];
      } else {
        const match = msg.text.match(/\[첨부 파일: ([^\]]+)\]/);
        if (match) {
          const fileName = match[1];
          const ext = fileName.includes('.') ? fileName.split('.').pop() || '' : '';
          const icon = this.chatInputService.getFileIcon(ext);
          items = [{ id: 'legacy-att', type: 'file', name: fileName, extension: ext, icon }];
        } else {
          const roomMatch = msg.text.match(/\[참조 채팅방: ([^\]]+)\]/);
          if (roomMatch) {
            const roomTitle = roomMatch[1];
            items = [{ id: 'legacy-room', type: 'room', name: roomTitle, icon: 'bx bx-message-square-detail text-blue' }];
          }
        }
      }
    }
    return items;
  }

  ngOnInit() {
    this.loadAddMenuOptions();
  }

  // 헤더 제목 인라인 편집 상태 변수
  isEditingTitle = false;
  editingTitleValue = '';

  startEditingTitle() {
    if (!this.room) return;
    this.isEditingTitle = true;
    this.editingTitleValue = this.room.title || '새로운 채팅';
    setTimeout(() => {
      const input = document.getElementById('chat-title-input') as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  async saveEditingTitle() {
    if (!this.isEditingTitle || !this.room) return;
    const newTitle = this.editingTitleValue.trim();
    this.isEditingTitle = false;

    if (!newTitle || newTitle === this.room.title) return;

    this.dLoading.show('채팅방 이름을 변경하는 중입니다...');
    try {
      const updated = await this.roomService.updateRoom(this.room.id, { title: newTitle });
      this.room.title = updated.title;
      this.dLoading.dismiss('채팅방 이름이 변경되었습니다.');
      this.roomUpdated.emit(updated);
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('이름 변경 실패: ' + (e.message || ''), '오류');
    }
  }

  cancelEditingTitle() {
    this.isEditingTitle = false;
  }
  
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

  async ngOnChanges(changes: SimpleChanges) {
    if (changes['room']) {
      this.userInput = '';
      this.isLoading = false;
      
      if (this.room) {
        this.loadAddMenuOptions();

        if (this.room.provider) {
          this.selectedProvider = this.room.provider;
        }

        // 항시 DB/LocalStorage의 최신 메시지 기록 조회
        const savedMessages = await this.roomService.getMessages(this.room.id);
        if (savedMessages && savedMessages.length > 0) {
          this.room.messages = savedMessages;
        } else if (!this.room.messages || this.room.messages.length === 0) {
          this.room.messages = [
            { text: '안녕하세요! 반갑습니다. 무엇을 도와드릴까요?', isUser: false, timestamp: new Date() }
          ];
          await this.roomService.saveMessages(this.room.id, this.room.messages);
        }

        this.scrollToBottom();

        // 미처리 유저 메시지가 있는 경우 즉시 AI 답변 생성 시작
        const lastMsg = this.room.messages[this.room.messages.length - 1];
        if (lastMsg && lastMsg.isUser && !lastMsg.processed) {
          lastMsg.processed = true;
          this.processMessage(lastMsg.text);
        }
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

  async sendMessage() {
    if ((!this.userInput.trim() && this.attachedItems.length === 0) || this.isLoading) return;
    
    const userText = this.userInput.trim();
    const attachments = [...this.attachedItems];

    this.userInput = '';
    this.attachedItems = [];
    
    this.room.messages.push({
      text: userText,
      isUser: true,
      timestamp: new Date(),
      processed: true,
      attachments: attachments
    });
    await this.roomService.saveMessages(this.room.id, this.room.messages);
    
    // Reset textarea height
    if (this.chatMessagesRef && this.chatMessagesRef.nativeElement) {
      const textarea = document.querySelector('.chat-input-area textarea') as HTMLTextAreaElement;
      if (textarea) textarea.style.height = 'auto';
    }

    // AI에게 전달할 전체 프롬프트 구성 (사용자 텍스트 + 첨부 데이터)
    let fullPrompt = userText;
    if (attachments.length > 0) {
      const attachmentsContent = attachments.map(item => item.content || '').join('\n');
      fullPrompt = (fullPrompt ? fullPrompt + '\n\n' : '') + attachmentsContent;
    }

    this.processMessage(fullPrompt);
  }

  getAgentName(msg: any): string {
    if (msg.model) return msg.model;
    if (this.selectedProvider) return this.selectedProvider;
    if (this.room && this.room.provider) return this.room.provider;
    return 'Gemini 3.6 Flash';
  }

  processMessage(prompt: string) {
    this.isLoading = true;
    const currentModelName = this.selectedProvider || 'Gemini 3.6 Flash';
    
    // 로딩 메시지 추가
    this.room.messages.push({ text: '', isUser: false, isLoading: true, timestamp: new Date(), model: currentModelName });

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
      next: async (response) => {
        this.room.messages.pop(); // Remove loading message
        this.room.messages.push({ text: response, isUser: false, timestamp: new Date(), model: currentModelName });
        this.isLoading = false;
        await this.roomService.saveMessages(this.room.id, this.room.messages);
        this.scrollToBottom();
      },
      error: async (err) => {
        this.room.messages.pop(); // Remove loading message
        this.room.messages.push({ text: 'AI 서버에 연결할 수 없습니다. 서버가 켜져 있는지 확인해 주세요.', isUser: false, timestamp: new Date(), model: currentModelName });
        this.isLoading = false;
        await this.roomService.saveMessages(this.room.id, this.room.messages);
        this.scrollToBottom();
      }
    });
    
    this.scrollToBottom();
  }

  async stopGenerating() {
    if (this.chatSubscription) {
      this.chatSubscription.unsubscribe();
      this.chatSubscription = undefined;
    }
    if (this.isLoading) {
      const currentModelName = this.selectedProvider || 'Gemini 3.6 Flash';
      this.isLoading = false;
      this.room.messages.pop(); // Remove the loading message
      this.room.messages.push({ text: '대답 생성이 중단되었습니다.', isUser: false, timestamp: new Date(), model: currentModelName });
      await this.roomService.saveMessages(this.room.id, this.room.messages);
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

import { Component, ViewChild, inject, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ChatComponent } from '../../components/chat/chat.component';
import { CodeViewerComponent } from '../../components/code-viewer/code-viewer.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CDropdownComponent, CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { CBadgeComponent } from '../../components/c-badge/c-badge.component';
import { HomeSidebarComponent } from './components/home-sidebar/home-sidebar.component';
import { RoomService, ChatRoomRecord } from '../../core/services/room.service';
import { FileItemService, FileItem } from '../../core/services/file-item.service';
import { ChatInputService, AttachedItem } from '../../core/services/chat-input.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    RouterOutlet, 
    CommonModule, 
    FormsModule, 
    ChatComponent, 
    CodeViewerComponent, 
    CDropdownComponent, 
    CBadgeComponent, 
    HomeSidebarComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  title = 'temp-web';
  
  activeRoomId: string | null = null;
  activeRoom: ChatRoomRecord | null = null;

  activeFileId: string | null = null;
  activeFile: FileItem | null = null;

  homeInput: string = '';
  
  selectedModel = 'Gemini 3.6 Flash';
  modelOptions: CDropdownOption[] = [
    { label: 'Gemini 3.6 Flash', value: 'gemini', onClick: () => this.selectedModel = 'Gemini 3.6 Flash' },
    { label: 'Gemini 3.1 Pro', value: 'gemini', onClick: () => this.selectedModel = 'Gemini 3.1 Pro' },
    { label: 'Groq Qwen 3.8', value: 'groq', onClick: () => this.selectedModel = 'Groq Qwen 3.8' },
    { label: 'Groq GPT-OSS', value: 'groq', onClick: () => this.selectedModel = 'Groq GPT-OSS' },
    { label: 'Groq Llama 3.3 70B', value: 'groq', onClick: () => this.selectedModel = 'Groq Llama 3.3 70B' },
    { label: 'Groq DeepSeek R1 70B', value: 'groq', onClick: () => this.selectedModel = 'Groq DeepSeek R1 70B' },
    { label: 'OpenRouter Gemma 4 31B (Free)', value: 'openrouter', onClick: () => this.selectedModel = 'OpenRouter Gemma 4 31B (Free)' },
    { label: 'OpenRouter Cohere Code (Free)', value: 'openrouter', onClick: () => this.selectedModel = 'OpenRouter Cohere Code (Free)' }
  ];

  addMenuOptions: CDropdownOption[] = [];
  attachedItems: AttachedItem[] = [];

  @ViewChild(HomeSidebarComponent) sidebarComponent!: HomeSidebarComponent;

  private roomService = inject(RoomService);
  private fileService = inject(FileItemService);
  private chatInputService = inject(ChatInputService);
  private router = inject(Router);

  get isAccountPage(): boolean {
    return this.router.url.includes('/account');
  }

  async loadAddMenuOptions() {
    this.addMenuOptions = await this.chatInputService.loadAddMenuOptions(
      { folderId: null },
      (textToInsert) => {
        this.homeInput = (this.homeInput || '') + textToInsert;
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

  ngOnInit() {
    this.loadAddMenuOptions();
  }

  async onActiveRoomIdChange(roomId: string | null) {
    this.activeRoomId = roomId;
    if (roomId) {
      this.activeFileId = null;
      this.activeFile = null;
      if (this.sidebarComponent) {
        const found = this.sidebarComponent.rooms.find(r => r.id === roomId);
        if (found) {
          this.activeRoom = found;
          return;
        }
      }
      const rooms = await this.roomService.getRooms();
      this.activeRoom = rooms.find(r => r.id === roomId) || null;
    } else {
      this.activeRoom = null;
    }
  }

  async onActiveFileIdChange(fileId: string | null) {
    this.activeFileId = fileId;
    if (fileId) {
      this.activeRoomId = null;
      this.activeRoom = null;
      if (this.sidebarComponent) {
        const found = this.sidebarComponent.files.find(f => f.id === fileId);
        if (found) {
          this.activeFile = found;
          return;
        }
      }
      const files = await this.fileService.getFiles();
      this.activeFile = files.find(f => f.id === fileId) || null;
    } else {
      this.activeFile = null;
    }
  }

  async onSidebarDataChanged() {
    if (this.activeFileId) {
      const files = await this.fileService.getFiles();
      const found = files.find(f => f.id === this.activeFileId);
      if (found) {
        this.activeFile = { ...found };
      } else {
        this.activeFileId = null;
        this.activeFile = null;
      }
    }
    if (this.activeRoomId) {
      const rooms = await this.roomService.getRooms();
      const found = rooms.find(r => r.id === this.activeRoomId);
      if (found) {
        this.activeRoom = { ...found };
      } else {
        this.activeRoomId = null;
        this.activeRoom = null;
      }
    }
  }

  onBackToHome() {
    this.activeRoomId = null;
    this.activeRoom = null;
    this.activeFileId = null;
    this.activeFile = null;
  }

  handleEnter(event: Event) {
    if ((event as KeyboardEvent).isComposing) return;
    event.preventDefault();
    this.createRoomFromHome(this.homeInput);
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

  async createRoomFromHome(initialMessage?: string) {
    if (!this.sidebarComponent) return;
    this.sidebarComponent.selectedModel = this.selectedModel;

    const userText = initialMessage || '';
    const attachments = [...this.attachedItems];

    let fullPrompt = userText;
    if (attachments.length > 0) {
      const attachmentsText = attachments.map(item => item.content || '').join('\n');
      fullPrompt = (fullPrompt ? fullPrompt + '\n\n' : '') + attachmentsText;
    }

    const room = await this.sidebarComponent.createNewRoom(fullPrompt, null, true, this.selectedModel);
    if (room && room.messages && room.messages.length > 0) {
      const firstUserMsg = room.messages.find((m: any) => m.isUser);
      if (firstUserMsg) {
        firstUserMsg.text = userText;
        firstUserMsg.attachments = attachments;
        await this.roomService.saveMessages(room.id, room.messages);
      }
      setTimeout(() => {
        this.homeInput = '';
        this.attachedItems = [];
        const textarea = document.querySelector('.main-textarea') as HTMLTextAreaElement;
        if (textarea) textarea.style.height = 'auto';
      }, 0);
    }
  }

  async onSendFileQuestion(data: { file: FileItem, question: string, model?: string }) {
    if (!this.sidebarComponent) return;

    if (data.model) {
      this.selectedModel = data.model;
      this.sidebarComponent.selectedModel = data.model;
    }

    const ext = data.file.extension ? data.file.extension.toLowerCase() : '';
    const fileContentPrompt = `\n[첨부 파일: ${data.file.name}]\n\`\`\`${ext}\n${data.file.content || ''}\n\`\`\`\n`;
    const fullPrompt = (data.question ? data.question + '\n\n' : '') + fileContentPrompt;
    
    // 1. Create a new chat room under the file's folder
    const room = await this.sidebarComponent.createNewRoom(fullPrompt, data.file.folder_id, false, data.model || this.selectedModel);
    if (room) {
      // 2. Initialize room message with clean user question + file attachment chip
      room.messages = [
        {
          text: data.question,
          isUser: true,
          timestamp: new Date(),
          processed: false,
          attachments: [
            {
              id: data.file.id,
              type: 'file',
              name: data.file.name,
              extension: ext,
              content: fileContentPrompt
            }
          ]
        }
      ];
      await this.roomService.saveMessages(room.id, room.messages);
      
      // 3. Navigate to new chat room immediately
      this.activeFileId = null;
      this.activeFile = null;
      this.activeRoomId = room.id;
      this.activeRoom = room;
    }
  }
}

import { Component, ViewChild, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from '../../components/chat/chat.component';
import { CodeViewerComponent } from '../../components/code-viewer/code-viewer.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CDropdownComponent, CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { CBadgeComponent } from '../../components/c-badge/c-badge.component';
import { HomeSidebarComponent } from './components/home-sidebar/home-sidebar.component';
import { RoomService, ChatRoomRecord } from '../../core/services/room.service';
import { FileItemService, FileItem } from '../../core/services/file-item.service';
import { ChatInputService } from '../../core/services/chat-input.service';

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
    { label: 'Groq GPT-OSS', value: 'groq', onClick: () => this.selectedModel = 'Groq GPT-OSS' }
  ];

  addMenuOptions: CDropdownOption[] = [];

  @ViewChild(HomeSidebarComponent) sidebarComponent!: HomeSidebarComponent;

  private roomService = inject(RoomService);
  private fileService = inject(FileItemService);
  private chatInputService = inject(ChatInputService);

  ngOnInit() {
    this.addMenuOptions = this.chatInputService.getAddMenuOptions(
      (dataUrl, fileName) => {
        const imageMarkdown = `![${fileName}](${dataUrl})\n`;
        this.homeInput = (this.homeInput || '') + imageMarkdown;
      },
      (codeSnippet) => {
        this.homeInput = (this.homeInput || '') + codeSnippet;
      }
    );
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
    const room = await this.sidebarComponent.createNewRoom(initialMessage, null, true);
    if (room && initialMessage) {
      setTimeout(() => {
        this.homeInput = '';
        const textarea = document.querySelector('.main-textarea') as HTMLTextAreaElement;
        if (textarea) textarea.style.height = 'auto';
      }, 0);
    }
  }
}

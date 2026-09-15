import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ChatComponent } from '../../components/chat/chat.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CDropdownComponent, CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { CBadgeComponent } from '../../components/c-badge/c-badge.component';
import { CButtonComponent } from '../../components/c-button/c-button.component';
import { CModalComponent } from '../../components/c-modal/c-modal.component';
import { FolderService, Folder } from '../../core/services/folder.service';
import { RoomService, ChatRoomRecord } from '../../core/services/room.service';
import { DAlertService } from '../../core/services/d-alert.service';

export interface SidebarNode {
  type: 'folder' | 'room';
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  isExpanded: boolean;
  data: any;
}

import { DragDropModule, CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule, ChatComponent, CDropdownComponent, CBadgeComponent, CButtonComponent, CModalComponent, DragDropModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  title = 'temp-web';
  
  // Data
  folders: Folder[] = [];
  rooms: ChatRoomRecord[] = [];
  
  // Flattened view for sidebar
  sidebarNodes: SidebarNode[] = [];
  
  activeRoomId: string | null = null;
  homeInput: string = '';
  
  selectedModel = 'Gemini 3.6 Flash';
  modelOptions: CDropdownOption[] = [
    { label: 'Gemini 3.6 Flash', value: 'gemini', onClick: () => this.selectedModel = 'Gemini 3.6 Flash' },
    { label: 'Gemini 3.1 Pro', value: 'gemini', onClick: () => this.selectedModel = 'Gemini 3.1 Pro' },
    { label: 'Groq Qwen 3.8', value: 'groq', onClick: () => this.selectedModel = 'Groq Qwen 3.8' },
    { label: 'Groq GPT-OSS', value: 'groq', onClick: () => this.selectedModel = 'Groq GPT-OSS' }
  ];

  // Modals state
  isFolderModalOpen = false;
  folderModalMode: 'create' | 'edit' = 'create';
  folderFormName = '';
  editingFolderId: string | null = null;
  selectedParentId: string | null = null;

  private folderService = inject(FolderService);
  private roomService = inject(RoomService);
  private dAlert = inject(DAlertService);

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.folders = await this.folderService.getFolders();
      this.rooms = await this.roomService.getRooms();
      this.buildSidebarNodes();
    } catch (e: any) {
      console.error(e);
      this.dAlert.error('데이터 로드 실패: ' + (e.message || '알 수 없는 오류'), '오류');
    }
  }

  buildSidebarNodes() {
    this.sidebarNodes = [];
    
    // Recursive function to build flat list
    const addNodes = (parentId: string | null, level: number) => {
      // Add folders first
      const childFolders = this.folders.filter(f => f.parent_id === parentId).sort((a, b) => a.order_index - b.order_index);
      for (const folder of childFolders) {
        // preserve expanded state if it exists
        const existingNode = this.sidebarNodes.find(n => n.type === 'folder' && n.id === folder.id);
        const isExpanded = folder.isExpanded !== undefined ? folder.isExpanded : true;
        
        this.sidebarNodes.push({
          type: 'folder',
          id: folder.id,
          name: folder.name,
          parent_id: folder.parent_id,
          level,
          isExpanded,
          data: folder
        });

        if (isExpanded) {
          addNodes(folder.id, level + 1);
        }
      }

      // Add rooms
      const childRooms = this.rooms.filter(r => r.folder_id === parentId).sort((a, b) => a.order_index - b.order_index);
      for (const room of childRooms) {
        this.sidebarNodes.push({
          type: 'room',
          id: room.id,
          name: room.title,
          parent_id: room.folder_id,
          level,
          isExpanded: false,
          data: room
        });
      }
    };

    addNodes(null, 0);
  }

  toggleFolder(node: SidebarNode, event: Event) {
    event.stopPropagation();
    if (node.type === 'folder') {
      const folder = this.folders.find(f => f.id === node.id);
      if (folder) {
        folder.isExpanded = !folder.isExpanded;
        this.buildSidebarNodes();
      }
    }
  }

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

  async createNewRoom(initialMessage?: string) {
    try {
      const title = `새로운 채팅 ${this.rooms.length + 1}`;
      // Put in root by default, or could put in selected folder
      const room = await this.roomService.createRoom(title, this.selectedModel, null, this.rooms.length);
      this.rooms.push(room);
      this.activeRoomId = room.id;
      this.buildSidebarNodes();
      
      if (initialMessage) {
        setTimeout(() => {
          this.homeInput = '';
          const textarea = document.querySelector('.main-textarea') as HTMLTextAreaElement;
          if (textarea) textarea.style.height = 'auto';
        }, 0);
      }
    } catch (e) {
      this.dAlert.error('채팅방 생성에 실패했습니다.', '오류');
    }
  }

  get activeRoom() {
    return this.rooms.find(r => r.id === this.activeRoomId) as any;
  }

  selectRoom(roomId: string) {
    this.activeRoomId = roomId;
  }

  // --- Folder CRUD ---
  openCreateFolderModal(parentId: string | null = null) {
    this.folderModalMode = 'create';
    this.folderFormName = '';
    this.selectedParentId = parentId;
    this.isFolderModalOpen = true;
  }

  openEditFolderModal(folder: Folder) {
    this.folderModalMode = 'edit';
    this.folderFormName = folder.name;
    this.editingFolderId = folder.id;
    this.isFolderModalOpen = true;
  }

  closeFolderModal() {
    this.isFolderModalOpen = false;
  }

  async submitFolderModal() {
    if (!this.folderFormName.trim()) return;
    
    try {
      if (this.folderModalMode === 'create') {
        const order = this.folders.filter(f => f.parent_id === this.selectedParentId).length;
        const newFolder = await this.folderService.createFolder(this.folderFormName, this.selectedParentId, order);
        newFolder.isExpanded = true;
        this.folders.push(newFolder);
      } else if (this.folderModalMode === 'edit' && this.editingFolderId) {
        const updated = await this.folderService.updateFolder(this.editingFolderId, { name: this.folderFormName });
        const idx = this.folders.findIndex(f => f.id === this.editingFolderId);
        if (idx !== -1) {
          this.folders[idx].name = updated.name;
        }
      }
      this.closeFolderModal();
      this.buildSidebarNodes();
    } catch (e) {
      this.dAlert.error('폴더 저장에 실패했습니다.', '오류');
    }
  }

  async deleteFolder(folder: Folder) {
    // Confirm via simple confirm for now
    if (confirm(`'${folder.name}' 폴더를 삭제하시겠습니까? (내부 채팅방도 모두 삭제됩니다)`)) {
      try {
        await this.folderService.deleteFolder(folder.id);
        this.folders = this.folders.filter(f => f.id !== folder.id);
        this.buildSidebarNodes();
      } catch (e) {
        this.dAlert.error('폴더 삭제에 실패했습니다.', '오류');
      }
    }
  }

  async drop(event: CdkDragDrop<SidebarNode[]>) {
    if (event.previousIndex === event.currentIndex) return;

    const movedNode = this.sidebarNodes[event.previousIndex];
    moveItemInArray(this.sidebarNodes, event.previousIndex, event.currentIndex);

    // Determine new parent and level
    let newParentId: string | null = null;
    let newLevel = 0;

    if (event.currentIndex > 0) {
      const nodeAbove = this.sidebarNodes[event.currentIndex - 1];
      if (nodeAbove.type === 'folder' && nodeAbove.isExpanded) {
        newParentId = nodeAbove.id;
        newLevel = nodeAbove.level + 1;
      } else {
        newParentId = nodeAbove.parent_id;
        newLevel = nodeAbove.level;
      }
    }

    movedNode.parent_id = newParentId;
    movedNode.level = newLevel;

    // We need to sync order indices back to folders and rooms
    // To do this, we get all siblings in the new parent and assign their index
    const siblings = this.sidebarNodes.filter(n => n.parent_id === newParentId);
    const folderUpdates = [];
    const roomUpdates = [];
    
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling.type === 'folder') {
        const f = this.folders.find(f => f.id === sibling.id);
        if (f) {
          f.parent_id = newParentId;
          f.order_index = i;
          folderUpdates.push({ id: f.id, parent_id: newParentId, order_index: i });
        }
      } else {
        const r = this.rooms.find(r => r.id === sibling.id);
        if (r) {
          r.folder_id = newParentId;
          r.order_index = i;
          roomUpdates.push({ id: r.id, folder_id: newParentId, order_index: i });
        }
      }
    }

    // Call service to update DB
    try {
      if (folderUpdates.length > 0) await this.folderService.updateFolderOrders(folderUpdates);
      if (roomUpdates.length > 0) await this.roomService.updateRoomOrders(roomUpdates);
      
      // Reload from DB just to be safe, or just rebuild flat list
      await this.loadData();
    } catch (e) {
      this.dAlert.error('순서 저장에 실패했습니다.', '오류');
      await this.loadData(); // revert
    }
  }
}

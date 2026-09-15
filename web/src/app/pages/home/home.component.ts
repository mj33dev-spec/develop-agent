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
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

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
  private authService = inject(AuthService);
  private router = inject(Router);

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
  async openCreateFolderModal(parentId: string | null = null) {
    // 2. 모달 띄우지 않고 '새 폴더'로 즉시 생성
    try {
      const order = this.folders.filter(f => f.parent_id === parentId).length;
      const newFolder = await this.folderService.createFolder('이름없음', parentId, order);
      newFolder.isExpanded = true;
      this.folders.push(newFolder);
      this.buildSidebarNodes();
    } catch (e) {
      this.dAlert.error('폴더 생성에 실패했습니다.', '오류');
    }
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
      if (this.folderModalMode === 'edit' && this.editingFolderId) {
        const updated = await this.folderService.updateFolder(this.editingFolderId, { name: this.folderFormName });
        const idx = this.folders.findIndex(f => f.id === this.editingFolderId);
        if (idx !== -1) {
          this.folders[idx].name = updated.name;
        }
      }
      this.closeFolderModal();
      this.buildSidebarNodes();
    } catch (e) {
      this.dAlert.error('폴더 이름 변경에 실패했습니다.', '오류');
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

  // 로그아웃
  async logout() {
    try {
      await this.authService.signOut();
      this.router.navigate(['/auth/login']);
    } catch (e) {
      this.dAlert.error('로그아웃에 실패했습니다.', '오류');
    }
  }

  draggedNode: SidebarNode | null = null;
  dragOverNodeId: string | null = null;
  dragOverMode: 'inside' | 'before' | 'after' | null = null;

  onDragStart(event: DragEvent, node: SidebarNode) {
    this.draggedNode = node;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', node.id);
    }
  }

  onDragOver(event: DragEvent, targetNode: SidebarNode) {
    event.preventDefault();
    if (!this.draggedNode || this.draggedNode.id === targetNode.id) return;
    
    // Prevent dropping a folder into its own children (circular dependency prevention logic could go here)
    if (this.draggedNode.type === 'folder' && targetNode.parent_id === this.draggedNode.id) {
        return;
    }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverNodeId = targetNode.id;

    // Calculate mouse position relative to target to determine drop mode (inside, before, after)
    const targetElement = (event.target as HTMLElement).closest('.sidebar-node');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const y = event.clientY - rect.top;
      
      // If it's a folder, hovering in the middle 60% drops INSIDE.
      // Hovering top 20% drops BEFORE. Bottom 20% drops AFTER.
      if (targetNode.type === 'folder') {
        if (y < rect.height * 0.2) {
          this.dragOverMode = 'before';
        } else if (y > rect.height * 0.8) {
          this.dragOverMode = 'after';
        } else {
          this.dragOverMode = 'inside';
        }
      } else {
        // If it's a room, you can only drop BEFORE or AFTER (Rooms can't have children)
        if (y < rect.height * 0.5) {
          this.dragOverMode = 'before';
        } else {
          this.dragOverMode = 'after';
        }
      }
    }
  }

  onDragLeave(event: DragEvent, targetNode: SidebarNode) {
    if (this.dragOverNodeId === targetNode.id) {
      this.dragOverNodeId = null;
      this.dragOverMode = null;
    }
  }

  async onDrop(event: DragEvent, targetNode: SidebarNode) {
    event.preventDefault();
    if (!this.draggedNode || this.draggedNode.id === targetNode.id || !this.dragOverMode) {
      this.dragOverNodeId = null;
      this.dragOverMode = null;
      this.draggedNode = null;
      return;
    }

    const mode = this.dragOverMode;
    this.dragOverNodeId = null;
    this.dragOverMode = null;

    let newParentId = targetNode.parent_id;
    let newOrderBaseIndex = 0;

    // Determine new parent
    if (mode === 'inside' && targetNode.type === 'folder') {
      newParentId = targetNode.id;
      // Get highest order_index in target folder
      const siblings = this.sidebarNodes.filter(n => n.parent_id === newParentId);
      newOrderBaseIndex = siblings.length;
    } else {
      // mode is before or after
      const siblings = this.sidebarNodes.filter(n => n.parent_id === newParentId);
      const targetIndex = siblings.findIndex(n => n.id === targetNode.id);
      newOrderBaseIndex = mode === 'before' ? targetIndex : targetIndex + 1;
    }

    // Update parent temporarily
    this.draggedNode.parent_id = newParentId;
    
    // Now we must recalculate ALL order_index in the new parent
    // First, remove draggedNode from its old position in flat array
    const oldIndex = this.sidebarNodes.findIndex(n => n.id === this.draggedNode!.id);
    if (oldIndex !== -1) {
      this.sidebarNodes.splice(oldIndex, 1);
    }
    
    // Re-insert into flat array (this is just for immediate UI feedback before DB sync)
    // Actually, we can just let `buildSidebarNodes` handle the flat array rebuilding,
    // we only need to update the actual `folders` and `rooms` arrays and their order_indices.

    // 1. Get all items in the new parent
    const siblingsInNewParent = [...this.folders, ...this.rooms]
      .filter(item => 
        ('parent_id' in item ? item.parent_id : item.folder_id) === newParentId && item.id !== this.draggedNode!.id
      )
      .sort((a, b) => a.order_index - b.order_index);

    // 2. Insert the dragged item at the correct position
    const draggedItem = ('parent_id' in this.draggedNode.data) 
      ? this.folders.find(f => f.id === this.draggedNode!.id) 
      : this.rooms.find(r => r.id === this.draggedNode!.id);
      
    if (draggedItem) {
      if ('parent_id' in draggedItem) {
        draggedItem.parent_id = newParentId;
      } else {
        draggedItem.folder_id = newParentId;
      }
      siblingsInNewParent.splice(newOrderBaseIndex, 0, draggedItem);
    }

    // 3. Reassign order_index for all items in that parent
    const folderUpdates: {id: string, parent_id: string | null, order_index: number}[] = [];
    const roomUpdates: {id: string, folder_id: string | null, order_index: number}[] = [];

    siblingsInNewParent.forEach((item, index) => {
      item.order_index = index;
      if ('parent_id' in item) {
        folderUpdates.push({ id: item.id, parent_id: newParentId, order_index: index });
      } else {
        roomUpdates.push({ id: item.id, folder_id: newParentId, order_index: index });
      }
    });

    this.draggedNode = null;
    this.buildSidebarNodes(); // Optimistic UI update

    // Save to DB
    try {
      if (folderUpdates.length > 0) await this.folderService.updateFolderOrders(folderUpdates);
      if (roomUpdates.length > 0) await this.roomService.updateRoomOrders(roomUpdates);
      await this.loadData();
    } catch (e) {
      this.dAlert.error('이동 및 순서 저장에 실패했습니다.', '오류');
      await this.loadData();
    }
  }
}

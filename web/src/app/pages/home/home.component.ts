import { Component, OnInit, inject, HostListener } from '@angular/core';
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
import { DLoadingService } from '../../core/services/d-loading.service';
import { AuthService } from '../../core/services/auth.service';
import { Router } from '@angular/router';

export interface SidebarNode {
  type: 'folder' | 'room';
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  isExpanded: boolean;
  hasChildren?: boolean;
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

  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuOptions: CDropdownOption[] = [];
  contextMenuNode: SidebarNode | null = null;

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }

  onSidebarContextMenu(event: MouseEvent) {
    event.preventDefault();
    // 빈 영역 우클릭 시
    this.contextMenuNode = null;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuOptions = [
      { 
        label: '새 폴더 생성', 
        icon: 'bx bx-folder-plus', 
        onClick: () => this.openCreateFolderModal(null) 
      },
      { 
        label: '새 채팅방 생성', 
        icon: 'bx bx-edit-alt', 
        onClick: () => this.createNewRoom(undefined, null) 
      }
    ];
    this.contextMenuVisible = true;
  }

  onNodeContextMenu(event: MouseEvent, node: SidebarNode) {
    event.preventDefault();
    event.stopPropagation();
    
    this.contextMenuNode = node;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    
    if (node.type === 'folder') {
      this.contextMenuOptions = [
        { 
          label: '하위 폴더 추가', 
          icon: 'bx bx-folder-plus', 
          onClick: () => this.openCreateFolderModal(node.id) 
        },
        { 
          label: '하위 채팅방 추가', 
          icon: 'bx bx-edit-alt', 
          onClick: () => this.createNewRoom(undefined, node.id) 
        },
        { 
          label: '이름 변경', 
          icon: 'bx bx-rename', 
          onClick: () => this.startEditing(new Event('click'), node) 
        },
        { 
          label: '폴더 삭제', 
          icon: 'bx bx-trash', 
          onClick: () => this.deleteFolder(node.data) 
        }
      ];
    } else {
      this.contextMenuOptions = [
        { 
          label: '이름 변경', 
          icon: 'bx bx-rename', 
          onClick: () => this.startEditing(new Event('click'), node) 
        },
        { 
          label: '채팅방 삭제', 
          icon: 'bx bx-trash', 
          onClick: () => this.deleteRoom(node.data) 
        }
      ];
    }
    
    this.contextMenuVisible = true;
  }

  onContextMenuOptionClick(opt: CDropdownOption) {
    this.contextMenuVisible = false;
    if (opt.onClick) {
      opt.onClick();
    }
  }

  folderFormName = '';
  editingFolderId: string | null = null;
  selectedParentId: string | null = null;

  private folderService = inject(FolderService);
  private roomService = inject(RoomService);
  private dAlert = inject(DAlertService);
  private dLoading = inject(DLoadingService);
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
      const childFolders = this.folders.filter(f => f.parent_id === parentId);
      const childRooms = this.rooms.filter(r => r.folder_id === parentId);
      
      const children = [
        ...childFolders.map(f => ({ ...f, _type: 'folder' })),
        ...childRooms.map(r => ({ ...r, _type: 'room' }))
      ].sort((a: any, b: any) => a.order_index - b.order_index);

      for (const item of children) {
        if (item._type === 'folder') {
          const folder = item as any;
          const isExpanded = folder.isExpanded !== undefined ? folder.isExpanded : true;
          const hasChildren = this.folders.some(f => f.parent_id === folder.id) || this.rooms.some(r => r.folder_id === folder.id);
          
          this.sidebarNodes.push({
            type: 'folder',
            id: folder.id,
            name: folder.name,
            parent_id: folder.parent_id,
            level,
            isExpanded,
            hasChildren,
            data: folder
          });

          if (isExpanded) {
            addNodes(folder.id, level + 1);
          }
        } else {
          const room = item as any;
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
      }
    };

    addNodes(null, 0);
  }

  toggleFolder(node: SidebarNode, event: Event) {
    event.stopPropagation();
    if (node.type === 'folder' && node.hasChildren) {
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

  async createNewRoom(initialMessage?: string, folderId: string | null = null) {
    this.dLoading.show('채팅방을 생성하는 중입니다...');
    try {
      const title = `새로운 채팅 ${this.rooms.length + 1}`;
      const room = await this.roomService.createRoom(title, this.selectedModel, folderId, this.rooms.length);
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
      this.dLoading.dismiss('새 채팅방이 생성되었습니다.');
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('채팅방 생성에 실패했습니다: ' + (e.message || ''), '오류');
    }
  }

  get activeRoom() {
    return this.rooms.find(r => r.id === this.activeRoomId) as any;
  }

  selectRoom(roomId: string) {
    this.activeRoomId = roomId;
  }

  // --- Inline Editing ---
  editingNodeId: string | null = null;
  editInputValue: string = '';

  startEditing(event: Event, node: SidebarNode) {
    event.stopPropagation();
    this.editingNodeId = node.id;
    this.editInputValue = node.name;
    setTimeout(() => {
      const input = document.getElementById(`edit-input-${node.id}`) as HTMLInputElement;
      if (input) {
        input.focus();
        input.select();
      }
    }, 0);
  }

  async saveEditing(node: SidebarNode) {
    if (this.editingNodeId !== node.id) return;
    
    const newName = this.editInputValue.trim();
    this.editingNodeId = null;
    
    if (!newName || newName === node.name) {
      return;
    }

    this.dLoading.show('이름을 변경하는 중입니다...');
    try {
      if (node.type === 'folder') {
        const updated = await this.folderService.updateFolder(node.id, { name: newName });
        const folder = this.folders.find(f => f.id === node.id);
        if (folder) folder.name = updated.name;
      } else {
        const updated = await this.roomService.updateRoom(node.id, { title: newName });
        const room = this.rooms.find(r => r.id === node.id);
        if (room) room.title = updated.title;
      }
      this.buildSidebarNodes();
      this.dLoading.dismiss('이름이 변경되었습니다.');
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('이름 변경에 실패했습니다: ' + (e.message || ''), '오류');
      this.buildSidebarNodes();
    }
  }

  cancelEditing() {
    this.editingNodeId = null;
  }

  // --- Folder CRUD ---
  async openCreateFolderModal(parentId: string | null = null) {
    this.dLoading.show('폴더를 생성하는 중입니다...');
    try {
      const order = this.folders.filter(f => f.parent_id === parentId).length;
      const newFolder = await this.folderService.createFolder('이름없음', parentId, order);
      newFolder.isExpanded = true;
      this.folders.push(newFolder);
      this.buildSidebarNodes();
      this.dLoading.dismiss('새 폴더가 생성되었습니다.');
      
      const newNode = this.sidebarNodes.find(n => n.id === newFolder.id);
      if (newNode) {
        this.startEditing({ stopPropagation: () => {} } as Event, newNode);
      }
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('폴더 생성에 실패했습니다: ' + (e.message || ''), '오류');
    }
  }

  async deleteFolder(folder: Folder) {
    this.dAlert.confirm(`'${folder.name}' 폴더를 삭제하시겠습니까? (하위 항목 포함)`, '폴더 삭제', async () => {
      this.dLoading.show('폴더를 삭제하는 중입니다...');
      try {
        await this.folderService.deleteFolder(folder.id);
        this.folders = this.folders.filter(f => f.id !== folder.id);
        this.buildSidebarNodes();
        this.dLoading.dismiss('폴더가 삭제되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('폴더 삭제에 실패했습니다: ' + (e.message || ''), '오류');
      }
    });
  }

  async deleteRoom(room: ChatRoomRecord) {
    this.dAlert.confirm(`'${room.title}' 채팅방을 삭제하시겠습니까?`, '채팅방 삭제', async () => {
      this.dLoading.show('채팅방을 삭제하는 중입니다...');
      try {
        await this.roomService.deleteRoom(room.id);
        this.rooms = this.rooms.filter(r => r.id !== room.id);
        if (this.activeRoomId === room.id) {
          this.activeRoomId = null;
        }
        this.buildSidebarNodes();
        this.dLoading.dismiss('채팅방이 삭제되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('채팅방 삭제에 실패했습니다: ' + (e.message || ''), '오류');
      }
    });
  }

  // 로그아웃
  logout() {
    this.dAlert.confirm('정말 로그아웃 하시겠습니까?', '로그아웃 확인', async () => {
      this.dLoading.show('로그아웃 중입니다...');
      try {
        await this.authService.signOut();
        this.dLoading.dismiss('로그아웃 되었습니다.');
        this.router.navigate(['/login']);
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('로그아웃에 실패했습니다: ' + (e.message || ''), '오류');
      }
    });
  }

  draggedNode: SidebarNode | null = null;
  dragOverNodeId: string | null = null;
  dragOverMode: 'inside' | 'before' | 'after' | null = null;
  private dragGhost: HTMLElement | null = null;

  onDragStart(event: DragEvent, node: SidebarNode) {
    this.draggedNode = node;
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', node.id);
      
      const target = (event.target as HTMLElement).querySelector('.folder-header, .room-item') as HTMLElement || event.target as HTMLElement;
      if (target) {
        const rect = target.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        const offsetY = event.clientY - rect.top;

        this.dragGhost = target.cloneNode(true) as HTMLElement;
        this.dragGhost.classList.add('drag-ghost-clone');
        this.dragGhost.style.width = `${target.offsetWidth}px`;
        
        const actions = this.dragGhost.querySelector('.folder-actions') as HTMLElement;
        if (actions) actions.style.display = 'none';

        // 컴포넌트 CSS(캡슐화)를 유지하기 위해 DOM 트리 내부(부모)에 삽입
        if (target.parentNode) {
          target.parentNode.appendChild(this.dragGhost);
        } else {
          document.body.appendChild(this.dragGhost);
        }
        
        event.dataTransfer.setDragImage(this.dragGhost, offsetX, offsetY);
      }
    }
  }

  onDragEnd(event: DragEvent) {
    if (this.dragGhost && this.dragGhost.parentNode) {
      this.dragGhost.parentNode.removeChild(this.dragGhost);
      this.dragGhost = null;
    }
    this.draggedNode = null;
    this.dragOverNodeId = null;
    this.dragOverMode = null;
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
      this.dLoading.show('위치를 변경하는 중입니다...');
      if (folderUpdates.length > 0) await this.folderService.updateFolderOrders(folderUpdates);
      if (roomUpdates.length > 0) await this.roomService.updateRoomOrders(roomUpdates);
      await this.loadData();
      this.dLoading.dismiss('위치가 변경되었습니다.');
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('이동 및 순서 저장에 실패했습니다: ' + (e.message || ''), '오류');
      await this.loadData();
    }
  }
}

import { Component, OnInit, inject, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CDropdownOption } from '../../../../components/c-dropdown/c-dropdown.component';
import { FolderService, Folder } from '../../../../core/services/folder.service';
import { RoomService, ChatRoomRecord } from '../../../../core/services/room.service';
import { FileItemService, FileItem } from '../../../../core/services/file-item.service';
import { DAlertService } from '../../../../core/services/d-alert.service';
import { DLoadingService } from '../../../../core/services/d-loading.service';
import { AuthService } from '../../../../core/services/auth.service';

export interface SidebarNode {
  type: 'folder' | 'room' | 'file';
  id: string;
  name: string;
  parent_id: string | null;
  level: number;
  isExpanded: boolean;
  hasChildren?: boolean;
  icon?: string;
  data: any;
}

@Component({
  selector: 'app-home-sidebar',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './home-sidebar.component.html',
  styleUrl: './home-sidebar.component.scss'
})
export class HomeSidebarComponent implements OnInit {
  @Input() activeRoomId: string | null = null;
  @Input() activeFileId: string | null = null;
  @Input() selectedModel: string = 'Gemini 3.6 Flash';
  
  @Output() activeRoomIdChange = new EventEmitter<string | null>();
  @Output() activeFileIdChange = new EventEmitter<string | null>();

  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  folders: Folder[] = [];
  rooms: ChatRoomRecord[] = [];
  files: FileItem[] = [];
  sidebarNodes: SidebarNode[] = [];

  contextMenuVisible = false;
  contextMenuPosition = { x: 0, y: 0 };
  contextMenuOptions: CDropdownOption[] = [];
  contextMenuNode: SidebarNode | null = null;

  editingNodeId: string | null = null;
  editInputValue: string = '';

  draggedNode: SidebarNode | null = null;
  dragOverNodeId: string | null = null;
  dragOverMode: 'inside' | 'before' | 'after' | null = null;
  private dragGhost: HTMLElement | null = null;
  private targetAttachFolderId: string | null = null;

  private folderService = inject(FolderService);
  private roomService = inject(RoomService);
  private fileService = inject(FileItemService);
  private dAlert = inject(DAlertService);
  private dLoading = inject(DLoadingService);
  private authService = inject(AuthService);
  private router = inject(Router);

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.folders = await this.folderService.getFolders();
      this.rooms = await this.roomService.getRooms();
      this.files = await this.fileService.getFiles();
      this.buildSidebarNodes();
    } catch (e: any) {
      console.error(e);
      this.dAlert.error('데이터 로드 실패: ' + (e.message || '알 수 없는 오류'), '오류');
    }
  }

  buildSidebarNodes() {
    this.sidebarNodes = [];
    
    const addNodes = (parentId: string | null, level: number) => {
      const childFolders = this.folders.filter(f => f.parent_id === parentId);
      const childRooms = this.rooms.filter(r => r.folder_id === parentId);
      const childFiles = this.files.filter(f => f.folder_id === parentId);
      
      const children = [
        ...childFolders.map(f => ({ ...f, _type: 'folder' })),
        ...childRooms.map(r => ({ ...r, _type: 'room' })),
        ...childFiles.map(f => ({ ...f, _type: 'file' }))
      ].sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0));

      for (const item of children) {
        if (item._type === 'folder') {
          const folder = item as any;
          const isExpanded = folder.isExpanded !== undefined ? folder.isExpanded : true;
          const hasChildren = this.folders.some(f => f.parent_id === folder.id) 
                           || this.rooms.some(r => r.folder_id === folder.id)
                           || this.files.some(f => f.folder_id === folder.id);
          
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
        } else if (item._type === 'room') {
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
        } else {
          const file = item as any;
          this.sidebarNodes.push({
            type: 'file',
            id: file.id,
            name: file.name,
            parent_id: file.folder_id,
            level,
            isExpanded: false,
            icon: this.getFileIcon(file.extension),
            data: file
          });
        }
      }
    };

    addNodes(null, 0);
  }

  private getFileIcon(ext: string): string {
    const e = (ext || '').toLowerCase();
    switch (e) {
      case 'html': case 'htm': return 'bx bxl-html5 text-orange';
      case 'css': case 'scss': case 'less': return 'bx bxl-css3 text-blue';
      case 'js': case 'jsx': return 'bx bxl-javascript text-yellow';
      case 'ts': case 'tsx': return 'bx bxl-typescript text-blue';
      case 'py': return 'bx bxl-python text-yellow';
      case 'java': return 'bx bxl-java text-red';
      case 'json': return 'bx bx-code-curly text-green';
      case 'md': return 'bx bxl-markdown text-purple';
      case 'png': case 'jpg': case 'jpeg': case 'svg': case 'gif': return 'bx bx-image text-green';
      default: return 'bx bx-file text-sub';
    }
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

  selectRoom(roomId: string) {
    this.activeRoomId = roomId;
    this.activeRoomIdChange.emit(roomId);
    this.activeFileId = null;
    this.activeFileIdChange.emit(null);
  }

  selectFile(fileId: string) {
    this.activeFileId = fileId;
    this.activeFileIdChange.emit(fileId);
    this.activeRoomId = null;
    this.activeRoomIdChange.emit(null);
  }

  openNewChatMain() {
    this.selectRoom('');
  }

  // --- Context Menu ---
  onSidebarContextMenu(event: MouseEvent) {
    event.preventDefault();
    this.contextMenuNode = null;
    this.contextMenuPosition = { x: event.clientX, y: event.clientY };
    this.contextMenuOptions = [
      { 
        label: '새 폴더', 
        icon: 'bx bx-folder-plus', 
        onClick: () => this.openCreateFolderModal(null) 
      },
      { 
        label: '새 채팅', 
        icon: 'bx bx-edit-alt', 
        onClick: () => this.openNewChatMain() 
      },
      {
        label: '파일 첨부',
        icon: 'bx bx-upload',
        onClick: () => this.triggerFileUpload(null)
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
          label: '파일 첨부',
          icon: 'bx bx-upload',
          onClick: () => this.triggerFileUpload(node.id)
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
    } else if (node.type === 'room') {
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
    } else {
      this.contextMenuOptions = [
        { 
          label: '이름 변경', 
          icon: 'bx bx-rename', 
          onClick: () => this.startEditing(new Event('click'), node) 
        },
        { 
          label: '파일 삭제', 
          icon: 'bx bx-trash', 
          onClick: () => this.deleteFile(node.data) 
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

  // --- File Upload ---
  triggerFileUpload(folderId: string | null = null) {
    this.targetAttachFolderId = folderId;
    if (this.fileInputRef && this.fileInputRef.nativeElement) {
      this.fileInputRef.nativeElement.value = '';
      this.fileInputRef.nativeElement.click();
    }
  }

  async onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];
    const fileName = file.name;
    const extParts = fileName.split('.');
    const ext = extParts.length > 1 ? extParts.pop()! : '';
    
    this.dLoading.show(`'${fileName}' 파일을 읽는 중입니다...`);
    try {
      const content = await this.readFileAsText(file);
      const folderId = this.targetAttachFolderId;
      const order = this.files.filter(f => f.folder_id === folderId).length;

      const createdFile = await this.fileService.createFile(
        fileName,
        content,
        ext,
        folderId,
        file.size,
        order
      );

      this.files.push(createdFile);
      this.buildSidebarNodes();
      this.selectFile(createdFile.id);

      this.dLoading.dismiss('파일이 추가되었습니다.');
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('파일 추가 실패: ' + (e.message || ''), '오류');
    }
  }

  private readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string || '');
      reader.onerror = (err) => reject(err);
      reader.readAsText(file);
    });
  }

  // --- Inline Editing ---
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
      } else if (node.type === 'room') {
        const updated = await this.roomService.updateRoom(node.id, { title: newName });
        const room = this.rooms.find(r => r.id === node.id);
        if (room) room.title = updated.title;
      } else {
        const extParts = newName.split('.');
        const ext = extParts.length > 1 ? extParts.pop()! : node.data.extension;
        const updated = await this.fileService.updateFile(node.id, { name: newName, extension: ext });
        const file = this.files.find(f => f.id === node.id);
        if (file) {
          file.name = updated.name;
          file.extension = updated.extension;
        }
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

  // --- CRUD Operations ---
  async createNewRoom(initialMessage?: string, folderId: string | null = null, silent: boolean = false) {
    if (!silent) {
      this.dLoading.show('채팅방을 생성하는 중입니다...');
    }
    try {
      const title = initialMessage 
        ? (initialMessage.length > 18 ? initialMessage.substring(0, 18) + '...' : initialMessage) 
        : `새로운 채팅 ${this.rooms.length + 1}`;
        
      const room: any = await this.roomService.createRoom(title, this.selectedModel, folderId, this.rooms.length);
      
      if (initialMessage) {
        room.messages = [
          {
            text: initialMessage,
            isUser: true,
            timestamp: new Date(),
            processed: false
          }
        ];
      } else {
        room.messages = [
          { text: '안녕하세요! 반갑습니다. 무엇을 도와드릴까요?', isUser: false, timestamp: new Date() }
        ];
      }

      await this.roomService.saveMessages(room.id, room.messages);

      this.rooms.push(room);
      this.selectRoom(room.id);
      this.buildSidebarNodes();
      
      if (!silent) {
        this.dLoading.dismiss('새 채팅방이 생성되었습니다.');
      }
      return room;
    } catch (e: any) {
      if (!silent) {
        this.dLoading.dismiss();
        this.dAlert.error('채팅방 생성에 실패했습니다: ' + (e.message || ''), '오류');
      }
      return null;
    }
  }

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
          this.selectRoom('');
        }
        this.buildSidebarNodes();
        this.dLoading.dismiss('채팅방이 삭제되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('채팅방 삭제에 실패했습니다: ' + (e.message || ''), '오류');
      }
    });
  }

  async deleteFile(file: FileItem) {
    this.dAlert.confirm(`'${file.name}' 파일을 삭제하시겠습니까?`, '파일 삭제', async () => {
      this.dLoading.show('파일을 삭제하는 중입니다...');
      try {
        await this.fileService.deleteFile(file.id);
        this.files = this.files.filter(f => f.id !== file.id);
        if (this.activeFileId === file.id) {
          this.selectFile('');
        }
        this.buildSidebarNodes();
        this.dLoading.dismiss('파일이 삭제되었습니다.');
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('파일 삭제에 실패했습니다: ' + (e.message || ''), '오류');
      }
    });
  }

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

  // --- Drag & Drop ---
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

    if (this.draggedNode.type === 'folder' && targetNode.parent_id === this.draggedNode.id) {
      return;
    }

    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverNodeId = targetNode.id;

    const targetElement = (event.target as HTMLElement).closest('.sidebar-node');
    if (targetElement) {
      const rect = targetElement.getBoundingClientRect();
      const y = event.clientY - rect.top;
      
      if (targetNode.type === 'folder') {
        if (y < rect.height * 0.2) {
          this.dragOverMode = 'before';
        } else if (y > rect.height * 0.8) {
          this.dragOverMode = 'after';
        } else {
          this.dragOverMode = 'inside';
        }
      } else {
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
    const dragged = { ...this.draggedNode };
    this.dragOverNodeId = null;
    this.dragOverMode = null;
    this.draggedNode = null;

    let newParentId = targetNode.parent_id;
    if (mode === 'inside' && targetNode.type === 'folder') {
      newParentId = targetNode.id;
    }

    // 1. Update target item's parent id strictly by type
    if (dragged.type === 'folder') {
      const item = this.folders.find(f => f.id === dragged.id);
      if (item) item.parent_id = newParentId;
    } else if (dragged.type === 'room') {
      const item = this.rooms.find(r => r.id === dragged.id);
      if (item) item.folder_id = newParentId;
    } else if (dragged.type === 'file') {
      const item = this.files.find(f => f.id === dragged.id);
      if (item) item.folder_id = newParentId;
    }

    // 2. Re-calculate order_index for all items under newParentId
    const childFolders = this.folders.filter(f => f.parent_id === newParentId);
    const childRooms = this.rooms.filter(r => r.folder_id === newParentId);
    const childFiles = this.files.filter(f => f.folder_id === newParentId);

    const folderUpdates = childFolders.map((f, i) => ({ id: f.id, parent_id: newParentId, order_index: i }));
    const roomUpdates = childRooms.map((r, i) => ({ id: r.id, folder_id: newParentId, order_index: i }));
    const fileUpdates = childFiles.map((f, i) => ({ id: f.id, folder_id: newParentId, order_index: i }));

    this.buildSidebarNodes();

    try {
      this.dLoading.show('위치를 변경하는 중입니다...');
      if (dragged.type === 'folder' && folderUpdates.length > 0) {
        await this.folderService.updateFolderOrders(folderUpdates);
      } else if (dragged.type === 'room' && roomUpdates.length > 0) {
        await this.roomService.updateRoomOrders(roomUpdates);
      } else if (dragged.type === 'file' && fileUpdates.length > 0) {
        await this.fileService.updateFileOrders(fileUpdates);
      }
      await this.loadData();
      this.dLoading.dismiss('위치가 변경되었습니다.');
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('이동 및 순서 저장에 실패했습니다: ' + (e.message || ''), '오류');
      await this.loadData();
    }
  }
}

import { Component, OnInit, inject, Input, Output, EventEmitter, HostListener, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { CDropdownComponent, CDropdownOption } from '../../../../components/c-dropdown/c-dropdown.component';
import { CModalComponent } from '../../../../components/c-modal/c-modal.component';
import { CButtonComponent } from '../../../../components/c-button/c-button.component';
import { TemplateService, Template, TemplateFile } from '../../../../core/services/template.service';
import { FolderService, Folder } from '../../../../core/services/folder.service';
import { RoomService, ChatRoomRecord } from '../../../../core/services/room.service';
import { FileItemService, FileItem } from '../../../../core/services/file-item.service';
import { DAlertService } from '../../../../core/services/d-alert.service';
import { DLoadingService } from '../../../../core/services/d-loading.service';
import { AuthService } from '../../../../core/services/auth.service';
import { SupabaseService } from '../../../../core/services/supabase.service';
import { ChatInputService } from '../../../../core/services/chat-input.service';

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
  imports: [CommonModule, FormsModule, CModalComponent, CButtonComponent, CDropdownComponent],
  templateUrl: './home-sidebar.component.html',
  styleUrl: './home-sidebar.component.scss'
})
export class HomeSidebarComponent implements OnInit {
  @Input() activeRoomId: string | null = null;
  @Input() activeFileId: string | null = null;
  @Input() selectedModel: string = 'Gemini 3.6 Flash';

  // --- 템플릿 모달 상태 ---
  isTemplateModalOpen = false;
  templateModalMode: 'select' | 'upload' | 'edit' = 'select';

  // 선택 모드: DB에서 조회한 내 템플릿 목록
  myTemplates: Template[] = [];
  selectedTemplate: Template | null = null;
  selectedTemplateFiles: TemplateFile[] = [];
  isLoadingTemplates = false;
  selectedFrameworkFilter: string = '전체';

  // 편집 모드: 수정 대상 템플릿 ID
  editingTemplateId: string | null = null;

  // 사용자 지정 업로드 폼 상태
  uploadGroupName: string = '';
  selectedUploadFramework: string = 'HTML5';
  uploadFrameworkOptions: CDropdownOption[] = [
    // 마크업 및 스타일링
    { label: 'HTML5', value: 'HTML5', icon: 'bxl-html5 icon-html', onClick: () => this.selectedUploadFramework = 'HTML5' },
    { label: 'CSS3', value: 'CSS3', icon: 'bxl-css3 icon-css', onClick: () => this.selectedUploadFramework = 'CSS3' },
    { label: 'SCSS', value: 'SCSS', icon: 'bxl-sass icon-scss', onClick: () => this.selectedUploadFramework = 'SCSS' },
    { label: 'Bootstrap', value: 'Bootstrap', icon: 'bxl-bootstrap icon-bootstrap', onClick: () => this.selectedUploadFramework = 'Bootstrap' },
    { label: 'Tailwind CSS', value: 'Tailwind CSS', icon: 'bxl-tailwind-css icon-tailwind', onClick: () => this.selectedUploadFramework = 'Tailwind CSS' },
    { label: 'jQuery', value: 'jQuery', icon: 'bx-code-curly icon-jquery', onClick: () => this.selectedUploadFramework = 'jQuery' },
    { label: 'JavaScript', value: 'JavaScript', icon: 'bxl-javascript icon-javascript', onClick: () => this.selectedUploadFramework = 'JavaScript' },
    { label: 'TypeScript', value: 'TypeScript', icon: 'bxl-typescript icon-typescript', onClick: () => this.selectedUploadFramework = 'TypeScript' },
    { label: 'Java', value: 'Java', icon: 'bxl-java icon-java', onClick: () => this.selectedUploadFramework = 'Java' },
    // 프론트엔드
    { label: 'React.js', value: 'React.js', icon: 'bxl-react icon-react', onClick: () => this.selectedUploadFramework = 'React.js' },
    { label: 'Next.js', value: 'Next.js', icon: 'bxl-react icon-nextjs', onClick: () => this.selectedUploadFramework = 'Next.js' },
    { label: 'Angular', value: 'Angular', icon: 'bxl-angular icon-angular', onClick: () => this.selectedUploadFramework = 'Angular' },
    { label: 'Vue.js', value: 'Vue.js', icon: 'bxl-vuejs icon-vue', onClick: () => this.selectedUploadFramework = 'Vue.js' },
    { label: 'Nuxt.js', value: 'Nuxt.js', icon: 'bxl-vuejs icon-nuxtjs', onClick: () => this.selectedUploadFramework = 'Nuxt.js' },
    // 백엔드
    { label: 'Node.js', value: 'Node.js', icon: 'bxl-nodejs icon-nodejs', onClick: () => this.selectedUploadFramework = 'Node.js' },
    { label: 'Nest.js', value: 'Nest.js', icon: 'bxl-nodejs icon-nestjs', onClick: () => this.selectedUploadFramework = 'Nest.js' },
    { label: 'Supabase', value: 'Supabase', icon: 'bxs-bolt icon-supabase', onClick: () => this.selectedUploadFramework = 'Supabase' },
    { label: 'Spring Boot', value: 'Spring Boot', icon: 'bx-leaf icon-springboot', onClick: () => this.selectedUploadFramework = 'Spring Boot' },
    { label: 'MongoDB', value: 'MongoDB', icon: 'bxl-mongodb icon-mongodb', onClick: () => this.selectedUploadFramework = 'MongoDB' },
    { label: 'MariaDB', value: 'MariaDB', icon: 'bx-server icon-mariadb', onClick: () => this.selectedUploadFramework = 'MariaDB' },
    { label: 'MySQL', value: 'MySQL', icon: 'bx-data icon-mysql', onClick: () => this.selectedUploadFramework = 'MySQL' },
    { label: 'PostgreSQL', value: 'PostgreSQL', icon: 'bxl-postgresql icon-postgresql', onClick: () => this.selectedUploadFramework = 'PostgreSQL' },
    // 기타
    { label: 'Flutter / Dart', value: 'Flutter / Dart', icon: 'bxl-flutter icon-flutter', onClick: () => this.selectedUploadFramework = 'Flutter / Dart' },
    { label: 'Python', value: 'Python', icon: 'bxl-python icon-python', onClick: () => this.selectedUploadFramework = 'Python' },
    { label: 'Docker', value: 'Docker', icon: 'bxl-docker icon-docker', onClick: () => this.selectedUploadFramework = 'Docker' },
    { label: '기타 (Other)', value: '기타 (Other)', icon: 'bx-code-alt icon-other', onClick: () => this.selectedUploadFramework = '기타 (Other)' }
  ];

  getSelectedFrameworkIcon(fw: string): string {
    const f = (fw || '').toLowerCase();
    if (f.includes('bootstrap')) return 'bxl-bootstrap icon-bootstrap';
    if (f.includes('angular')) return 'bxl-angular icon-angular';
    if (f.includes('next')) return 'bxl-react icon-nextjs';
    if (f.includes('nuxt')) return 'bxl-vuejs icon-nuxtjs';
    if (f.includes('react')) return 'bxl-react icon-react';
    if (f.includes('vue')) return 'bxl-vuejs icon-vue';
    if (f.includes('nest')) return 'bxl-nodejs icon-nestjs';
    if (f.includes('node')) return 'bxl-nodejs icon-nodejs';
    if (f.includes('typescript') || f === 'ts' || f.startsWith('ts ') || f.endsWith(' ts')) return 'bxl-typescript icon-typescript';
    if (f.includes('jquery')) return 'bx-code-curly icon-jquery';
    if (f.includes('javascript') || f.includes('js')) return 'bxl-javascript icon-javascript';
    if (f.includes('flutter')) return 'bxl-flutter icon-flutter';
    if (f.includes('dart')) return 'icon-dart';
    if (f.includes('tailwind')) return 'bxl-tailwind-css icon-tailwind';
    if (f.includes('scss') || f.includes('sass')) return 'bxl-sass icon-scss';
    if (f.includes('css') && !f.includes('html')) return 'bxl-css3 icon-css';
    if (f.includes('html')) return 'bxl-html5 icon-html';
    if (f.includes('python')) return 'bxl-python icon-python';
    if (f.includes('spring')) return 'bx-leaf icon-springboot';
    if (f.includes('java') && !f.includes('script')) return 'bxl-java icon-java';
    if (f.includes('mongo')) return 'bxl-mongodb icon-mongodb';
    if (f.includes('supabase')) return 'bxs-bolt icon-supabase';
    if (f.includes('maria')) return 'bx-server icon-mariadb';
    if (f.includes('mysql')) return 'bx-data icon-mysql';
    if (f.includes('postgres')) return 'bxl-postgresql icon-postgresql';
    if (f.includes('docker')) return 'bxl-docker icon-docker';
    return 'bx-code-alt icon-other';
  }

  getTemplateIcon(tpl: any): string {
    if (!tpl) return 'bx bx-code-alt icon-other';
    if (tpl.framework) {
      return 'bx ' + this.getSelectedFrameworkIcon(tpl.framework);
    }
    if (tpl.icon && tpl.icon.includes('icon-')) {
      return tpl.icon.startsWith('bx') ? tpl.icon : 'bx ' + tpl.icon;
    }
    return 'bx ' + this.getSelectedFrameworkIcon(tpl.icon || tpl.name || '');
  }
  uploadDescription: string = '';
  uploadedCustomFiles: { name: string; extension: string; content: string; size?: number }[] = [];

  @Output() activeRoomIdChange = new EventEmitter<string | null>();
  @Output() activeFileIdChange = new EventEmitter<string | null>();
  @Output() dataChanged = new EventEmitter<void>();

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
  currentUserId: string | null = null;
  currentUserEmail: string = '';
  currentUserNickname: string = '';

  userMenuOptions: CDropdownOption[] = [
    {
      label: '내 정보',
      icon: 'bx bx-user-pin',
      onClick: () => this.navigateToAccount()
    },
    {
      label: '환경설정',
      icon: 'bx bx-cog',
      onClick: () => this.navigateToSettings()
    },
    {
      type: 'divider'
    },
    {
      label: '로그아웃',
      icon: 'bx bx-log-out text-danger',
      onClick: () => this.logout()
    }
  ];

  private targetAttachFolderId: string | null = null;

  private folderService = inject(FolderService);
  private roomService = inject(RoomService);
  private fileService = inject(FileItemService);
  private dAlert = inject(DAlertService);
  private dLoading = inject(DLoadingService);
  private authService = inject(AuthService);
  private supabaseService = inject(SupabaseService);
  private templateService = inject(TemplateService);
  private router = inject(Router);

  @HostListener('document:click')
  closeContextMenu() {
    this.contextMenuVisible = false;
  }

  async ngOnInit() {
    this.authService.currentUser.subscribe(user => {
      if (user) {
        this.currentUserId = user.id;
        this.currentUserEmail = user.email || '';
        this.currentUserNickname = this.authService.getUserNickname(user);
      }
    });
    await this.loadData();
  }

  navigateToAccount() {
    this.router.navigate(['/account']);
  }

  navigateToSettings() {
    this.router.navigate(['/settings']);
  }

  logout() {
    this.dAlert.confirm('로그아웃 하시겠습니까?', '로그아웃', async () => {
      this.dLoading.show('로그아웃 중...');
      try {
        await this.authService.signOut();
        this.dLoading.dismiss();
        this.router.navigate(['/login']);
      } catch (e: any) {
        this.dLoading.dismiss();
        this.dAlert.error('로그아웃 중 오류가 발생했습니다: ' + (e.message || ''), '오류');
      }
    });
  }

  async loadData() {
    try {
      this.folders = await this.folderService.getFolders();
      this.rooms = await this.roomService.getRooms();
      this.files = await this.fileService.getFiles();
      this.buildSidebarNodes();
      this.dataChanged.emit();
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

  private chatInputService = inject(ChatInputService);

  getFileIcon(ext: string): string {
    return this.chatInputService.getFileIcon(ext);
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
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
    this.activeRoomId = roomId;
    this.activeRoomIdChange.emit(roomId);
    this.activeFileId = null;
    this.activeFileIdChange.emit(null);
  }

  selectFile(fileId: string) {
    if (this.router.url !== '/') {
      this.router.navigate(['/']);
    }
    this.activeFileId = fileId;
    this.activeFileIdChange.emit(fileId);
    this.activeRoomId = null;
    this.activeRoomIdChange.emit(null);
  }

  openNewChatMain() {
    this.selectRoom('');
  }

  // --- 템플릿 모달 핸들러 ---
  async openTemplateModal() {
    this.templateModalMode = 'select';
    this.selectedTemplate = null;
    this.selectedTemplateFiles = [];
    this.selectedFrameworkFilter = '전체';
    // 업로드 폼 초기화
    this.uploadGroupName = '';
    this.uploadDescription = '';
    this.uploadedCustomFiles = [];
    this.selectedUploadFramework = 'HTML5';
    this.isTemplateModalOpen = true;
    // DB에서 내 템플릿 목록 로드
    await this.loadMyTemplates();
  }

  closeTemplateModal() {
    this.isTemplateModalOpen = false;
  }

  // 현재 로그인한 사용자가 템플릿의 생성자인지 확인
  isTemplateOwner(template: Template | null): boolean {
    if (!template || !this.currentUserId) return false;
    return template.user_id === this.currentUserId;
  }

  // DB에서 전체 템플릿 목록 조회
  async loadMyTemplates() {
    this.isLoadingTemplates = true;
    try {
      const { data: { user } } = await this.supabaseService.client.auth.getUser();
      this.currentUserId = user?.id ?? null;
      this.myTemplates = await this.templateService.getTemplates();
      if (this.filteredTemplates.length > 0) {
        await this.selectTemplate(this.filteredTemplates[0]);
      } else {
        this.selectedTemplate = null;
        this.selectedTemplateFiles = [];
      }
    } catch (e: any) {
      console.error('템플릿 목록 로드 실패:', e);
      this.myTemplates = [];
      this.selectedTemplate = null;
      this.selectedTemplateFiles = [];
    } finally {
      this.isLoadingTemplates = false;
    }
  }

  // 등록된 템플릿의 고유 프레임워크 목록 추출
  get uniqueFrameworks(): string[] {
    const fws = new Set(this.myTemplates.map(t => t.framework).filter(Boolean));
    return ['전체', ...Array.from(fws)];
  }

  // 선택한 프레임워크로 필터링된 템플릿 목록
  get filteredTemplates(): Template[] {
    if (this.selectedFrameworkFilter === '전체') {
      return this.myTemplates;
    }
    return this.myTemplates.filter(t => t.framework === this.selectedFrameworkFilter);
  }

  async selectFrameworkFilter(fw: string) {
    this.selectedFrameworkFilter = fw;
    // 필터 변경 시 첫 번째 항목 자동 선택
    if (this.filteredTemplates.length > 0) {
      await this.selectTemplate(this.filteredTemplates[0]);
    } else {
      this.selectedTemplate = null;
      this.selectedTemplateFiles = [];
    }
  }

  // 목록에서 템플릿 선택 시 파일 목록 로드
  async selectTemplate(template: Template) {
    this.selectedTemplate = template;
    // 조인으로 이미 파일이 있으면 사용, 없으면 별도 조회
    if (template.template_files && template.template_files.length > 0) {
      this.selectedTemplateFiles = template.template_files;
    } else {
      this.selectedTemplateFiles = await this.templateService.getTemplateFiles(template.id);
    }
  }

  // 선택한 템플릿으로 폴더 + 파일 생성
  async submitSelectedTemplate() {
    if (!this.selectedTemplate) return;
    const groupName = this.selectedTemplate.name;
    const files = this.selectedTemplateFiles.map(f => ({
      name: f.name,
      extension: f.extension,
      content: f.content
    }));
    await this.createTemplateBundle(groupName, files);
  }

  // 선택 모드에서 템플릿 삭제
  deleteMyTemplate(template: Template) {
    if (!this.isTemplateOwner(template)) {
      this.dAlert.warn('본인이 생성한 템플릿만 삭제할 수 있습니다.', '권한 없음');
      return;
    }
    this.dAlert.confirm(
      `'${template.name}' 템플릿을 삭제하시겠습니까?`,
      '템플릿 삭제',
      async () => {
        this.dLoading.show('템플릿을 삭제하는 중입니다...');
        try {
          await this.templateService.deleteTemplate(template.id);
          this.myTemplates = this.myTemplates.filter(t => t.id !== template.id);
          if (this.selectedTemplate?.id === template.id) {
            this.selectedTemplate = null;
            this.selectedTemplateFiles = [];
          }
          this.dLoading.dismiss('템플릿이 삭제되었습니다.');
        } catch (e: any) {
          this.dLoading.dismiss();
          this.dAlert.error('템플릿 삭제 실패: ' + (e.message || ''), '오류');
        }
      }
    );
  }

  // 템플릿 수정 모드 진입
  async startEditTemplate(template: Template) {
    if (!this.isTemplateOwner(template)) {
      this.dAlert.warn('본인이 생성한 템플릿만 수정할 수 있습니다.', '권한 없음');
      return;
    }
    this.editingTemplateId = template.id;
    this.uploadGroupName = template.name;
    this.uploadDescription = template.description || '';
    this.selectedUploadFramework = template.framework || 'HTML5';

    // 기존 파일 목록 로드 (README.md 제외 - 자동 생성되므로)
    const files = template.template_files && template.template_files.length > 0
      ? template.template_files
      : await this.templateService.getTemplateFiles(template.id);

    this.uploadedCustomFiles = files
      .filter(f => f.name !== 'README.md')
      .map(f => ({
        name: f.name,
        extension: f.extension,
        content: f.content,
        size: f.content.length
      }));

    this.templateModalMode = 'edit';
  }

  // 템플릿 수정 저장
  async submitEditTemplate() {
    if (!this.editingTemplateId) return;

    if (!this.uploadGroupName.trim()) {
      this.dAlert.warn('템플릿명을 입력해주세요.', '필수 입력 항목 누락');
      return;
    }

    if (!this.selectedUploadFramework) {
      this.dAlert.warn('프레임워크를 선택해주세요.', '필수 입력 항목 누락');
      return;
    }

    if (this.uploadedCustomFiles.length === 0) {
      this.dAlert.warn('구성 파일을 최소 1개 이상 첨부해주세요.', '필수 입력 항목 누락');
      return;
    }

    const files: { name: string; extension: string; content: string }[] = [];

    // README.md 자동 재생성
    const readmeContent = `# ${this.uploadGroupName}

## 📌 프레임워크
- **${this.selectedUploadFramework}**

## 📝 템플릿 설명
${this.uploadDescription || '등록된 설명이 없습니다.'}

## 📁 포함된 파일 목록
${this.uploadedCustomFiles.map(f => `- \`${f.name}\``).join('\n') || '- 첨부된 파일 없음'}
`;

    files.push({ name: 'README.md', extension: 'md', content: readmeContent });

    for (const f of this.uploadedCustomFiles) {
      files.push({ name: f.name, extension: f.extension, content: f.content });
    }

    this.dLoading.show(`'${this.uploadGroupName}' 템플릿을 수정하는 중입니다...`);
    try {
      await this.templateService.updateTemplate(
        this.editingTemplateId,
        this.uploadGroupName.trim(),
        this.uploadDescription,
        this.selectedUploadFramework,
        files
      );

      this.dLoading.dismiss('템플릿이 성공적으로 수정되었습니다.');

      // 초기화 및 목록 새로고침
      this.editingTemplateId = null;
      this.uploadGroupName = '';
      this.uploadDescription = '';
      this.uploadedCustomFiles = [];
      this.templateModalMode = 'select';
      await this.loadMyTemplates();
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('템플릿 수정 실패: ' + (e.message || ''), '오류');
    }
  }

  async onCustomFilesAttached(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    for (let i = 0; i < input.files.length; i++) {
      const file = input.files[i];
      const name = file.name;
      const parts = name.split('.');
      const ext = parts.length > 1 ? parts.pop()! : '';
      const content = await this.readFileAsText(file);

      this.uploadedCustomFiles.push({
        name,
        extension: ext,
        content,
        size: file.size
      });
    }

    input.value = '';
  }

  removeCustomFile(index: number) {
    this.uploadedCustomFiles.splice(index, 1);
  }

  async submitCustomUpload() {
    if (!this.uploadGroupName.trim()) {
      this.dAlert.warn('템플릿명을 입력해주세요.', '필수 입력 항목 누락');
      return;
    }

    if (!this.selectedUploadFramework) {
      this.dAlert.warn('프레임워크를 선택해주세요.', '필수 입력 항목 누락');
      return;
    }

    if (this.uploadedCustomFiles.length === 0) {
      this.dAlert.warn('구성 파일을 최소 1개 이상 첨부해주세요.', '필수 입력 항목 누락');
      return;
    }

    const files: { name: string; extension: string; content: string }[] = [];

    // 1. README.md 자동 생성
    const readmeContent = `# ${this.uploadGroupName}

## 📌 프레임워크
- **${this.selectedUploadFramework}**

## 📝 템플릿 설명
${this.uploadDescription || '등록된 설명이 없습니다.'}

## 📁 포함된 파일 목록
${this.uploadedCustomFiles.map(f => `- \`${f.name}\``).join('\n') || '- 첨부된 파일 없음'}
`;

    files.push({
      name: 'README.md',
      extension: 'md',
      content: readmeContent
    });

    // 2. 업로드된 커스텀 파일 추가
    for (const f of this.uploadedCustomFiles) {
      files.push({
        name: f.name,
        extension: f.extension,
        content: f.content
      });
    }

    this.dLoading.show(`'${this.uploadGroupName}' 템플릿을 등록하는 중입니다...`);
    try {
      // DB templates 테이블에 저장
      await this.templateService.createTemplate(
        this.uploadGroupName.trim(),
        this.uploadDescription,
        this.selectedUploadFramework,
        files
      );

      this.dLoading.dismiss('템플릿이 성공적으로 등록되었습니다.');

      // 업로드 폼 초기화
      this.uploadGroupName = '';
      this.uploadDescription = '';
      this.uploadedCustomFiles = [];

      // 선택 모드로 전환 후 목록 새로고침
      this.templateModalMode = 'select';
      await this.loadMyTemplates();
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('템플릿 등록 실패: ' + (e.message || ''), '오류');
    }
  }

  private async createTemplateBundle(groupName: string, files: { name: string; extension: string; content: string }[]) {
    this.dLoading.show(`'${groupName}' 템플릿 폴더 및 소스 코드를 생성하는 중입니다...`);
    try {
      const order = this.folders.filter(f => !f.parent_id).length;
      const parentFolder = await this.folderService.createFolder(groupName, null, order);
      parentFolder.isExpanded = true;

      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        await this.fileService.createFile(f.name, f.content, f.extension, parentFolder.id, f.content.length, i);
      }

      await this.loadData();
      this.dLoading.dismiss('템플릿이 성공적으로 생성되었습니다.');
      this.closeTemplateModal();
    } catch (e: any) {
      this.dLoading.dismiss();
      this.dAlert.error('템플릿 생성 실패: ' + (e.message || ''), '오류');
    }
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
  async createNewRoom(initialMessage?: string, folderId: string | null = null, silent: boolean = false, model?: string) {
    if (!silent) {
      this.dLoading.show('채팅방을 생성하는 중입니다...');
    }
    try {
      const title = initialMessage
        ? (initialMessage.length > 18 ? initialMessage.substring(0, 18) + '...' : initialMessage)
        : `새로운 채팅 ${this.rooms.length + 1}`;

      const targetModel = model || this.selectedModel;
      const room: any = await this.roomService.createRoom(title, targetModel, folderId, this.rooms.length);

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
        this.startEditing({ stopPropagation: () => { } } as Event, newNode);
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

  // --- Drag & Drop ---
  onDragStart(event: DragEvent, node: SidebarNode) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', node.id);
    }
    setTimeout(() => {
      this.draggedNode = node;
    }, 0);
  }

  onDragEnd(event: DragEvent) {
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

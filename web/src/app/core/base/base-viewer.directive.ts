import { Directive, Input, Output, EventEmitter, inject, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { FileItem, FileItemService } from '../services/file-item.service';
import { DAlertService } from '../services/d-alert.service';
import { DLoadingService } from '../services/d-loading.service';
import { ChatInputService, AttachedItem } from '../services/chat-input.service';
import { CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';

/**
 * 코드 뷰어 및 이미지 뷰어 등 모든 컨텐츠 뷰어의 공통 기본 추상 클래스
 */
@Directive()
export abstract class BaseViewerDirective implements OnInit, OnChanges {
  @Input({ required: true }) file!: FileItem;
  @Input() selectedModel: string = 'Gemini 3.6 Flash';
  @Output() onClose = new EventEmitter<void>();
  @Output() sendFileQuestion = new EventEmitter<{ file: FileItem; question: string; model: string }>();

  userInput: string = '';
  attachedItems: AttachedItem[] = [];

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

  protected dAlert = inject(DAlertService);
  protected dLoading = inject(DLoadingService);
  protected fileService = inject(FileItemService);
  protected chatInputService = inject(ChatInputService);

  async ngOnInit() {
    await this.loadAddMenuOptions();
    this.onInitViewer();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['file']) {
      this.loadAddMenuOptions();
      this.onFileChanged();
    }
  }

  /** 각 하위 뷰어별 초기화 훅 */
  protected abstract onInitViewer(): void;

  /** 파일 변경 시 하위 뷰어별 갱신 훅 */
  protected abstract onFileChanged(): void;

  async loadAddMenuOptions() {
    const folderId = this.file?.folder_id !== undefined ? this.file.folder_id : null;
    const currentFileId = this.file?.id;
    this.addMenuOptions = await this.chatInputService.loadAddMenuOptions(
      { folderId, currentFileId },
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

  handleEnter(event: Event) {
    if ((event as KeyboardEvent).isComposing) return;
    event.preventDefault();
    this.sendQuestion();
  }

  autoResize(event: Event) {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    const scrollHeight = textarea.scrollHeight;

    if (scrollHeight >= 140) {
      textarea.style.height = '140px';
      textarea.style.overflowY = 'auto';
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = 'hidden';
    }
  }

  sendQuestion() {
    if (!this.userInput.trim() && this.attachedItems.length === 0) return;
    let fullQuestion = this.userInput.trim();
    if (this.attachedItems.length > 0) {
      const attachmentsText = this.attachedItems.map(item => item.content || '').join('\n');
      fullQuestion = (fullQuestion ? fullQuestion + '\n\n' : '') + attachmentsText;
    }
    this.sendFileQuestion.emit({ file: this.file, question: fullQuestion, model: this.selectedModel });
    this.userInput = '';
    this.attachedItems = [];
    const textarea = document.querySelector('.viewer-textarea') as HTMLTextAreaElement;
    if (textarea) textarea.style.height = 'auto';
  }

  get formattedSize(): string {
    const bytes = this.file?.size || 0;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  get fileIconClass(): string {
    const ext = (this.file?.extension || '').toLowerCase();
    switch (ext) {
      case 'png': case 'jpg': case 'jpeg': case 'svg': case 'gif': case 'webp':
        return 'bx bx-image icon-image';
      case 'html': case 'htm': return 'bx bxl-html5 icon-html';
      case 'css': return 'bx bxl-css3 icon-css';
      case 'scss': case 'sass': return 'bx bxl-sass icon-scss';
      case 'less': return 'bx bxl-css3 icon-css';
      case 'js': case 'jsx': return 'bx bxl-javascript icon-javascript';
      case 'ts': case 'tsx': return 'bx bxl-typescript icon-typescript';
      case 'py': return 'bx bxl-python icon-python';
      case 'java': return 'bx bxl-java icon-java';
      case 'json': return 'bx bx-code-curly icon-json';
      case 'md': return 'bx bxl-markdown icon-markdown';
      default: return 'bx bx-code-alt icon-other';
    }
  }

  goBack() {
    this.onClose.emit();
  }
}

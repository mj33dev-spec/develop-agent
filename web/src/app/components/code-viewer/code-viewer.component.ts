import { Component, Input, Output, EventEmitter, inject, HostListener, OnInit, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FileItem, FileItemService } from '../../core/services/file-item.service';
import { DAlertService } from '../../core/services/d-alert.service';
import { ChatInputService, AttachedItem } from '../../core/services/chat-input.service';
import { CDropdownComponent, CDropdownOption } from '../c-dropdown/c-dropdown.component';
import { CBadgeComponent } from '../c-badge/c-badge.component';

import * as Prism from 'prismjs';
import 'prismjs/components/prism-css';
import 'prismjs/components/prism-scss';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-markdown';
import 'prismjs/components/prism-jsx';
import 'prismjs/components/prism-tsx';

@Component({
  selector: 'app-code-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, CDropdownComponent, CBadgeComponent],
  templateUrl: './code-viewer.component.html',
  styleUrl: './code-viewer.component.scss'
})
export class CodeViewerComponent implements OnInit, OnChanges {
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

  isPreviewOpen = false;
  previewSrcDoc: SafeHtml | string = '';
  linkedCssNames: string[] = [];
  linkedJsNames: string[] = [];

  leftWidthPercent = 50;
  isResizing = false;

  private dAlert = inject(DAlertService);
  private fileService = inject(FileItemService);
  private sanitizer = inject(DomSanitizer);
  private chatInputService = inject(ChatInputService);

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

  highlightedLines: { lineNum: number; html: SafeHtml }[] = [];

  ngOnInit() {
    this.loadAddMenuOptions();
    this.processHighlightedLines();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['file']) {
      this.loadAddMenuOptions();
      this.processHighlightedLines();
    }
  }

  get themeClass(): string {
    const ext = (this.file?.extension || '').toLowerCase();
    switch (ext) {
      case 'html': case 'htm': return 'html';
      case 'css': return 'css';
      case 'scss': case 'sass': return 'scss';
      case 'js': case 'jsx': return 'js';
      case 'ts': case 'tsx': return 'ts';
      case 'py': case 'python': return 'python';
      case 'java': return 'java';
      case 'json': return 'json';
      case 'sql': return 'sql';
      case 'md': case 'markdown': return 'md';
      default: return 'default';
    }
  }

  get themeDisplayName(): string {
    switch (this.themeClass) {
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      case 'scss': return 'SCSS';
      case 'js': return 'JavaScript';
      case 'ts': return 'TypeScript';
      case 'python': return 'Python';
      case 'java': return 'Java';
      case 'json': return 'JSON';
      case 'sql': return 'SQL';
      case 'md': return 'Markdown';
      default: return (this.file?.extension || 'CODE').toUpperCase();
    }
  }

  getLanguageByExtension(ext: string): string {
    const e = (ext || '').toLowerCase();
    switch (e) {
      case 'html': case 'htm': return 'html';
      case 'css': return 'css';
      case 'scss': case 'sass': return 'scss';
      case 'js': case 'jsx': return 'javascript';
      case 'ts': case 'tsx': return 'typescript';
      case 'py': case 'python': return 'python';
      case 'java': return 'java';
      case 'json': return 'json';
      case 'sql': return 'sql';
      case 'md': case 'markdown': return 'markdown';
      default: return 'clike';
    }
  }

  private escapeHtml(str: string): string {
    return (str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  trackByLineNum(index: number, item: { lineNum: number }): number {
    return item.lineNum;
  }

  processHighlightedLines() {
    if (!this.file || !this.file.content) {
      this.highlightedLines = [];
      return;
    }
    const ext = (this.file.extension || '').toLowerCase();
    const lang = this.getLanguageByExtension(ext);
    const grammar = Prism.languages[lang] || Prism.languages['clike'] || Prism.languages['markup'];

    const rawLines = this.file.content.split('\n');
    this.highlightedLines = rawLines.map((line, idx) => {
      let highlighted = '';
      try {
        highlighted = Prism.highlight(line || ' ', grammar, lang);
      } catch (e) {
        highlighted = this.escapeHtml(line || ' ');
      }
      return {
        lineNum: idx + 1,
        html: this.sanitizer.bypassSecurityTrustHtml(highlighted)
      };
    });
  }

  get lines(): string[] {
    if (!this.file || !this.file.content) return [];
    return this.file.content.split('\n');
  }

  get isHtmlFile(): boolean {
    const ext = (this.file?.extension || '').toLowerCase();
    return ext === 'html' || ext === 'htm';
  }

  get fileIconClass(): string {
    const ext = (this.file?.extension || '').toLowerCase();
    switch (ext) {
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
      case 'png': case 'jpg': case 'jpeg': case 'svg': case 'gif': return 'bx bx-image icon-image';
      default: return 'bx bx-code-alt icon-other';
    }
  }

  get formattedSize(): string {
    const bytes = this.file?.size || 0;
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  @HostListener('document:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (!this.isResizing) return;
    const container = document.querySelector('.split-viewer-body') as HTMLElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    let newPercent = (offsetX / rect.width) * 100;
    
    if (newPercent < 20) newPercent = 20;
    if (newPercent > 80) newPercent = 80;

    this.leftWidthPercent = newPercent;
  }

  @HostListener('document:mouseup')
  onMouseUp() {
    if (this.isResizing) {
      this.isResizing = false;
    }
  }

  startResizing(event: MouseEvent) {
    event.preventDefault();
    this.isResizing = true;
  }

  togglePreview() {
    if (this.isPreviewOpen) {
      this.isPreviewOpen = false;
    } else {
      this.openPreview();
    }
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

  private getCleanBaseName(fileName: string): string {
    let name = (fileName || '').toLowerCase();
    const extIndex = name.lastIndexOf('.');
    if (extIndex !== -1) {
      name = name.substring(0, extIndex);
    }
    name = name.replace(/[\.-]component$/, '');
    return name;
  }

  private compileScssToCss(scss: string): string {
    if (!scss) return '';
    
    let css = scss.replace(/@use\s+['"][^'"]+['"]\s*(as\s+[\*\w]+)?;?/g, '');
    css = css.replace(/@import\s+['"][^'"]+['"];?/g, '');

    const varMap: Record<string, string> = {
      '$neu-bg': '#e0e5ec',
      '$neu-text': '#2d3748',
      '$neu-text-secondary': '#718096',
      '$neu-shadow-dark': '#a3b1c6',
      '$neu-shadow-light': '#ffffff',
      '$neu-primary': '#4a86ff',
      '$color-primary': '#4a86ff',
      '$color-bg': '#e0e5ec',
      '$color-text': '#2d3748',
      '$color-sub-text': '#718096',
      '$color-white': '#ffffff',
      '$color-dark': '#1a202c',
      '$color-error': '#e53e3e'
    };

    for (const [key, val] of Object.entries(varMap)) {
      const escapedKey = key.replace('$', '\\$');
      css = css.replace(new RegExp(escapedKey, 'g'), val);
    }

    css = css.replace(/&\s*:hover/g, ':hover');
    css = css.replace(/&\s*:active/g, ':active');
    css = css.replace(/&\s*:focus/g, ':focus');
    css = css.replace(/@include\s+[\w\-]+(\([^)]*\))?;?/g, '');

    return css;
  }

  private cleanAngularTemplateForPreview(rawHtml: string): string {
    if (!rawHtml) return '';
    let html = rawHtml;

    // 1. Process *ngFor elements (duplicate for sample rendering)
    html = html.replace(/<([\w\-]+)\s+[^>]*\*ngFor="[^"]*"[^>]*>([\s\S]*?)<\/\1>/gi, (match) => {
      const cleanMatch = match.replace(/\*ngFor="[^"]*"/gi, '');
      const opt1 = cleanMatch.replace(/\{\{\s*[\w\.\?\s\|']+\s*\}\}/g, '옵션 1 (Angular)');
      const opt2 = cleanMatch.replace(/\{\{\s*[\w\.\?\s\|']+\s*\}\}/g, '옵션 2 (React)');
      const opt3 = cleanMatch.replace(/\{\{\s*[\w\.\?\s\|']+\s*\}\}/g, '옵션 3 (Vue)');
      return `${opt1}\n${opt2}\n${opt3}`;
    });

    // 2. Process Angular Event bindings: (click)="toggle()" ➡️ onclick="..."
    html = html.replace(/\(click\)="([^"]*)"/g, 'onclick="handlePreviewClick(this, \'$1\')"');

    // 3. Process Angular Property/Attribute bindings: [class]="..." ➡️ class="..."
    html = html.replace(/\[(class|style|id|src)\]="([^"]*)"/g, '$1="$2"');

    // 4. Process Angular Interpolation: {{ selectedValue || '옵션 선택' }} ➡️ '옵션 선택'
    html = html.replace(/\{\{\s*[^}]*?\|\|\s*['"]([^'"]+)['"]\s*\}\}/g, '$1');
    html = html.replace(/\{\{\s*['"]([^'"]+)['"]\s*\}\}/g, '$1');
    html = html.replace(/\{\{\s*[\w\.\?\s]+\s*\}\}/g, '선택된 옵션');

    // 5. Replace *ngIf directive with initial display: none; for popup/dropdown elements
    html = html.replace(/\*ngIf="[^"]*"/g, 'style="display: none;"');

    return html;
  }

  async openPreview() {
    if (!this.isHtmlFile) return;

    const baseName = this.getCleanBaseName(this.file.name);
    const allFiles = await this.fileService.getFiles();

    const sameFolderFiles = allFiles.filter(f => 
      f.folder_id === this.file.folder_id && 
      this.getCleanBaseName(f.name) === baseName &&
      f.id !== this.file.id
    );

    const cssFiles = sameFolderFiles.filter(f => ['css', 'scss', 'less'].includes((f.extension || '').toLowerCase()));
    const jsFiles = sameFolderFiles.filter(f => ['js', 'ts', 'jsx', 'tsx'].includes((f.extension || '').toLowerCase()));

    this.linkedCssNames = cssFiles.map(f => f.name);
    this.linkedJsNames = jsFiles.map(f => f.name);

    const combinedCss = cssFiles.map(f => this.compileScssToCss(f.content || '')).join('\n\n');
    const combinedJs = jsFiles.map(f => f.content || '').join('\n\n');

    const processedHtml = this.cleanAngularTemplateForPreview(this.file.content || '');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #e0e5ec;
            color: #2d3748;
            box-sizing: border-box;
          }
          ${combinedCss}
        </style>
      </head>
      <body>
        ${processedHtml}
        <script>
          document.addEventListener('click', function(e) {
            const trigger = e.target.closest('button, .dropdownTrigger, [class*="trigger"], [onclick]');
            const allMenus = document.querySelectorAll('.dropdownMenu, .dropdown-menu');

            if (trigger) {
              const container = trigger.closest('.dropdownContainer, [class*="container"]') || trigger.parentElement;
              const menu = container ? (container.querySelector('.dropdownMenu, .dropdown-menu') || container.querySelector('div:nth-child(2)')) : null;
              if (menu) {
                const currentDisplay = window.getComputedStyle(menu).display;
                if (currentDisplay === 'none') {
                  menu.style.display = 'block';
                } else {
                  menu.style.display = 'none';
                }
                return;
              }
            }

            // Close when clicking outside or selecting an item
            allMenus.forEach(function(m) {
              m.style.display = 'none';
            });
          });

          try {
            ${combinedJs}
          } catch(e) {
            console.error('Preview Script Error:', e);
          }
        </script>
      </body>
      </html>
    `;

    this.previewSrcDoc = this.sanitizer.bypassSecurityTrustHtml(htmlContent);
    this.isPreviewOpen = true;
  }

  copyAllCode() {
    if (!this.file || !this.file.content) return;
    navigator.clipboard.writeText(this.file.content)
      .then(() => {
        this.dAlert.success('전체 코드가 클립보드에 복사되었습니다.', '복사 완료');
      })
      .catch((err) => {
        console.error(err);
        this.dAlert.error('코드 복사에 실패했습니다.', '오류');
      });
  }

  downloadFile() {
    if (!this.file) return;
    const blob = new Blob([this.file.content || ''], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = this.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    this.dAlert.success(`'${this.file.name}' 파일이 다운로드되었습니다.`, '다운로드 완료');
  }

  goBack() {
    this.onClose.emit();
  }
}

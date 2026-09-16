import { Component, Input, Output, EventEmitter, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FileItem, FileItemService } from '../../core/services/file-item.service';
import { DAlertService } from '../../core/services/d-alert.service';

@Component({
  selector: 'app-code-viewer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './code-viewer.component.html',
  styleUrl: './code-viewer.component.scss'
})
export class CodeViewerComponent {
  @Input({ required: true }) file!: FileItem;
  @Output() onClose = new EventEmitter<void>();

  isPreviewOpen = false;
  previewSrcDoc: SafeHtml | string = '';
  linkedCssNames: string[] = [];
  linkedJsNames: string[] = [];

  leftWidthPercent = 50;
  isResizing = false;

  private dAlert = inject(DAlertService);
  private fileService = inject(FileItemService);
  private sanitizer = inject(DomSanitizer);

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
      case 'html': case 'htm': return 'bx bxl-html5 text-orange';
      case 'css': case 'scss': case 'less': return 'bx bxl-css3 text-blue';
      case 'js': case 'jsx': return 'bx bxl-javascript text-yellow';
      case 'ts': case 'tsx': return 'bx bxl-typescript text-blue';
      case 'py': return 'bx bxl-python text-yellow';
      case 'java': return 'bx bxl-java text-red';
      case 'json': return 'bx bx-code-curly text-green';
      case 'md': return 'bx bxl-markdown text-purple';
      default: return 'bx bx-code-alt text-sub';
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
    
    // Bounds between 20% and 80%
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 16px;
            box-sizing: border-box;
          }
          ${combinedCss}
        </style>
      </head>
      <body>
        ${this.file.content || ''}
        <script>
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

import { Component, inject, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CDropdownComponent } from '../../c-dropdown/c-dropdown.component';

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
import 'prismjs/components/prism-dart';

import { BaseViewerDirective } from '../../../core/base/base-viewer.directive';

@Component({
  selector: 'app-code-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, CDropdownComponent],
  templateUrl: './code-viewer.component.html',
  styleUrl: './code-viewer.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class CodeViewerComponent extends BaseViewerDirective {
  private sanitizer = inject(DomSanitizer);

  highlightedLines: { lineNum: number; html: SafeHtml }[] = [];

  protected onInitViewer(): void {
    this.processHighlightedLines();
  }

  protected onFileChanged(): void {
    this.processHighlightedLines();
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
      case 'dart': return 'dart';
      default: return 'default';
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
      case 'dart': return 'dart';
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

  copyAllCode() {
    if (!this.file || !this.file.content) return;
    navigator.clipboard.writeText(this.file.content)
      .then(() => {
        this.dLoading.showSuccess('전체 코드가 클립보드에 복사되었습니다.');
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
    this.dLoading.showSuccess(`'${this.file.name}' 파일이 다운로드되었습니다.`);
  }
}

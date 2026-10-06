import { Component, Input, Output, EventEmitter, inject, HostListener, OnInit, OnChanges, SimpleChanges, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { FileItem, FileItemService } from '../../../core/services/file-item.service';
import { DAlertService } from '../../../core/services/d-alert.service';
import { DLoadingService } from '../../../core/services/d-loading.service';
import { ChatInputService, AttachedItem } from '../../../core/services/chat-input.service';
import { CDropdownComponent, CDropdownOption } from '../../c-dropdown/c-dropdown.component';

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
  isPreviewOpen = false;
  previewSrcDoc: SafeHtml | string = '';
  linkedCssNames: string[] = [];
  linkedJsNames: string[] = [];

  leftWidthPercent = 50;
  isResizing = false;

  private sanitizer = inject(DomSanitizer);

  highlightedLines: { lineNum: number; html: SafeHtml }[] = [];

  protected onInitViewer(): void {
    this.isPreviewOpen = false;
    this.previewSrcDoc = '';
    this.processHighlightedLines();
  }

  protected onFileChanged(): void {
    this.isPreviewOpen = false;
    this.previewSrcDoc = '';
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

  get isHtmlFile(): boolean {
    const ext = (this.file?.extension || '').toLowerCase();
    return ext === 'html' || ext === 'htm';
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

  private getCleanBaseName(fileName: string): string {
    let name = (fileName || '').toLowerCase();
    const extIndex = name.lastIndexOf('.');
    if (extIndex !== -1) {
      name = name.substring(0, extIndex);
    }
    name = name.replace(/[\.-]component$/, '');
    return name;
  }

  linkedFiles: { name: string; type: string; icon: string; class: string }[] = [];

  private compileScssToCss(scss: string): string {
    if (!scss) return '';
    
    // 1. @use 및 @import 구문 제거
    let css = scss.replace(/@use\s+['"][^'"]+['"]\s*(as\s+[\*\w]+)?;?/g, '');
    css = css.replace(/@import\s+['"][^'"]+['"];?/g, '');

    // 2. 디자인 토큰 및 변수 치환 맵
    const varMap: Record<string, string> = {
      '$z-alert': '1000',
      '$color-primary': '#4a86ff',
      '$color-secondary': '#6B5CE7',
      '$color-success': '#04B014',
      '$color-error': '#DC0000',
      '$color-warn': '#E4AF00',
      '$color-bg': '#eef4fc',
      '$color-surface': '#eef4fc',
      '$color-surface-alt': '#d9e3f0',
      '$color-white': '#FFFFFF',
      '$color-dark': '#17191A',
      '$color-text': '#17191A',
      '$color-text-secondary': '#757B80',
      '$color-sub-text': '#A4ADB2',
      '$alert-light-bg': '#ffffff',
      '$alert-light-border': '#e2e8f0',
      '$alert-light-title': '#1e293b',
      '$alert-light-message': '#475569',
      '$alert-light-input-bg': '#ffffff',
      '$alert-light-input-border': '#cbd5e1',
      '$alert-light-input-text': '#1e293b',
      '$alert-dark-bg': 'rgba(30, 35, 48, 0.95)',
      '$alert-dark-border': 'rgba(255, 255, 255, 0.18)',
      '$alert-dark-title': '#ffffff',
      '$alert-dark-message': '#cbd5e1',
      '$alert-dark-input-bg': 'rgba(20, 24, 34, 0.75)',
      '$alert-dark-input-border': 'rgba(255, 255, 255, 0.18)',
      '$alert-dark-input-text': '#ffffff',
      '$alert-dark-input-placeholder': '#94a3b8',
      '$neu-bg': '#ffffff',
      '$neu-text': '#1e293b',
      '$neu-text-secondary': '#64748b',
      '$neu-shadow-dark': 'rgba(0, 0, 0, 0.04)',
      '$neu-shadow-light': 'transparent',
      '$neu-primary': '#4a86ff',
      '$spacing-2': '2px',
      '$spacing-4': '4px',
      '$spacing-6': '6px',
      '$spacing-8': '8px',
      '$spacing-10': '10px',
      '$spacing-12': '12px',
      '$spacing-14': '14px',
      '$spacing-16': '16px',
      '$spacing-20': '20px',
      '$spacing-24': '24px',
      '$spacing-28': '28px',
      '$spacing-32': '32px',
      '$radius-shallow': '4px',
      '$radius-normal': '8px',
      '$radius-deep': '12px',
      '$radius-circle': '50%'
    };

    for (const [key, val] of Object.entries(varMap)) {
      const escapedKey = key.replace('$', '\\$');
      css = css.replace(new RegExp(escapedKey, 'g'), val);
    }

    // 3. 타이포그래피 mixin 치환
    css = css.replace(/@include\s+typo-title-1;?/g, 'font-size: 24px; font-weight: 700; line-height: 1.4;');
    css = css.replace(/@include\s+typo-title-2;?/g, 'font-size: 20px; font-weight: 700; line-height: 1.4;');
    css = css.replace(/@include\s+typo-title-3;?/g, 'font-size: 18px; font-weight: 700; line-height: 1.4;');
    css = css.replace(/@include\s+typo-subtitle-1;?/g, 'font-size: 18px; font-weight: 600; line-height: 1.5;');
    css = css.replace(/@include\s+typo-subtitle-2;?/g, 'font-size: 16px; font-weight: 600; line-height: 1.5;');
    css = css.replace(/@include\s+typo-body-1;?/g, 'font-size: 18px; font-weight: 400; line-height: 1.6;');
    css = css.replace(/@include\s+typo-body-2;?/g, 'font-size: 16px; font-weight: 400; line-height: 1.6;');
    css = css.replace(/@include\s+typo-body-3;?/g, 'font-size: 14px; font-weight: 400; line-height: 1.6;');
    css = css.replace(/@include\s+typo-caption-1;?/g, 'font-size: 13px; font-weight: 500; line-height: 1.6;');
    css = css.replace(/@include\s+typo-caption-2;?/g, 'font-size: 12px; font-weight: 400; line-height: 1.6;');
    css = css.replace(/@include\s+[\w\-]+(\([^)]*\))?;?/g, '');

    return css;
  }

  private evaluateAngularTemplate(rawHtml: string, contextData: any): string {
    if (!rawHtml) return '';
    let html = rawHtml;

    // 1. ng-container 내 *ngIf 조건 처리 및 태그 벗기기
    html = html.replace(/<ng-container\s+\*ngIf="([^"]*)"\s*>([\s\S]*?)<\/ng-container>/gi, (match, condition, content) => {
      const isMatch = this.evalCondition(condition, contextData);
      return isMatch ? content : '';
    });
    html = html.replace(/<\/?ng-container[^>]*>/gi, '');

    // 2. c-button 컴포넌트 태그를 실제 표준 button 태그로 변환
    html = html.replace(/<c-button\s*([^>]*)>([\s\S]*?)<\/c-button>/gi, (match, attrs, text) => {
      let themeClass = 'btn-primary';
      if (attrs.includes('theme="neutral"') || attrs.includes('theme=\'neutral\'')) {
        themeClass = 'btn-neutral';
      } else if (attrs.includes('theme="error"') || attrs.includes('theme=\'error\'')) {
        themeClass = 'btn-error';
      }
      
      let clickAttr = '';
      const clickMatch = attrs.match(/\(onClick\)="([^"]*)"/i);
      if (clickMatch) {
        clickAttr = `onclick="handlePreviewClick('${clickMatch[1]}')"`;
      }

      return `<button type="button" class="btn ${themeClass}" ${clickAttr}>${text.trim()}</button>`;
    });

    // 3. 개별 요소의 *ngIf 평가
    html = html.replace(/<([\w\-]+)\s+([^>]*)\*ngIf="([^"]*)"([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tagName, preAttrs, condition, postAttrs, innerContent) => {
      const isMatch = this.evalCondition(condition, contextData);
      if (!isMatch) return '';
      return `<${tagName} ${preAttrs} ${postAttrs}>${innerContent}</${tagName}>`;
    });

    // 4. self-closing 또는 단일 태그의 *ngIf 평가 (input, img 등)
    html = html.replace(/<([\w\-]+)\s+([^>]*)\*ngIf="([^"]*)"([^>]*)\/?>/gi, (match, tagName, preAttrs, condition, postAttrs) => {
      const isMatch = this.evalCondition(condition, contextData);
      if (!isMatch) return '';
      return `<${tagName} ${preAttrs} ${postAttrs}>`;
    });

    // 5. [ngClass] 속성 평가 및 클래스 결합
    html = html.replace(/\[ngClass\]="([^"]*)"/gi, (match, expr) => {
      const evaluatedClasses = this.evalNgClass(expr, contextData);
      return `class="${evaluatedClasses}"`;
    });

    // 6. 이벤트 바인딩 (click) -> onclick
    html = html.replace(/\(click\)="([^"]*)"/gi, 'onclick="handlePreviewClick(\'$1\')"');

    // 7. 보간법 {{ expression }} 치환
    html = html.replace(/\{\{\s*([\w\.]+)\s*\}\}/g, (match, path) => {
      const val = this.getValueByPath(contextData, path);
      return val !== undefined && val !== null ? String(val) : '';
    });

    return html;
  }

  private evalCondition(expr: string, ctx: any): boolean {
    if (!expr) return true;
    const cleanExpr = expr.trim();

    if (cleanExpr === 'config.title') return !!(ctx?.config?.title);
    if (cleanExpr === 'config.isPrompt') return !!(ctx?.config?.isPrompt);
    if (cleanExpr === 'animate') return !!(ctx?.animate);

    if (cleanExpr.includes('config.type === \'success\'')) return ctx?.config?.type === 'success';
    if (cleanExpr.includes('config.type === \'warn\'')) return ctx?.config?.type === 'warn';
    if (cleanExpr.includes('config.type === \'error\'')) return ctx?.config?.type === 'error';
    if (cleanExpr.includes('config.type === \'info\'') || cleanExpr.includes('!config.type')) {
      return !ctx?.config?.type || ctx?.config?.type === 'info';
    }

    if (cleanExpr.includes('config.buttonType === \'okCancel\'')) return ctx?.config?.buttonType === 'okCancel';
    if (cleanExpr.includes('config.buttonType === \'yesNo\'')) return ctx?.config?.buttonType === 'yesNo';
    if (cleanExpr.includes('config.buttonType === \'yesOnly\'')) return ctx?.config?.buttonType === 'yesOnly';
    if (cleanExpr.includes('config.buttonType === \'okOnly\'') || cleanExpr.includes('!config.buttonType')) {
      return !ctx?.config?.buttonType || ctx?.config?.buttonType === 'okOnly';
    }

    try {
      const fn = new Function('config', 'animate', 'inputValue', `try { return !!(${cleanExpr}); } catch(e) { return true; }`);
      return fn(ctx.config, ctx.animate, ctx.inputValue);
    } catch (e) {
      return true;
    }
  }

  private evalNgClass(expr: string, ctx: any): string {
    if (!expr) return '';
    const clean = expr.trim();

    if (clean.startsWith('[') && clean.endsWith(']')) {
      const parts = clean.slice(1, -1).split(',').map(p => p.trim());
      const classList: string[] = [];
      for (const part of parts) {
        if (part.includes('config.direction') || part.includes("'center'")) {
          classList.push(ctx?.config?.direction || 'center');
        } else if (part.includes('animate') && part.includes("'active'")) {
          if (ctx?.animate) classList.push('active');
        } else {
          classList.push(part.replace(/['"]/g, ''));
        }
      }
      return classList.filter(Boolean).join(' ');
    }

    if (clean.includes('config.type')) {
      return ctx?.config?.type || 'info';
    }

    return clean.replace(/['"]/g, '');
  }

  private getValueByPath(obj: any, path: string): any {
    if (!obj || !path) return '';
    const parts = path.split('.');
    let cur = obj;
    for (const p of parts) {
      if (cur === undefined || cur === null) return '';
      cur = cur[p];
    }
    return cur;
  }

  async openPreview() {
    if (!this.isHtmlFile) return;

    const allFiles = await this.fileService.getFiles();

    // 1. 동일 폴더 내의 모든 연관 파일 수집 (SCSS, CSS, TS, JS, JSON)
    const sameFolderFiles = allFiles.filter(f => 
      f.folder_id === this.file.folder_id && 
      f.id !== this.file.id
    );

    const cssFiles = sameFolderFiles.filter(f => ['css', 'scss', 'sass', 'less'].includes((f.extension || '').toLowerCase()));
    const jsFiles = sameFolderFiles.filter(f => ['js', 'ts', 'jsx', 'tsx'].includes((f.extension || '').toLowerCase()));
    const jsonFiles = sameFolderFiles.filter(f => (f.extension || '').toLowerCase() === 'json');

    // 2. 상단 연동 파일 배지 구성
    this.linkedFiles = sameFolderFiles.map(f => {
      const ext = (f.extension || '').toLowerCase();
      let icon = 'bx bx-file';
      let badgeClass = 'none-badge';

      if (['css', 'scss', 'sass'].includes(ext)) {
        icon = 'bx bxl-css3';
        badgeClass = 'css-badge';
      } else if (['js', 'jsx'].includes(ext)) {
        icon = 'bx bxl-javascript';
        badgeClass = 'js-badge';
      } else if (['ts', 'tsx'].includes(ext)) {
        icon = 'bx bxl-typescript';
        badgeClass = 'ts-badge';
      } else if (ext === 'json') {
        icon = 'bx bx-data';
        badgeClass = 'json-badge';
      }

      return {
        name: f.name,
        type: ext,
        icon,
        class: badgeClass
      };
    });

    // 3. JSON 데이터 파싱 및 Mock Context 생성
    let contextData: any = {
      config: {
        title: '작업 확인',
        message: '선택하신 작업을 계속 진행하시겠습니까?\n이 동작은 즉시 반영됩니다.',
        type: 'info',
        direction: 'center',
        buttonType: 'okCancel',
        isPrompt: false
      },
      animate: true,
      inputValue: ''
    };

    if (jsonFiles.length > 0) {
      try {
        const parsed = JSON.parse(jsonFiles[0].content || '{}');
        contextData = { ...contextData, ...parsed };
      } catch (e) {
        console.warn('JSON 파싱 오류:', e);
      }
    }

    // 4. 스타일 컴파일 (c-button 스타일 + 폴더 내 SCSS/CSS 스타일 결합)
    const defaultButtonCss = `
      .btn {
        padding: 8px 16px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        min-height: 40px;
        border: none;
        outline: none;
        font-family: inherit;
        border-radius: 12px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        box-sizing: border-box;
      }
      .btn:hover { opacity: 0.88; transform: translateY(-1px); }
      .btn:active { transform: translateY(0); opacity: 0.75; }
      .btn-primary { background: #4a86ff; color: #ffffff; box-shadow: 0 4px 12px rgba(74, 134, 255, 0.35); }
      .btn-neutral { background: #e2e8f0; color: #475569; }
      .btn-error { background: #dc0000; color: #ffffff; box-shadow: 0 4px 12px rgba(220, 0, 0, 0.35); }
      body.dark-theme .btn-neutral { background: rgba(255, 255, 255, 0.12); color: #f1f5f9; }
    `;

    const compiledCss = cssFiles.map(f => this.compileScssToCss(f.content || '')).join('\n\n');
    const combinedJs = jsFiles.map(f => f.content || '').join('\n\n');

    // 5. 템플릿 마크업 렌더링
    const renderedHtml = this.evaluateAngularTemplate(this.file.content || '', contextData);

    // 6. 독립 샌드박스 Iframe 문서 생성 (인터랙션 컨트롤러 포함)
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <link href="https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 24px;
            background: #f1f5f9;
            color: #1e293b;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            transition: background-color 0.3s ease, color 0.3s ease;
          }
          body.dark-theme {
            background: #0f172a;
            color: #f8fafc;
          }

          /* 상단 인터랙티브 제어 툴바 */
          .preview-toolbar {
            position: fixed;
            top: 14px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 2000;
            display: flex;
            align-items: center;
            gap: 6px;
            padding: 6px 12px;
            background: rgba(255, 255, 255, 0.9);
            backdrop-filter: blur(12px);
            border: 1px solid rgba(0, 0, 0, 0.1);
            border-radius: 30px;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
          }
          body.dark-theme .preview-toolbar {
            background: rgba(30, 41, 59, 0.85);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
          }
          .toolbar-btn {
            border: none;
            background: transparent;
            padding: 4px 10px;
            border-radius: 14px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            color: #475569;
            display: inline-flex;
            align-items: center;
            gap: 4px;
            transition: all 0.2s ease;
          }
          body.dark-theme .toolbar-btn { color: #cbd5e1; }
          .toolbar-btn:hover { background: rgba(0, 0, 0, 0.06); color: #0f172a; }
          body.dark-theme .toolbar-btn:hover { background: rgba(255, 255, 255, 0.12); color: #ffffff; }
          .toolbar-btn.active { background: #4a86ff; color: #ffffff !important; }

          ${defaultButtonCss}
          ${compiledCss}
        </style>
      </head>
      <body>
        <!-- 상단 실시간 인터랙션 컨트롤 바 -->
        <div class="preview-toolbar">
          <button class="toolbar-btn" onclick="toggleTheme()" id="themeBtn">
            <i class="bx bx-moon"></i> 테마 전환
          </button>
          <span style="opacity: 0.3;">|</span>
          <button class="toolbar-btn" onclick="setType('info')">Info</button>
          <button class="toolbar-btn" onclick="setType('success')">Success</button>
          <button class="toolbar-btn" onclick="setType('warn')">Warn</button>
          <button class="toolbar-btn" onclick="setType('error')">Error</button>
          <span style="opacity: 0.3;">|</span>
          <button class="toolbar-btn active" onclick="reopenAlert()">
            <i class="bx bx-refresh"></i> 다시 열기
          </button>
        </div>

        <!-- 렌더링된 컴포넌트 마크업 -->
        ${renderedHtml}

        <script>
          // 다크/라이트 테마 토글
          function toggleTheme() {
            document.body.classList.toggle('dark-theme');
          }

          // 타입 실시간 변경 인터랙션
          function setType(type) {
            const iconWrapper = document.querySelector('.iconWrapper');
            if (iconWrapper) {
              iconWrapper.className = 'iconWrapper ' + type;
            }
            reopenAlert();
          }

          // 클릭 인터랙션 핸들러
          function handlePreviewClick(action) {
            const overlay = document.querySelector('.alertOverlay');
            const box = document.querySelector('.alertBox');
            if (overlay && box) {
              box.classList.remove('active');
              setTimeout(function() {
                overlay.classList.remove('active');
              }, 150);
            }
          }

          // 알림창 다시 열기
          function reopenAlert() {
            const overlay = document.querySelector('.alertOverlay');
            const box = document.querySelector('.alertBox');
            if (overlay && box) {
              overlay.classList.add('active');
              setTimeout(function() {
                box.classList.add('active');
              }, 50);
            }
          }

          try {
            ${combinedJs}
          } catch(e) {
            console.error('컴포넌트 스크립트 실행 오류:', e);
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

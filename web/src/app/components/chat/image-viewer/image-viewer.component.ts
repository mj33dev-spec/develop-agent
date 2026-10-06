import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BaseViewerDirective } from '../../../core/base/base-viewer.directive';
import { CDropdownComponent } from '../../c-dropdown/c-dropdown.component';

/**
 * 이미지 전용 뷰어 컴포넌트
 */
@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule, CDropdownComponent],
  templateUrl: './image-viewer.component.html',
  styleUrl: './image-viewer.component.scss'
})
export class ImageViewerComponent extends BaseViewerDirective {
  zoomLevel: number = 100;
  imageDimensions: { width: number; height: number } | null = null;
  imageLoadError: boolean = false;

  protected onInitViewer(): void {
    this.resetZoom();
  }

  protected onFileChanged(): void {
    this.resetZoom();
    this.imageDimensions = null;
    this.imageLoadError = false;
  }

  /** 이미지 URL 또는 Data URL 반환 */
  get imageSrc(): string {
    if (!this.file || !this.file.content) return '';
    const content = this.file.content.trim();
    if (content.startsWith('data:image/') || content.startsWith('http://') || content.startsWith('https://') || content.startsWith('blob:')) {
      return content;
    }
    const ext = (this.file.extension || 'png').toLowerCase();
    const mime = ext === 'svg' ? 'image/svg+xml' : (ext === 'jpg' ? 'image/jpeg' : `image/${ext}`);
    
    // Base64 문자열인지 확인 후, 텍스트로 읽힌 바이너리인 경우 Base64 인코딩 시도
    const cleanContent = content.replace(/\s+/g, '');
    const isBase64 = /^[A-Za-z0-9+/=]+$/.test(cleanContent);
    if (isBase64) {
      return `data:${mime};base64,${cleanContent}`;
    }

    try {
      // 텍스트로 읽혀 저장된 바이너리 데이터를 Base64로 복원 시도
      let binary = '';
      const len = content.length;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(content.charCodeAt(i) & 0xff);
      }
      return `data:${mime};base64,${btoa(binary)}`;
    } catch {
      return `data:${mime};base64,${cleanContent}`;
    }
  }

  onImageLoaded(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img) {
      this.imageDimensions = {
        width: img.naturalWidth,
        height: img.naturalHeight
      };
      this.imageLoadError = false;
    }
  }

  onImageError() {
    this.imageLoadError = true;
  }

  zoomIn() {
    if (this.zoomLevel < 300) {
      this.zoomLevel += 25;
    }
  }

  zoomOut() {
    if (this.zoomLevel > 25) {
      this.zoomLevel -= 25;
    }
  }

  resetZoom() {
    this.zoomLevel = 100;
  }

  /** 이미지 다운로드 */
  downloadImage() {
    if (!this.file) return;
    const link = document.createElement('a');
    link.href = this.imageSrc;
    link.download = this.file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    this.dLoading.showSuccess(`'${this.file.name}' 이미지가 다운로드되었습니다.`);
  }

  /** 이미지 링크 / 데이터 클립보드 복사 */
  copyImage() {
    if (!this.file || !this.file.content) return;
    
    // DataURL에서 blob 변환 후 클립보드 이미지 복사 시도
    if (this.imageSrc.startsWith('data:image/')) {
      fetch(this.imageSrc)
        .then(res => res.blob())
        .then(blob => {
          if (navigator.clipboard && (window as any).ClipboardItem) {
            const item = new (window as any).ClipboardItem({ [blob.type]: blob });
            navigator.clipboard.write([item]).then(() => {
              this.dLoading.showSuccess('이미지가 클립보드에 복사되었습니다.');
            }).catch(() => {
              this.fallbackCopyText();
            });
          } else {
            this.fallbackCopyText();
          }
        })
        .catch(() => {
          this.fallbackCopyText();
        });
    } else {
      this.fallbackCopyText();
    }
  }

  private fallbackCopyText() {
    navigator.clipboard.writeText(this.file.content || '')
      .then(() => {
        this.dLoading.showSuccess('이미지 데이터가 클립보드에 복사되었습니다.');
      })
      .catch(() => {
        this.dAlert.error('클립보드 복사에 실패했습니다.', '오류');
      });
  }
}

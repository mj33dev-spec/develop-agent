import { Injectable, inject } from '@angular/core';
import { CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { DAlertService } from './d-alert.service';

@Injectable({
  providedIn: 'root'
})
export class ChatInputService {
  private dAlert = inject(DAlertService);

  // + 버튼 메뉴 옵션 생성
  getAddMenuOptions(
    onImageSelected: (dataUrl: string, fileName: string) => void,
    onCodeSnippetSelected: (codeSnippet: string) => void
  ): CDropdownOption[] {
    return [
      {
        label: '사진 첨부',
        icon: 'bx bx-image-add',
        onClick: () => this.selectImageFile(onImageSelected)
      },
      {
        label: 'HTML 코드 조각',
        icon: 'bx bxl-html5',
        onClick: () => {
          const snippet = '```html\n<!-- 여기에 HTML 코드를 입력하세요 -->\n<div class="container">\n  \n</div>\n```\n';
          onCodeSnippetSelected(snippet);
        }
      },
      {
        label: 'CSS 코드 조각',
        icon: 'bx bxl-css3',
        onClick: () => {
          const snippet = '```css\n/* 여기에 CSS 코드를 입력하세요 */\n.container {\n  display: flex;\n}\n```\n';
          onCodeSnippetSelected(snippet);
        }
      },
      {
        label: 'JavaScript 코드 조각',
        icon: 'bx bxl-javascript',
        onClick: () => {
          const snippet = '```javascript\n// 여기에 JS 코드를 입력하세요\nfunction handleAction() {\n  console.log("Hello World");\n}\n```\n';
          onCodeSnippetSelected(snippet);
        }
      }
    ];
  }

  // 숨겨진 파일 인풋을 트리거하여 사진 첨부
  private selectImageFile(onImageSelected: (dataUrl: string, fileName: string) => void) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        this.dAlert.warn('이미지 파일만 첨부할 수 있습니다.', '알림');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        onImageSelected(dataUrl, file.name);
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
}

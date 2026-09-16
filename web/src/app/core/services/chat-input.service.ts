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
        label: '이미지 첨부',
        icon: 'bx bx-image-add',
        onClick: () => this.selectImageFile(onImageSelected)
      },
    ];
  }

  // 숨겨진 파일 인풋을 트리거하여 이미지 첨부
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

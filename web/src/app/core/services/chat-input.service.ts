import { Injectable, inject } from '@angular/core';
import { CDropdownOption } from '../../components/c-dropdown/c-dropdown.component';
import { DAlertService } from './d-alert.service';
import { FileItemService, FileItem } from './file-item.service';
import { RoomService, ChatRoomRecord } from './room.service';

export interface ChatInputContext {
  folderId?: string | null;
  currentRoomId?: string;
  currentFileId?: string;
}

export interface AttachedItem {
  id: string;
  type: 'file' | 'room';
  name: string;
  icon?: string;
  extension?: string;
  content?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ChatInputService {
  private dAlert = inject(DAlertService);
  private fileService = inject(FileItemService);
  private roomService = inject(RoomService);

  // + 버튼 메뉴 옵션 생성 (동적 파일/채팅방 링크 포함)
  async loadAddMenuOptions(
    context: ChatInputContext,
    onInsertText: (text: string) => void,
    onImageSelected: (dataUrl: string, fileName: string) => void,
    onSelectItem?: (item: AttachedItem) => void
  ): Promise<CDropdownOption[]> {
    const options: CDropdownOption[] = [
      {
        label: '이미지 첨부',
        icon: 'bx bx-image-add',
        onClick: () => this.selectImageFile(onImageSelected)
      }
    ];

    try {
      const [allFiles, allRooms] = await Promise.all([
        this.fileService.getFiles(),
        this.roomService.getRooms()
      ]);

      const targetFolderId = context.folderId;

      // 폴더에 속해있지 않은 경우(루트 상태)에는 다른 파일/채팅방 링크 옵션을 제공하지 않음
      if (!targetFolderId) {
        return options;
      }

      // 같은 폴더에 속한 파일들
      const sameFolderFiles = allFiles.filter(f => 
        f.folder_id === targetFolderId &&
        f.id !== context.currentFileId
      );

      // 같은 폴더에 속한 채팅방들
      const sameFolderRooms = allRooms.filter(r => 
        r.folder_id === targetFolderId &&
        r.id !== context.currentRoomId
      );

      if (sameFolderFiles.length > 0 || sameFolderRooms.length > 0) {
        options.push({ type: 'divider' });

        // 1. 같은 폴더 내 파일들 추가
        for (const file of sameFolderFiles) {
          const icon = this.getFileIcon(file.extension);
          options.push({
            label: `${file.name}`,
            icon,
            onClick: () => {
              const ext = file.extension ? file.extension.toLowerCase() : '';
              const codeBlock = `\n[첨부 파일: ${file.name}]\n\`\`\`${ext}\n${file.content || ''}\n\`\`\`\n`;
              if (onSelectItem) {
                onSelectItem({
                  id: file.id,
                  type: 'file',
                  name: file.name,
                  icon,
                  extension: ext,
                  content: codeBlock
                });
              } else {
                onInsertText(codeBlock);
              }
            }
          });
        }

        // 2. 같은 폴더 내 채팅방들 추가
        for (const room of sameFolderRooms) {
          const icon = 'bx bx-message-square-detail text-blue';
          options.push({
            label: `${room.title}`,
            icon,
            onClick: async () => {
              const msgs = await this.roomService.getMessages(room.id);
              let roomContext = `\n[참조 채팅방: ${room.title}]\n`;
              if (msgs && msgs.length > 0) {
                const formattedMsgs = msgs
                  .filter(m => !m.isLoading && m.text)
                  .map(m => `${m.isUser ? '사용자' : 'AI'}: ${m.text}`)
                  .join('\n');
                roomContext += `${formattedMsgs}\n`;
              } else {
                roomContext += `(대화 내역 없음)\n`;
              }

              if (onSelectItem) {
                onSelectItem({
                  id: room.id,
                  type: 'room',
                  name: room.title,
                  icon,
                  content: roomContext
                });
              } else {
                onInsertText(roomContext);
              }
            }
          });
        }
      }
    } catch (e) {
      console.warn('첨부 메뉴 옵션 로드 실패:', e);
    }

    return options;
  }

  // 파일 확장자별 아이콘 매핑
  getFileIcon(ext: string): string {
    const cleanExt = (ext || '').toLowerCase();
    switch (cleanExt) {
      case 'html': case 'htm': return 'bx bxl-html5 icon-html';
      case 'css': return 'bx bxl-css3 icon-css';
      case 'scss': case 'sass': return 'bx bxl-sass icon-scss';
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

  // 기존 하위 호환용 getAddMenuOptions
  getAddMenuOptions(
    onImageSelected: (dataUrl: string, fileName: string) => void,
    onCodeSnippetSelected?: (codeSnippet: string) => void
  ): CDropdownOption[] {
    return [
      {
        label: '이미지 첨부',
        icon: 'bx bx-image-add',
        onClick: () => this.selectImageFile(onImageSelected)
      }
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

import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

/**
 * 소스 코드 파일 아이템 인터페이스
 */
export interface FileItem {
  id: string;
  user_id?: string;
  name: string;
  extension: string;
  content: string;
  folder_id: string | null;
  order_index: number;
  created_at: string;
  size: number;
}

@Injectable({
  providedIn: 'root'
})
export class FileItemService {
  private supabase = inject(SupabaseService).client;
  private localKey = 'local_file_items';

  /** 로컬 스토리지에서 파일 목록 조회 */
  private getLocalFiles(): FileItem[] {
    try {
      const data = localStorage.getItem(this.localKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /** 로컬 스토리지에 파일 목록 저장 */
  private saveLocalFiles(files: FileItem[]): void {
    try {
      localStorage.setItem(this.localKey, JSON.stringify(files));
    } catch {}
  }

  /** 파일 전체 목록 조회 (Supabase + 로컬 폴백) */
  async getFiles(): Promise<FileItem[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return this.getLocalFiles();

      const { data, error } = await this.supabase
        .from('file_items')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      if (error) {
        console.warn('Supabase file_items 테이블 조회 오류, 로컬 폴백:', error.message);
        return this.getLocalFiles();
      }
      return data || [];
    } catch (e) {
      return this.getLocalFiles();
    }
  }

  /** 새 파일 생성 */
  async createFile(
    name: string,
    content: string,
    extension: string,
    folderId: string | null = null,
    size: number = 0,
    orderIndex: number = 0
  ): Promise<FileItem> {
    const { data: { user } } = await this.supabase.auth.getUser();
    const newFileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    if (user) {
      try {
        const { data, error } = await this.supabase
          .from('file_items')
          .insert([{
            id: newFileId,
            user_id: user.id,
            name,
            extension,
            content,
            folder_id: folderId,
            order_index: orderIndex,
            size
          }])
          .select()
          .single();

        if (!error && data) return data;
      } catch (e) {}
    }

    /* 로컬 폴백 생성 */
    const newFile: FileItem = {
      id: newFileId,
      user_id: user?.id || 'local_user',
      name,
      extension,
      content,
      folder_id: folderId,
      order_index: orderIndex,
      size,
      created_at: new Date().toISOString()
    };

    const localFiles = this.getLocalFiles();
    localFiles.push(newFile);
    this.saveLocalFiles(localFiles);
    return newFile;
  }

  /** 파일 수정 */
  async updateFile(id: string, updates: Partial<FileItem>): Promise<FileItem> {
    try {
      const { data, error } = await this.supabase
        .from('file_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {}

    const localFiles = this.getLocalFiles();
    const index = localFiles.findIndex(f => f.id === id);
    if (index !== -1) {
      localFiles[index] = { ...localFiles[index], ...updates };
      this.saveLocalFiles(localFiles);
      return localFiles[index];
    }
    throw new Error('파일을 찾을 수 없습니다.');
  }

  /** 파일 삭제 */
  async deleteFile(id: string): Promise<void> {
    try {
      await this.supabase
        .from('file_items')
        .delete()
        .eq('id', id);
    } catch (e) {}

    const localFiles = this.getLocalFiles().filter(f => f.id !== id);
    this.saveLocalFiles(localFiles);
  }

  /** 파일 위치 및 순서 일괄 업데이트 */
  async updateFileOrders(updates: { id: string; folder_id: string | null; order_index: number }[]): Promise<void> {
    const localFiles = this.getLocalFiles();
    for (const u of updates) {
      try {
        await this.supabase
          .from('file_items')
          .update({
            folder_id: u.folder_id,
            order_index: u.order_index
          })
          .eq('id', u.id);
      } catch (e) {}

      const idx = localFiles.findIndex(f => f.id === u.id);
      if (idx !== -1) {
        localFiles[idx].folder_id = u.folder_id;
        localFiles[idx].order_index = u.order_index;
      }
    }
    this.saveLocalFiles(localFiles);
  }

  /** 모든 파일 삭제 */
  async deleteAllFiles(): Promise<void> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (user) {
        await this.supabase
          .from('file_items')
          .delete()
          .eq('user_id', user.id);
      }
    } catch (e) {}

    localStorage.removeItem(this.localKey);
  }
}

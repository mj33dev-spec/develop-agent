import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface FileItem {
  id: string;
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
  private readonly STORAGE_KEY = 'develop_agent_file_items';

  // --- LocalStorage Fallback Helpers ---
  private getLocalFiles(): FileItem[] {
    const data = localStorage.getItem(this.STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveLocalFiles(files: FileItem[]): void {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(files));
  }

  // --- File CRUD Operations ---
  async getFiles(): Promise<FileItem[]> {
    try {
      const { data, error } = await this.supabase
        .from('file_items')
        .select('*')
        .order('order_index', { ascending: true });

      if (!error && data) {
        this.saveLocalFiles(data);
        return data;
      }
    } catch (e) {
      console.warn('Supabase에서 파일 목록을 불러오지 못함, 로컬 스토리지 사용:', e);
    }
    return this.getLocalFiles();
  }

  async createFile(
    name: string,
    content: string,
    extension: string,
    folderId: string | null = null,
    size: number = 0,
    orderIndex: number = 0
  ): Promise<FileItem> {
    const newFile: FileItem = {
      id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      name,
      extension,
      content,
      folder_id: folderId,
      order_index: orderIndex,
      created_at: new Date().toISOString(),
      size
    };

    try {
      const { data, error } = await this.supabase
        .from('file_items')
        .insert([{
          id: newFile.id,
          name: newFile.name,
          extension: newFile.extension,
          content: newFile.content,
          folder_id: newFile.folder_id,
          order_index: newFile.order_index,
          size: newFile.size
        }])
        .select()
        .single();

      if (!error && data) {
        const files = this.getLocalFiles();
        files.push(data);
        this.saveLocalFiles(files);
        return data;
      }
    } catch (e) {
      console.warn('Supabase 파일 생성 실패, 로컬 저장소에 저장:', e);
    }

    const files = this.getLocalFiles();
    files.push(newFile);
    this.saveLocalFiles(files);
    return newFile;
  }

  async updateFile(id: string, updates: Partial<FileItem>): Promise<FileItem> {
    try {
      const { data, error } = await this.supabase
        .from('file_items')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        const files = this.getLocalFiles().map(f => f.id === id ? { ...f, ...data } : f);
        this.saveLocalFiles(files);
        return data;
      }
    } catch (e) {
      console.warn('Supabase 파일 업데이트 실패:', e);
    }

    const files = this.getLocalFiles();
    const index = files.findIndex(f => f.id === id);
    if (index === -1) throw new Error('파일을 찾을 수 없습니다.');
    files[index] = { ...files[index], ...updates };
    this.saveLocalFiles(files);
    return files[index];
  }

  async deleteFile(id: string): Promise<void> {
    try {
      await this.supabase.from('file_items').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase 파일 삭제 실패:', e);
    }

    const files = this.getLocalFiles().filter(f => f.id !== id);
    this.saveLocalFiles(files);
  }

  async updateFileOrders(updates: { id: string; folder_id: string | null; order_index: number }[]): Promise<void> {
    const files = this.getLocalFiles();
    updates.forEach(u => {
      const file = files.find(f => f.id === u.id);
      if (file) {
        file.folder_id = u.folder_id;
        file.order_index = u.order_index;
      }
    });
    this.saveLocalFiles(files);

    try {
      for (const u of updates) {
        await this.supabase.from('file_items').update({
          folder_id: u.folder_id,
          order_index: u.order_index
        }).eq('id', u.id);
      }
    } catch (e) {
      console.warn('Supabase 파일 순서 업데이트 실패:', e);
    }
  }
}

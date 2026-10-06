import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

/**
 * 사이드바 폴더 데이터 인터페이스
 */
export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  created_at: string;
  // UI 상태 변수
  isExpanded?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);
  private localKey = 'local_folders';

  /** 로컬 스토리지에서 폴더 목록 조회 */
  private getLocalFolders(): Folder[] {
    try {
      const data = localStorage.getItem(this.localKey);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /** 로컬 스토리지에 폴더 목록 저장 */
  private saveLocalFolders(folders: Folder[]): void {
    try {
      localStorage.setItem(this.localKey, JSON.stringify(folders));
    } catch {}
  }

  /** 전체 폴더 목록 조회 (Supabase + 로컬 폴백) */
  async getFolders(): Promise<Folder[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return this.getLocalFolders();

      const { data, error } = await this.supabase
        .from('folders')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      if (error) {
        console.warn('Supabase 폴더 조회 실패, 로컬 데이터 폴백:', error);
        return this.getLocalFolders();
      }
      return data || [];
    } catch (e) {
      return this.getLocalFolders();
    }
  }

  /** 새 폴더 생성 */
  async createFolder(name: string, parentId: string | null = null, orderIndex: number = 0): Promise<Folder> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user) {
      try {
        const { data, error } = await this.supabase
          .from('folders')
          .insert({
            user_id: user.id,
            name,
            parent_id: parentId,
            order_index: orderIndex
          })
          .select()
          .single();

        if (!error && data) {
          return data;
        }
      } catch (e) {}
    }

    /* 로컬 폴백 생성 */
    const newFolder: Folder = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      user_id: user?.id || 'local_user',
      name,
      parent_id: parentId,
      order_index: orderIndex,
      created_at: new Date().toISOString()
    };

    const localFolders = this.getLocalFolders();
    localFolders.push(newFolder);
    this.saveLocalFolders(localFolders);
    return newFolder;
  }

  /** 폴더 정보 수정 */
  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    try {
      const { data, error } = await this.supabase
        .from('folders')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {}

    const localFolders = this.getLocalFolders();
    const index = localFolders.findIndex(f => f.id === id);
    if (index !== -1) {
      localFolders[index] = { ...localFolders[index], ...updates };
      this.saveLocalFolders(localFolders);
      return localFolders[index];
    }
    throw new Error('폴더를 찾을 수 없습니다.');
  }

  /** 폴더 삭제 */
  async deleteFolder(id: string): Promise<void> {
    try {
      await this.supabase
        .from('folders')
        .delete()
        .eq('id', id);
    } catch (e) {}

    const localFolders = this.getLocalFolders().filter(f => f.id !== id);
    this.saveLocalFolders(localFolders);
  }

  /** 폴더 위치 및 순서 일괄 업데이트 */
  async updateFolderOrders(updates: { id: string, parent_id: string | null, order_index: number }[]): Promise<void> {
    const localFolders = this.getLocalFolders();
    for (const update of updates) {
      try {
        await this.supabase
          .from('folders')
          .update({ parent_id: update.parent_id, order_index: update.order_index })
          .eq('id', update.id);
      } catch (e) {}

      const idx = localFolders.findIndex(f => f.id === update.id);
      if (idx !== -1) {
        localFolders[idx].parent_id = update.parent_id;
        localFolders[idx].order_index = update.order_index;
      }
    }
    this.saveLocalFolders(localFolders);
  }
}

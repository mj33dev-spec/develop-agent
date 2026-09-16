import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

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

  // --- Pure Supabase File CRUD Operations ---
  async getFiles(): Promise<FileItem[]> {
    try {
      const { data: { user } } = await this.supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await this.supabase
        .from('file_items')
        .select('*')
        .eq('user_id', user.id)
        .order('order_index', { ascending: true });

      if (error) {
        console.warn('Supabase file_items 테이블 조회 오류 (테이블 미생성 가능성):', error.message);
        return [];
      }
      return data || [];
    } catch (e) {
      console.warn('file_items 조회 예외:', e);
      return [];
    }
  }

  async createFile(
    name: string,
    content: string,
    extension: string,
    folderId: string | null = null,
    size: number = 0,
    orderIndex: number = 0
  ): Promise<FileItem> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('로그인이 필요합니다.');

    const newFileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

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

    if (error) throw error;
    return data;
  }

  async updateFile(id: string, updates: Partial<FileItem>): Promise<FileItem> {
    const { data, error } = await this.supabase
      .from('file_items')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteFile(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('file_items')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateFileOrders(updates: { id: string; folder_id: string | null; order_index: number }[]): Promise<void> {
    for (const u of updates) {
      const { error } = await this.supabase
        .from('file_items')
        .update({
          folder_id: u.folder_id,
          order_index: u.order_index
        })
        .eq('id', u.id);

      if (error) throw error;
    }
  }
}

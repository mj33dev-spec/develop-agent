import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface Folder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  order_index: number;
  created_at: string;
  // UI state
  isExpanded?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FolderService {
  private supabase = inject(SupabaseService).client;
  private authService = inject(AuthService);

  async getFolders(): Promise<Folder[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('folders')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createFolder(name: string, parentId: string | null = null, orderIndex: number = 0): Promise<Folder> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not logged in');

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

    if (error) throw error;
    return data;
  }

  async updateFolder(id: string, updates: Partial<Folder>): Promise<Folder> {
    const { data, error } = await this.supabase
      .from('folders')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteFolder(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('folders')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateFolderOrders(updates: { id: string, parent_id: string | null, order_index: number }[]): Promise<void> {
    // Supabase JS doesn't support bulk update easily without RPC, 
    // so we'll do it sequentially for now since it's a small app
    for (const update of updates) {
      await this.supabase
        .from('folders')
        .update({ parent_id: update.parent_id, order_index: update.order_index })
        .eq('id', update.id);
    }
  }
}

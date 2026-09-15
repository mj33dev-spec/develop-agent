import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';

export interface ChatRoomRecord {
  id: string;
  user_id: string;
  title: string;
  folder_id: string | null;
  provider: string | null;
  order_index: number;
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private supabase = inject(SupabaseService).client;

  async getRooms(): Promise<ChatRoomRecord[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await this.supabase
      .from('chat_rooms')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async createRoom(title: string, provider: string, folderId: string | null = null, orderIndex: number = 0): Promise<ChatRoomRecord> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) throw new Error('User not logged in');

    const { data, error } = await this.supabase
      .from('chat_rooms')
      .insert({
        user_id: user.id,
        title,
        folder_id: folderId,
        provider,
        order_index: orderIndex
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateRoom(id: string, updates: Partial<ChatRoomRecord>): Promise<ChatRoomRecord> {
    const { data, error } = await this.supabase
      .from('chat_rooms')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteRoom(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('chat_rooms')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async updateRoomOrders(updates: { id: string, folder_id: string | null, order_index: number }[]): Promise<void> {
    for (const update of updates) {
      await this.supabase
        .from('chat_rooms')
        .update({ folder_id: update.folder_id, order_index: update.order_index })
        .eq('id', update.id);
    }
  }
}

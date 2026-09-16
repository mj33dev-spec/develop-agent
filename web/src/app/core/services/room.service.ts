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

export interface ChatMessageRecord {
  id?: string;
  room_id: string;
  text: string;
  is_user: boolean;
  created_at?: string;
  timestamp?: Date;
  processed?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class RoomService {
  private supabase = inject(SupabaseService).client;

  async getRooms(): Promise<ChatRoomRecord[]> {
    const { data: { user } } = await this.supabase.auth.getUser();
    if (!user) return this.getLocalRooms();

    const { data, error } = await this.supabase
      .from('rooms')
      .select('*')
      .eq('user_id', user.id)
      .order('order_index', { ascending: true });

    if (error) {
      console.warn('Supabase fetch failed, fallback to local rooms:', error);
      return this.getLocalRooms();
    }
    return data || [];
  }

  async createRoom(title: string, provider: string, folderId: string | null = null, orderIndex: number = 0): Promise<ChatRoomRecord> {
    const { data: { user } } = await this.supabase.auth.getUser();
    
    if (user) {
      const { data, error } = await this.supabase
        .from('rooms')
        .insert({
          user_id: user.id,
          title,
          folder_id: folderId,
          provider,
          order_index: orderIndex
        })
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    }

    // Supabase 미작동 또는 비로그인 시 로컬 폴백 생성
    const newRoom: ChatRoomRecord = {
      id: 'room_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      user_id: user?.id || 'local_user',
      title,
      folder_id: folderId,
      provider,
      order_index: orderIndex,
      created_at: new Date().toISOString()
    };
    
    const localRooms = this.getLocalRooms();
    localRooms.push(newRoom);
    this.saveLocalRooms(localRooms);
    return newRoom;
  }

  async updateRoom(id: string, updates: Partial<ChatRoomRecord>): Promise<ChatRoomRecord> {
    try {
      const { data, error } = await this.supabase
        .from('rooms')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) return data;
    } catch (e) {}

    const localRooms = this.getLocalRooms();
    const index = localRooms.findIndex(r => r.id === id);
    if (index !== -1) {
      localRooms[index] = { ...localRooms[index], ...updates };
      this.saveLocalRooms(localRooms);
      return localRooms[index];
    }
    throw new Error('Room not found');
  }

  async deleteRoom(id: string): Promise<void> {
    try {
      await this.supabase.from('chat_rooms').delete().eq('id', id);
    } catch (e) {}
    
    const localRooms = this.getLocalRooms().filter(r => r.id !== id);
    this.saveLocalRooms(localRooms);
    localStorage.removeItem(`chat_messages_${id}`);
  }

  async updateRoomOrders(updates: { id: string, folder_id: string | null, order_index: number }[]): Promise<void> {
    for (const update of updates) {
      try {
        await this.supabase
          .from('rooms')
          .update({ folder_id: update.folder_id, order_index: update.order_index })
          .eq('id', update.id);
      } catch (e) {}
    }
  }

  // --- Message Persistence (Supabase + localStorage Fallback) ---
  async getMessages(roomId: string): Promise<any[]> {
    let dbMessages: any[] = [];
    try {
      const { data, error } = await this.supabase
        .from('chat_messages')
        .select('*')
        .eq('room_id', roomId)
        .order('created_at', { ascending: true });

      if (!error && data && data.length > 0) {
        dbMessages = data.map(m => ({
          text: m.text,
          isUser: m.is_user,
          timestamp: m.created_at ? new Date(m.created_at) : new Date(),
          processed: true,
          savedInDb: true
        }));
        // Update LocalStorage cache with DB messages
        const localKey = `chat_messages_${roomId}`;
        localStorage.setItem(localKey, JSON.stringify(dbMessages));
        return dbMessages;
      }
    } catch (e) {}

    // LocalStorage Fallback if DB returns empty or errors out
    const localKey = `chat_messages_${roomId}`;
    const raw = localStorage.getItem(localKey);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((m: any) => ({
            ...m,
            timestamp: m.timestamp ? new Date(m.timestamp) : new Date()
          }));
        }
      } catch (e) {}
    }
    return [];
  }

  async saveMessages(roomId: string, messages: any[]): Promise<void> {
    if (!roomId || !messages) return;

    // 1. Save to LocalStorage immediately
    const localKey = `chat_messages_${roomId}`;
    localStorage.setItem(localKey, JSON.stringify(messages));

    // 2. Save all unsaved messages to Supabase DB
    const unsaved = messages.filter(m => !m.isLoading && !m.savedInDb && m.text && m.text.trim() !== '');
    if (unsaved.length === 0) return;

    try {
      const recordsToInsert = unsaved.map(m => ({
        room_id: roomId,
        text: m.text,
        is_user: m.isUser,
        created_at: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()
      }));

      const { data, error } = await this.supabase
        .from('chat_messages')
        .insert(recordsToInsert)
        .select();

      if (!error && data) {
        unsaved.forEach(m => m.savedInDb = true);
        localStorage.setItem(localKey, JSON.stringify(messages));
      } else if (error) {
        console.warn('Supabase chat_messages insert failed, kept in localStorage:', error);
      }
    } catch (e) {
      console.warn('Supabase chat_messages exception:', e);
    }
  }

  private getLocalRooms(): ChatRoomRecord[] {
    const raw = localStorage.getItem('local_chat_rooms');
    return raw ? JSON.parse(raw) : [];
  }

  private saveLocalRooms(rooms: ChatRoomRecord[]): void {
    localStorage.setItem('local_chat_rooms', JSON.stringify(rooms));
  }
}

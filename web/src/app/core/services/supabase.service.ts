import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bznbbefithulaeygelax.supabase.co';
const SUPABASE_KEY = 'sb_publishable_O_rZg-6Z8-36WiNaHQzQRQ_JP20poc4';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  public client: SupabaseClient;

  constructor() {
    this.client = createClient(SUPABASE_URL, SUPABASE_KEY);
  }
}

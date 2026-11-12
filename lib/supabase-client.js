'use client';
import {createClient} from '@supabase/supabase-js';
import {createOfficeAuthStorage} from './supabase-office-storage.mjs';
let client;
export function getClient(){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL;
 const key=process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
 if(!url||!key)return null;
 return client??(client=createClient(url,key,{auth:{persistSession:true,autoRefreshToken:true,storage:createOfficeAuthStorage()}}));
}

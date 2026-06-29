import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://ewpgwmmzdicphivzfmce.supabase.co";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImV3cGd3bW16ZGljcGhpdnpmbWNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI3NDE2NzcsImV4cCI6MjA5ODMxNzY3N30.c4pikwwP8QRX6FMCC8nbu_Hg7TSK3oD88NfOnKPUJeI";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "standcontrol-auth",
  },
});

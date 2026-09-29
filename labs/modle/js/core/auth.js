import { supabase } from "./supabase.js";

export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: error.message };
  return { user: data.user, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return error ? error.message : null;
}

export async function getUser() {
  const { data } = await supabase.auth.getUser();
  return data.user || null;
}

export function onAuthChange(callback) {
  supabase.auth.onAuthStateChange(function (_event, session) {
    callback(session ? session.user : null);
  });
}

import { supabase } from "./supabase.js";
import { getUser } from "./auth.js";
import { store } from "./store.js";

const FIELDS = ["xp", "level", "streak", "last_played", "badges", "mastered"];

function merge(local, remote) {
  if (!remote) return local;
  const out = Object.assign({}, local);
  out.xp = Math.max(local.xp || 0, remote.xp || 0);
  out.level = Math.max(local.level || 1, remote.level || 1);
  out.streak = Math.max(local.streak || 0, remote.streak || 0);
  out.last_played = [local.last_played, remote.last_played].filter(Boolean).sort().pop() || null;
  out.badges = Array.from(new Set([].concat(local.badges || [], remote.badges || [])));
  out.mastered = Array.from(new Set([].concat(local.mastered || [], remote.mastered || [])));
  return out;
}

function pick(data) {
  const out = {};
  FIELDS.forEach(function (f) {
    if (data[f] !== undefined) out[f] = data[f];
  });
  return out;
}

export async function pullProfile() {
  const user = await getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(FIELDS.join(","))
    .eq("id", user.id)
    .single();

  if (error) {
    console.warn("profile pull failed:", error.message);
    return null;
  }

  const merged = merge(store.read(), data);
  store.write(merged);
  return merged;
}

export async function pushProfile() {
  const user = await getUser();
  if (!user) return false;

  const payload = pick(store.read());
  payload.updated_at = new Date().toISOString();

  const { error } = await supabase
    .from("profiles")
    .update(payload)
    .eq("id", user.id);

  if (error) {
    console.warn("profile push failed:", error.message);
    return false;
  }
  return true;
}

let timer = null;
export function schedulePush(delay) {
  clearTimeout(timer);
  timer = setTimeout(pushProfile, delay || 3000);
}

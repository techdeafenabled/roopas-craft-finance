"use client";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { supabase } from "./supabase";
import { generateId } from "./format";
import type { AppSettings } from "./types";

const SALT_ROUNDS = 12;
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 60 * 1000; // 30 minutes
const ATTEMPTS_KEY = "rcj_pin_attempts";
const LOCKOUT_KEY = "rcj_pin_lockout";

interface AttemptsData {
  count: number;
  lastAttempt: number;
}

export function getLockoutStatus(): { locked: boolean; remainingMs: number } {
  if (typeof window === "undefined") return { locked: false, remainingMs: 0 };
  const lockoutStr = sessionStorage.getItem(LOCKOUT_KEY);
  if (!lockoutStr) return { locked: false, remainingMs: 0 };
  const lockoutTime = parseInt(lockoutStr, 10);
  const remaining = lockoutTime + LOCKOUT_DURATION_MS - Date.now();
  if (remaining > 0) return { locked: true, remainingMs: remaining };
  sessionStorage.removeItem(LOCKOUT_KEY);
  sessionStorage.removeItem(ATTEMPTS_KEY);
  return { locked: false, remainingMs: 0 };
}

function getAttempts(): AttemptsData {
  const str = sessionStorage.getItem(ATTEMPTS_KEY);
  if (!str) return { count: 0, lastAttempt: 0 };
  return JSON.parse(str);
}

function recordFailedAttempt(): { locked: boolean; attemptsLeft: number } {
  const data = getAttempts();
  data.count += 1;
  data.lastAttempt = Date.now();
  sessionStorage.setItem(ATTEMPTS_KEY, JSON.stringify(data));
  if (data.count >= MAX_ATTEMPTS) {
    sessionStorage.setItem(LOCKOUT_KEY, String(Date.now()));
    return { locked: true, attemptsLeft: 0 };
  }
  return { locked: false, attemptsLeft: MAX_ATTEMPTS - data.count };
}

function clearAttempts() {
  sessionStorage.removeItem(ATTEMPTS_KEY);
  sessionStorage.removeItem(LOCKOUT_KEY);
}

export async function isSetupComplete(): Promise<boolean> {
  const settings = await db.app_settings.toCollection().first();
  return settings?.setup_complete ?? false;
}

export async function createPin(pin: string): Promise<void> {
  const hash = await bcrypt.hash(pin, SALT_ROUNDS);
  const existing = await db.app_settings.toCollection().first();

  if (existing) {
    await db.app_settings.update(existing.id, { pin_hash: hash } as Partial<AppSettings>);
    await supabase
      .from("app_settings")
      .update({ pin_hash: hash })
      .eq("id", existing.id);
  } else {
    const settings = {
      id: generateId(),
      pin_hash: hash,
      setup_complete: false,
      onesignal_player_id: null,
      created_at: new Date().toISOString(),
    };
    await db.app_settings.put(settings);
    await supabase.from("app_settings").insert(settings);
  }
}

export async function completeSetup(): Promise<void> {
  const settings = await db.app_settings.toCollection().first();
  if (!settings) return;
  await db.app_settings.update(settings.id, { setup_complete: true } as Partial<AppSettings>);
  await supabase
    .from("app_settings")
    .update({ setup_complete: true })
    .eq("id", settings.id);
}

export async function verifyPin(
  pin: string
): Promise<{ success: boolean; locked?: boolean; attemptsLeft?: number }> {
  const { locked } = getLockoutStatus();
  if (locked) return { success: false, locked: true };

  const settings = await db.app_settings.toCollection().first();
  if (!settings) return { success: false };

  const match = await bcrypt.compare(pin, settings.pin_hash);
  if (match) {
    clearAttempts();
    return { success: true };
  }

  const result = recordFailedAttempt();
  return { success: false, ...result };
}

export async function changePin(
  currentPin: string,
  newPin: string
): Promise<{ success: boolean; error?: string }> {
  const result = await verifyPin(currentPin);
  if (!result.success) {
    if (result.locked) return { success: false, error: "Account is locked. Try again later." };
    return { success: false, error: `Wrong PIN. ${result.attemptsLeft} attempts left.` };
  }
  await createPin(newPin);
  return { success: true };
}

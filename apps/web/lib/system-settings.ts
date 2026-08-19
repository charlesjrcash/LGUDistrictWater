import { db } from "@/lib/db";

export type SystemSettingValue = string | number | boolean | null;
export type SystemSetting = { setting_id: string; setting_key: string; setting_value: string | null; data_type: "TEXT" | "INTEGER" | "BOOLEAN"; description: string | null; is_active: boolean };

function normalizeDataType(dataType: string) {
  const value = dataType.toUpperCase();
  return value === "INTEGER" || value === "BOOLEAN" ? value : "TEXT";
}

export function parseSystemSettingValue(value: string | null, dataType: string): SystemSettingValue {
  if (value === null) return null;
  const type = normalizeDataType(dataType);
  if (type === "INTEGER") return /^[-+]?\d+$/.test(value.trim()) ? Number.parseInt(value.trim(), 10) : null;
  if (type === "BOOLEAN") { const normalized = value.trim().toUpperCase(); return normalized === "TRUE" ? true : normalized === "FALSE" ? false : null; }
  return value;
}

export async function getActiveSystemSettings(): Promise<SystemSetting[]> {
  const result = await db.query<SystemSetting>("SELECT setting_id, setting_key, setting_value, data_type, description, is_active FROM public.mt_system_settings WHERE is_active = TRUE ORDER BY setting_key ASC");
  return result.rows;
}

export async function getSystemSetting(settingKey: string): Promise<SystemSettingValue> {
  const result = await db.query<Pick<SystemSetting, "setting_value" | "data_type">>("SELECT setting_value, data_type FROM public.mt_system_settings WHERE setting_key = $1 AND is_active = TRUE LIMIT 1", [settingKey]);
  const setting = result.rows[0];
  return setting ? parseSystemSettingValue(setting.setting_value, setting.data_type) : null;
}

export async function getSystemSettingText(settingKey: string) { const value = await getSystemSetting(settingKey); return typeof value === "string" ? value : null; }
export async function getSystemSettingBoolean(settingKey: string) { const value = await getSystemSetting(settingKey); return typeof value === "boolean" ? value : null; }
export async function getSystemSettingInteger(settingKey: string) { const value = await getSystemSetting(settingKey); return typeof value === "number" && Number.isInteger(value) ? value : null; }

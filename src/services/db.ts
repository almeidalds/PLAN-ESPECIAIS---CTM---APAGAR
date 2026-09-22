import type { GlobalSettings, ImportedRow, Override, ScheduleEvent } from '../../types';
export interface CloudSaveData { importedRows: ImportedRow[]; overrides: Override[]; manualScheduleEdits: Record<string, ScheduleEvent[]>; settings: GlobalSettings; planningDate: string; planName?: string; lastUpdated?: string; }
const CURRENT = 'ctm-planner-current'; const HISTORY = 'ctm-planner-history';
const read = <T,>(key: string, fallback: T): T => { try { return JSON.parse(localStorage.getItem(key) || '') as T; } catch { return fallback; } };
export async function saveToCloud(data: CloudSaveData): Promise<void> { localStorage.setItem(CURRENT, JSON.stringify({ ...data, lastUpdated: new Date().toISOString() })); window.dispatchEvent(new Event('ctm-planner-changed')); }
export function subscribeToCloud(callback: (data: CloudSaveData | null) => void): () => void { const update = () => callback(read<CloudSaveData | null>(CURRENT, null)); update(); window.addEventListener('storage', update); window.addEventListener('ctm-planner-changed', update); return () => { window.removeEventListener('storage', update); window.removeEventListener('ctm-planner-changed', update); }; }
export async function saveToHistory(name: string, data: CloudSaveData): Promise<void> { const history = read<CloudSaveData[]>(HISTORY, []); history.unshift({ ...data, planName: name.trim(), lastUpdated: new Date().toISOString() }); localStorage.setItem(HISTORY, JSON.stringify(history.slice(0, 30))); }
export async function getHistoryList(): Promise<CloudSaveData[]> { return read<CloudSaveData[]>(HISTORY, []); }

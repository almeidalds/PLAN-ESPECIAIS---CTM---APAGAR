import type { ImportedRow, Override, District, DistrictSchedule, GlobalSettings, ValidationReport, CapacitySlot, ScheduleEvent } from '../types';

const dateOnly = (value: unknown) => value instanceof Date && !Number.isNaN(value.getTime()) ? value.toISOString().slice(0, 10) : String(value || '').slice(0, 10);
const validDate = (value: unknown) => /^\d{4}-\d{2}-\d{2}$/.test(dateOnly(value)) && !Number.isNaN(Date.parse(dateOnly(value)));
export function applyOverrides(rows: ImportedRow[], overrides: Override[]): ImportedRow[] { return rows.map(row => { const copy = { ...row }; overrides.filter(o => o.missionary_email === row.missionary_email).forEach(o => { copy[o.field] = o.new_value; }); return copy; }); }
export function validateImportedData(rows: ImportedRow[]): ValidationReport {
  const issues: ValidationReport['issues'] = [];
  rows.forEach(row => {
    for (const field of ['missionary_name', 'missionary_email', 'district_code']) if (!String(row[field] || '').trim()) issues.push({ row_index: row.row_index, missionary_name: row.missionary_name || '', field, message: `Campo obrigatório ausente: ${field}`, severity: 'blocker' });
    if (row.training_start_date && !validDate(row.training_start_date)) issues.push({ row_index: row.row_index, missionary_name: row.missionary_name || '', field: 'training_start_date', message: 'Data inicial inválida', severity: 'error' });
  });
  return { totalCount: rows.length, issues, errorCount: issues.filter(i => i.severity === 'error').length, warningCount: issues.filter(i => i.severity === 'warning').length, blockerCount: issues.filter(i => i.severity === 'blocker').length };
}
export function processDistricts(rows: ImportedRow[], planningDate: string): District[] {
  const groups = new Map<string, District>();
  rows.forEach(row => {
    const code = String(row.district_code || [row.district_number, row.district_letter].filter(Boolean).join('') || 'Sem distrito').trim();
    if (!groups.has(code)) groups.set(code, { id: code, code, number: row.district_number, letter: row.district_letter, missionaries: [], planVersion: Number(row.plan_version) || 1, programCode: row.program_code, training_type: row.training_type, group: row.group, language: row.language });
    const startDate = validDate(row.training_start_date) ? dateOnly(row.training_start_date) : planningDate;
    const elapsed = Date.parse(planningDate) - Date.parse(startDate);
    groups.get(code)!.missionaries.push({ id: String(row.row_index), name: String(row.missionary_name || ''), email: String(row.missionary_email || ''), startDate, endDate: dateOnly(row.training_end_date), weekIndex: Math.max(1, Math.floor(elapsed / 604800000) + 1), originalRowIndex: row.row_index, country: row.country_home_unit, language: row.language });
  });
  return [...groups.values()];
}
export function autoBalancePlans(rows: ImportedRow[], recalculate: boolean): ImportedRow[] { const versions = new Map<string, number>(); return rows.map(row => { const key = String(row.district_code || ''); if (!versions.has(key)) versions.set(key, versions.size % 4 + 1); return { ...row, plan_version: recalculate || !row.plan_version ? versions.get(key)! : row.plan_version }; }); }
export function generateSchedules(districts: District[], settings: GlobalSettings, start: string, end: string, edits: Record<string, ScheduleEvent[]>): DistrictSchedule[] {
  if (!validDate(start) || !validDate(end) || start > end) return [];
  const template = Array.isArray(settings.template) ? settings.template : [];
  return districts.map(district => {
    const events: ScheduleEvent[] = [];
    for (let day = new Date(`${start}T12:00:00`), last = new Date(`${end}T12:00:00`), count = 0; day <= last && count < 366; day.setDate(day.getDate() + 1), count++) {
      const date = day.toISOString().slice(0, 10);
      const [baseHour, baseMinute] = String(settings.baseStartTime || '06:30').split(':').map(Number);
      let cursor = baseHour * 60 + baseMinute;
      template.forEach(block => {
        const version = district.planVersion;
        const staggered = block.type === 'MEAL' ? settings.mealOffsets?.[block.mealType]?.[version] : block.type === 'GYM' ? settings.gymOffsets?.[version] : undefined;
        const time = String(block.fixedTime || staggered || `${String(Math.floor(cursor / 60)).padStart(2, '0')}:${String(cursor % 60).padStart(2, '0')}`);
        events.push({ date, time, activity: String(block.name || block.content || 'Atividade'), type: block.type, durationMinutes: Number(block.durationMinutes) || 0, isStaggered: !!block.isStaggered });
        const [hour, minute] = time.split(':').map(Number);
        cursor = Math.max(cursor, hour * 60 + minute + (Number(block.durationMinutes) || 0));
      });
    }
    return { districtId: district.id, districtCode: district.code, missionaryCount: district.missionaries.length, events: edits[district.id] || events };
  });
}
export function calculateCapacityLoad(schedules: DistrictSchedule[], settings: GlobalSettings): CapacitySlot[] { const slots = new Map<string, CapacitySlot>(); schedules.forEach(schedule => schedule.events.forEach(event => { const type = event.type === 'MEAL' ? 'cafeteria' : event.type === 'GYM' ? 'gym' : event.type === 'TEMPLE' ? 'temple' : ''; if (!type) return; const key = `${event.date} ${event.time} ${type}`; const slot = slots.get(key) || { time: `${event.date} ${event.time}`, type, count: 0, status: 'ok' }; slot.count += schedule.missionaryCount; slot.status = slot.count > (settings.capacities[type] || Infinity) ? 'over' : 'ok'; slots.set(key, slot); })); return [...slots.values()].sort((a, b) => a.time.localeCompare(b.time)); }

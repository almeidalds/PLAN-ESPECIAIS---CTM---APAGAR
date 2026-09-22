import { useState } from 'react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import JSZip from 'jszip';
import type { District, DistrictSchedule, GlobalSettings, ScheduleEvent } from '../types';
import type { ScheduleAction } from '../App';

interface Props {
  key?: number;
  districts: District[];
  schedules: DistrictSchedule[];
  planningDate: string;
  settings: GlobalSettings;
  capacitySlots: unknown[];
  onUpdateSchedule: (districtId: string, action: ScheduleAction, event: ScheduleEvent, originalActivity?: string) => void;
  onUpdateVersionSchedule: (version: number, week: number, action: ScheduleAction, event: ScheduleEvent, originalActivity?: string) => void;
  onChangeVersionWeek: (version: number, week: number) => void;
}

const saveBlob = (blob: Blob, filename: string) => { const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = filename; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const csv = (schedule: DistrictSchedule) => ['Data;Horário;Atividade;Tipo;Duração (min)', ...schedule.events.map(event => [event.date, event.time, event.activity, event.type, event.durationMinutes].map(value => `"${String(value ?? '').replaceAll('"', '""')}"`).join(';'))].join('\r\n');
const htmlFor = (district: District, schedule: DistrictSchedule, template: string) => {
  const find = (term: string) => schedule.events.find(event => event.activity.toLowerCase().includes(term))?.time || '—';
  const values: Record<string, string> = { Distrito: district.code, Semana: String(district.missionaries[0]?.weekIndex || 1), Versao: String(district.planVersion), QtdMissionarios: String(district.missionaries.length), Aula1: find('1ª aula'), Aula2: find('2ª aula'), Cafe: find('desjejum'), Almoco: find('almoço'), Jantar: find('jantar'), Ginasio: find('ginásio') };
  return template.replace(/{{(\w+)}}/g, (_, key) => values[key] || '—');
};

export default function Dashboard({ districts, schedules, settings, onUpdateSchedule, onUpdateVersionSchedule, onChangeVersionWeek }: Props) {
  const [selected, setSelected] = useState('');
  const [scope, setScope] = useState<'district' | 'version'>('district');
  const [form, setForm] = useState({ date: '', time: '', activity: '', type: 'OTHER', durationMinutes: 0 });
  const [editing, setEditing] = useState<ScheduleEvent | null>(null);
  const schedule = schedules.find(item => item.districtId === selected) || schedules[0];
  const district = districts.find(item => item.id === schedule?.districtId);
  const valid = !!form.date && !!form.time && !!form.activity.trim();
  const send = (action: ScheduleAction, event: ScheduleEvent, original?: string) => {
    if (!schedule || !district) return;
    if (scope === 'version') onUpdateVersionSchedule(district.planVersion, district.missionaries[0]?.weekIndex || 1, action, event, original);
    else onUpdateSchedule(schedule.districtId, action, event, original);
  };
  const submit = () => { if (!valid) return; const event = { ...form, activity: form.activity.trim() }; send(editing ? 'EDIT' : 'ADD', event, editing ? `${editing.date}|${editing.time}|${editing.activity}` : undefined); setEditing(null); setForm({ date: '', time: '', activity: '', type: 'OTHER', durationMinutes: 0 }); };
  const exportExcel = () => { if (!schedule) return; const sheet = XLSX.utils.json_to_sheet(schedule.events.map(({ date, time, activity, type, durationMinutes }) => ({ Data: date, Horário: time, Atividade: activity, Tipo: type, Minutos: durationMinutes }))); const book = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(book, sheet, 'Cronograma'); XLSX.writeFile(book, `cronograma-${schedule.districtCode}.xlsx`); };
  const exportPdf = () => { if (!schedule) return; const doc = new jsPDF(); doc.setFontSize(16); doc.text(`Distrito ${schedule.districtCode}`, 12, 16); doc.setFontSize(9); let y = 26; schedule.events.forEach(event => { if (y > 280) { doc.addPage(); y = 16; } doc.text(`${event.date}  ${event.time}  ${event.activity}`.slice(0, 110), 12, y); y += 6; }); doc.save(`cronograma-${schedule.districtCode}.pdf`); };
  const exportZip = async () => { const zip = new JSZip(); schedules.forEach(item => zip.file(`distrito-${item.districtCode}.csv`, '\ufeff' + csv(item))); saveBlob(await zip.generateAsync({ type: 'blob' }), 'cronogramas.zip'); };
  const exportEmail = () => { if (!schedule || !district) return; saveBlob(new Blob([htmlFor(district, schedule, String(settings.emailTemplate || ''))], { type: 'text/html;charset=utf-8' }), `email-${district.code}.html`); };
  return <div className="max-w-6xl mx-auto w-full p-8 bg-white dark:bg-slate-900 rounded-3xl pb-12">
    <h2 className="text-2xl font-bold mb-2">Cronogramas oficiais</h2>
    <p className="mb-5 text-slate-500">{districts.length} distritos · {schedules.reduce((sum, item) => sum + item.events.length, 0)} atividades</p>
    <div className="flex gap-2 flex-wrap mb-5">
      <select aria-label="Distrito" className="p-2 border rounded text-slate-900" value={schedule?.districtId || ''} onChange={e => setSelected(e.target.value)}>{schedules.map(item => <option key={item.districtId} value={item.districtId}>Distrito {item.districtCode}</option>)}</select>
      <button onClick={exportExcel} className="px-3 py-2 bg-indigo-600 text-white rounded">Exportar Excel</button>
      <button onClick={exportPdf} className="px-3 py-2 bg-indigo-600 text-white rounded">Exportar PDF</button>
      <button onClick={exportZip} className="px-3 py-2 bg-indigo-600 text-white rounded">Todos em ZIP</button>
      <button onClick={exportEmail} className="px-3 py-2 bg-indigo-600 text-white rounded">Modelo de email</button>
    </div>
    {district && <div className="flex gap-3 items-center flex-wrap mb-5"><span>Versão {district.planVersion} · Semana {district.missionaries[0]?.weekIndex || 1}</span><label>Alterar semana da versão <input type="number" min="1" defaultValue={district.missionaries[0]?.weekIndex || 1} className="w-16 p-1 border rounded text-slate-900" onChange={e => { const week = Number(e.target.value); if (week > 0) onChangeVersionWeek(district.planVersion, week); }} /></label></div>}
    <div className="p-4 border rounded-xl mb-5 space-y-3">
      <div className="flex gap-2 flex-wrap"><input type="date" aria-label="Data" className="p-2 border rounded text-slate-900" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /><input type="time" aria-label="Horário" className="p-2 border rounded text-slate-900" value={form.time} onChange={e => setForm({ ...form, time: e.target.value })} /><input aria-label="Atividade" placeholder="Atividade" className="p-2 border rounded text-slate-900 flex-1" value={form.activity} onChange={e => setForm({ ...form, activity: e.target.value })} /><input aria-label="Duração em minutos" type="number" min="0" className="w-28 p-2 border rounded text-slate-900" value={form.durationMinutes} onChange={e => setForm({ ...form, durationMinutes: Number(e.target.value) })} /></div>
      <div className="flex gap-3 items-center flex-wrap"><label className="text-sm"><input type="checkbox" checked={scope === 'version'} onChange={e => setScope(e.target.checked ? 'version' : 'district')} /> Aplicar à versão e semana</label><button disabled={!valid} onClick={submit} className="px-4 py-2 bg-indigo-600 text-white rounded disabled:opacity-40">{editing ? 'Salvar edição' : 'Adicionar atividade'}</button>{editing && <button onClick={() => { setEditing(null); setForm({ date: '', time: '', activity: '', type: 'OTHER', durationMinutes: 0 }); }} className="px-4 py-2 bg-slate-200 text-slate-900 rounded">Cancelar</button>}</div>
    </div>
    <div className="max-h-[55vh] overflow-auto">{schedule?.events.map((event, index) => <div key={`${event.date}-${event.time}-${index}`} className="flex justify-between gap-3 border-b py-2 text-sm"><span>{event.date} · {event.time} · {event.activity}</span><span className="flex gap-3"><button className="text-indigo-600" onClick={() => { setEditing(event); setForm({ date: event.date, time: event.time, activity: event.activity, type: event.type, durationMinutes: event.durationMinutes }); }}>Editar</button><button className="text-red-600" onClick={() => send('DELETE', event)}>Apagar</button></span></div>)}</div>
  </div>;
}

import { useState } from 'react';
import type { District, ImportedRow } from '../types';

interface Props {
  districts: District[];
  planningDate: string;
  onAddRows: (rows: ImportedRow[]) => void;
  onUpdateDistrict: (id: string, rows: ImportedRow[]) => void;
  onDeleteDistrict: (id: string) => void;
  onEditWeek: (id: string, week: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export default function DistrictManager({ districts, planningDate, onAddRows, onUpdateDistrict, onDeleteDistrict, onEditWeek, onBack, onContinue }: Props) {
  const [draft, setDraft] = useState({ name: '', email: '', code: '' });
  const [editing, setEditing] = useState<string | null>(null);
  const [rows, setRows] = useState<ImportedRow[]>([]);

  const add = () => {
    if (!draft.name.trim() || !draft.email.trim() || !draft.code.trim()) return;
    onAddRows([{ row_index: Date.now(), missionary_name: draft.name.trim(), missionary_email: draft.email.trim(), district_code: draft.code.trim(), training_start_date: planningDate, plan_version: 1 }]);
    setDraft({ name: '', email: '', code: '' });
  };
  const startEdit = (district: District) => {
    setEditing(district.id);
    setRows(district.missionaries.map(m => ({ row_index: m.originalRowIndex, missionary_name: m.name, missionary_email: m.email, district_code: district.code, training_start_date: m.startDate, training_end_date: m.endDate, plan_version: district.planVersion, program_code: district.programCode, language: m.language })));
  };
  const save = () => {
    if (!editing || !rows.length || rows.some(row => !row.missionary_name?.trim() || !row.missionary_email?.trim() || !row.district_code?.trim())) return;
    onUpdateDistrict(editing, rows);
    setEditing(null);
  };
  return <div className="max-w-5xl mx-auto w-full space-y-4 pb-8">
    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl">
      <h3 className="font-bold mb-3">Adicionar missionário</h3>
      <div className="flex gap-2 flex-wrap">
        <input aria-label="Nome" className="p-2 border rounded text-slate-900" placeholder="Nome" value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
        <input aria-label="Email" className="p-2 border rounded text-slate-900" placeholder="Email" value={draft.email} onChange={e => setDraft({ ...draft, email: e.target.value })} />
        <input aria-label="Distrito" className="p-2 border rounded text-slate-900" placeholder="Distrito" value={draft.code} onChange={e => setDraft({ ...draft, code: e.target.value })} />
        <button onClick={add} className="px-4 bg-indigo-600 text-white rounded">Adicionar</button>
      </div>
    </div>
    {districts.map(district => <div key={district.id} className="p-5 bg-white dark:bg-slate-900 rounded-2xl">
      <div className="flex justify-between gap-4">
        <div><h3 className="font-bold">Distrito {district.code} · Versão {district.planVersion}</h3><p className="text-sm text-slate-500">{district.missionaries.map(m => m.name).join(', ')}</p></div>
        <div className="flex gap-3"><button onClick={() => startEdit(district)} className="text-indigo-600">Editar</button><button onClick={() => onDeleteDistrict(district.id)} className="text-red-600">Apagar</button></div>
      </div>
      <label className="text-xs">Semana <input type="number" min="1" className="w-16 ml-2 p-1 border rounded text-slate-900" value={district.missionaries[0]?.weekIndex || 1} onChange={e => onEditWeek(district.id, Number(e.target.value))} /></label>
      {editing === district.id && <div className="mt-4 space-y-3 border-t pt-4">
        {rows.map((row, index) => <div key={row.row_index} className="grid sm:grid-cols-4 gap-2">
          <input aria-label="Nome" className="p-2 border rounded text-slate-900" value={row.missionary_name || ''} onChange={e => setRows(rows.map((r, i) => i === index ? { ...r, missionary_name: e.target.value } : r))} />
          <input aria-label="Email" className="p-2 border rounded text-slate-900" value={row.missionary_email || ''} onChange={e => setRows(rows.map((r, i) => i === index ? { ...r, missionary_email: e.target.value } : r))} />
          <input aria-label="Distrito" className="p-2 border rounded text-slate-900" value={row.district_code || ''} onChange={e => setRows(rows.map((r, i) => i === index ? { ...r, district_code: e.target.value } : r))} />
          <input aria-label="Início" type="date" className="p-2 border rounded text-slate-900" value={row.training_start_date || ''} onChange={e => setRows(rows.map((r, i) => i === index ? { ...r, training_start_date: e.target.value } : r))} />
        </div>)}
        <div className="flex gap-2"><button onClick={() => setEditing(null)} className="px-3 py-2 bg-slate-200 text-slate-900 rounded">Cancelar</button><button onClick={save} className="px-3 py-2 bg-indigo-600 text-white rounded">Salvar alterações</button></div>
      </div>}
    </div>)}
    <div className="flex gap-3"><button onClick={onBack} className="px-4 py-2 bg-slate-200 text-slate-900 rounded">Voltar</button><button onClick={onContinue} className="px-4 py-2 bg-indigo-600 text-white rounded">Continuar</button></div>
  </div>;
}

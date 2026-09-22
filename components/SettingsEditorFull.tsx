import type { GlobalSettings, TemplateBlock } from '../types';

interface Props { settings: GlobalSettings; onUpdate: (settings: GlobalSettings) => void; }
const types = ['OTHER', 'MEAL', 'STUDY', 'GYM', 'TEMPLE'];
const meals = ['breakfast', 'lunch', 'dinner'];
export default function SettingsEditor({ settings, onUpdate }: Props) {
  const template: TemplateBlock[] = settings.template || [];
  const change = (index: number, patch: Partial<TemplateBlock>) => onUpdate({ ...settings, template: template.map((item, i) => i === index ? { ...item, ...patch } : item) });
  const offset = (kind: 'meal' | 'gym', version: number, value: string, meal?: string) => {
    if (kind === 'gym') onUpdate({ ...settings, gymOffsets: { ...settings.gymOffsets, [version]: value } });
    else onUpdate({ ...settings, mealOffsets: { ...settings.mealOffsets, [meal!]: { ...settings.mealOffsets?.[meal!], [version]: value } } });
  };
  return <div className="p-8 bg-white dark:bg-slate-900 rounded-3xl space-y-6">
    <h2 className="text-xl font-bold">Configuração do planejamento</h2>
    <div className="grid sm:grid-cols-4 gap-4">
      <label>Início do dia<input type="time" className="block w-full p-2 border rounded text-slate-900" value={settings.baseStartTime || '06:30'} onChange={e => onUpdate({ ...settings, baseStartTime: e.target.value })} /></label>
      {Object.entries(settings.capacities).map(([key, value]) => <label key={key} className="capitalize">Capacidade {key}<input type="number" min="1" className="block w-full p-2 border rounded text-slate-900" value={value} onChange={e => onUpdate({ ...settings, capacities: { ...settings.capacities, [key]: Number(e.target.value) } })} /></label>)}
    </div>
    <div><h3 className="font-bold mb-2">Rotina diária</h3><div className="space-y-2">{template.map((block, index) => <div key={block.id} className="flex gap-2 flex-wrap">
      <input aria-label="Nome da atividade" className="flex-1 min-w-40 p-2 border rounded text-slate-900" value={block.name || ''} onChange={e => change(index, { name: e.target.value })} />
      <select aria-label="Tipo" className="p-2 border rounded text-slate-900" value={block.type} onChange={e => change(index, { type: e.target.value })}>{types.map(type => <option key={type}>{type}</option>)}</select>
      {block.type === 'MEAL' && <select aria-label="Refeição" className="p-2 border rounded text-slate-900" value={block.mealType || 'breakfast'} onChange={e => change(index, { mealType: e.target.value })}>{meals.map(meal => <option key={meal}>{meal}</option>)}</select>}
      <input aria-label="Horário fixo" type="time" className="p-2 border rounded text-slate-900" value={block.fixedTime || ''} onChange={e => change(index, { fixedTime: e.target.value })} />
      <input aria-label="Duração em minutos" type="number" min="0" className="w-24 p-2 border rounded text-slate-900" value={block.durationMinutes || 0} onChange={e => change(index, { durationMinutes: Number(e.target.value) })} />
      <button onClick={() => onUpdate({ ...settings, template: template.filter((_, i) => i !== index) })} className="text-red-600">Remover</button>
    </div>)}</div><button onClick={() => onUpdate({ ...settings, template: [...template, { id: crypto.randomUUID(), name: 'Nova atividade', type: 'OTHER', durationMinutes: 30 }] })} className="mt-3 px-4 py-2 bg-indigo-600 text-white rounded">Adicionar atividade</button></div>
    <div><h3 className="font-bold mb-2">Horários escalonados por versão</h3><div className="overflow-x-auto"><table className="text-sm"><thead><tr><th className="p-2 text-left">Versão</th>{meals.map(meal => <th key={meal} className="p-2 capitalize">{meal}</th>)}<th className="p-2">Ginásio</th></tr></thead><tbody>{Array.from({ length: 8 }, (_, index) => index + 1).map(version => <tr key={version}><td className="p-2">{version}</td>{meals.map(meal => <td key={meal} className="p-1"><input type="time" aria-label={`${meal} versão ${version}`} className="p-1 border rounded text-slate-900" value={settings.mealOffsets?.[meal]?.[version] || ''} onChange={e => offset('meal', version, e.target.value, meal)} /></td>)}<td className="p-1"><input type="time" aria-label={`Ginásio versão ${version}`} className="p-1 border rounded text-slate-900" value={settings.gymOffsets?.[version] || ''} onChange={e => offset('gym', version, e.target.value)} /></td></tr>)}</tbody></table></div></div>
    <label className="block font-bold">Modelo de email HTML<textarea className="block w-full h-40 mt-2 p-3 border rounded font-mono text-xs text-slate-900" value={settings.emailTemplate || ''} onChange={e => onUpdate({ ...settings, emailTemplate: e.target.value })} /></label>
  </div>;
}

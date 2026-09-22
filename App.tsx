import React, { useState, useMemo, useEffect } from 'react';
import { AppStep, Override, BatchStatus, GlobalSettings, ImportedRow, AIAnalysisResult, NotificationState, RawDataRow, ScheduleEvent } from './types';
import { DEFAULT_SETTINGS } from './constants';
import { processDistricts, generateSchedules, validateImportedData, autoBalancePlans, calculateCapacityLoad, applyOverrides } from './utils/dataProcessor';
import { saveToCloud, subscribeToCloud, saveToHistory, getHistoryList, CloudSaveData } from './src/services/db';

import FileUpload from './components/FileUpload';
import Dashboard from './components/DashboardFull';
import Notification from './components/Notification';
import HealthCheck from './components/HealthCheck';
import SettingsEditor from './components/SettingsEditorFull';
import CapacitySimulator from './components/CapacitySimulator';
import ColumnMapper from './components/ColumnMapper';
import VersionDistributor from './components/VersionDistributor';
import BatchStatusBar from './components/BatchStatusBar';
import DistrictManager from './components/DistrictManagerFull';

export type ScheduleAction = 'ADD' | 'EDIT' | 'DELETE';

const App: React.FC = () => {
  const [currentStep, setCurrentStep] = useState<AppStep>(AppStep.IMPORT);
  const [importedRows, setImportedRows] = useState<ImportedRow[]>([]);
  const [rawMappingData, setRawMappingData] = useState<{headers: string[], rows: RawDataRow[]} | null>(null);
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysisResult | null>(null);
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [batchStatus, setBatchStatus] = useState<BatchStatus>(BatchStatus.DRAFT);
  const [planningDate, setPlanningDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState<string>(() => {
    const d = new Date(); d.setDate(d.getDate() + 6); return d.toISOString().split('T')[0];
  });
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_SETTINGS);
  const [notification, setNotification] = useState<NotificationState>({ show: false, message: '', type: 'info' });
  const [overrideSearchTerm, setOverrideSearchTerm] = useState('');
  const [manualScheduleEdits, setManualScheduleEdits] = useState<Record<string, ScheduleEvent[]>>({});
  const [refreshKey, setRefreshKey] = useState<number>(Date.now());

  const [isSaving, setIsSaving] = useState(false);
  const [isLoadingCloud, setIsLoadingCloud] = useState(true);

  // HISTÓRICO
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyList, setHistoryList] = useState<CloudSaveData[]>([]);
  const [historyName, setHistoryName] = useState("");

  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return false;
  });

  useEffect(() => {
    if (darkMode) { document.documentElement.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { document.documentElement.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [darkMode]);

  const toggleTheme = () => setDarkMode(!darkMode);
  const showNotification = (message: string, type: 'error' | 'success' | 'info') => setNotification({ show: true, message, type });
  const handleError = (message: string) => showNotification(message, 'error');

  useEffect(() => {
    setIsLoadingCloud(true);
    const unsubscribe = subscribeToCloud((data) => {
      if (data && data.importedRows && data.importedRows.length > 0) {
        setImportedRows(data.importedRows);
        setOverrides(data.overrides || []);
        setManualScheduleEdits(data.manualScheduleEdits || {});
        setSettings(data.settings || DEFAULT_SETTINGS);
        if (data.planningDate) setPlanningDate(data.planningDate);
        setRefreshKey(Date.now());
        setCurrentStep(prev => prev === AppStep.IMPORT ? AppStep.REVIEW : prev);
        showNotification("Planejamento local carregado", "info");
      }
      setIsLoadingCloud(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try { await saveToCloud({ importedRows, overrides, manualScheduleEdits, settings, planningDate }); showNotification("Progresso salvo neste navegador!", "success"); } 
    catch (error) { showNotification("Erro ao salvar neste navegador.", "error"); } 
    finally { setIsSaving(false); }
  };

  const handleClearAll = async () => {
      if(window.confirm("⚠️ ATENÇÃO: Isto vai apagar o planejamento atual de todas as telas. Deseja começar um novo do zero?")) {
          setImportedRows([]);
          setOverrides([]);
          setManualScheduleEdits({});
          setCurrentStep(AppStep.IMPORT);
          await saveToCloud({ importedRows: [], overrides: [], manualScheduleEdits: {}, settings, planningDate });
          showNotification("Sistema limpo! Pode importar um novo arquivo.", "info");
      }
  };

  const handleOpenHistory = async () => {
      const list = await getHistoryList();
      setHistoryList(list);
      setShowHistoryModal(true);
  };

  const handleSaveToHistory = async () => {
      if(!historyName.trim()) return alert("Por favor, digite um nome para este planejamento.");
      await saveToHistory(historyName, { importedRows, overrides, manualScheduleEdits, settings, planningDate });
      showNotification("Histórico guardado com sucesso!", "success");
      setHistoryName("");
      const list = await getHistoryList();
      setHistoryList(list);
  };

  const handleRestoreHistory = async (historicalData: CloudSaveData) => {
      if(window.confirm(`Tem a certeza que deseja restaurar o planejamento "${historicalData.planName}"? Isto irá substituir o ecrã atual.`)) {
          await saveToCloud(historicalData); 
          setShowHistoryModal(false);
          showNotification(`Planejamento ${historicalData.planName} restaurado!`, "success");
      }
  };

  const activeRows = useMemo(() => applyOverrides(importedRows, overrides), [importedRows, overrides]);
  const validationReport = useMemo(() => activeRows.length === 0 ? null : validateImportedData(activeRows), [activeRows]);
  const processedDistricts = useMemo(() => (currentStep === AppStep.IMPORT || currentStep === AppStep.MAPPING) ? [] : processDistricts(activeRows, planningDate), [activeRows, planningDate, currentStep]);
  
  // 🔥 CORREÇÃO PRINCIPAL: Argumentos da função ajustados
  const schedules = useMemo(() => processedDistricts.length === 0 ? [] : generateSchedules(processedDistricts, settings, planningDate, endDate, manualScheduleEdits), [processedDistricts, settings, planningDate, endDate, manualScheduleEdits]);
  const capacitySlots = useMemo(() => schedules.length === 0 ? [] : calculateCapacityLoad(schedules, settings), [schedules, settings]);

  const handleDataLoaded = (data: ImportedRow[], analysis?: AIAnalysisResult) => { setImportedRows(data); setAiAnalysis(analysis || null); if (validateImportedData(data).totalCount > 0) setCurrentStep(AppStep.VALIDATION); };
  const handleRequireMapping = (headers: string[], rows: RawDataRow[]) => { setRawMappingData({ headers, rows }); setCurrentStep(AppStep.MAPPING); };
  const handleMappingConfirm = (mappedRows: ImportedRow[]) => handleDataLoaded(mappedRows);
  const handleAddOverride = (override: Override) => { setOverrides(prev => [...prev, override]); showNotification("Exceção aplicada", "success"); };
  const handleRemoveOverride = (id: string) => { setOverrides(prev => prev.filter(o => o.id !== id)); showNotification("Exceção removida", "info"); };

  const handleMoveMissionaryVersion = (email: string, newVersion: number) => {
    const missionary = activeRows.find(r => r.missionary_email === email); if (!missionary) return;
    setOverrides(prev => [...prev, { id: crypto.randomUUID(), missionary_email: email, field: 'plan_version', original_value: missionary.plan_version, new_value: newVersion, reason: 'Manual Move', timestamp: new Date().toISOString() }]); showNotification("Versão atualizada", "success");
  };

  const handleAddManualDistricts = (newRows: ImportedRow[]) => { setImportedRows(prev => [...prev, ...newRows]); showNotification("Distrito criado!", "success"); };
  const handleDeleteDistrict = (districtId: string) => {
    if (!window.confirm("Apagar distrito?")) return;
    const district = processedDistricts.find(d => d.id === districtId); if (!district) return;
    const toRemove = new Set(district.missionaries.map(m => m.originalRowIndex));
    setImportedRows(prev => prev.filter(row => !toRemove.has(row.row_index))); showNotification(`Distrito apagado.`, "info");
  };
  const handleUpdateDistrict = (districtId: string, newRows: ImportedRow[]) => {
    const district = processedDistricts.find(d => d.id === districtId); if (!district) return;
    const toRemove = new Set(district.missionaries.map(m => m.originalRowIndex));
    setImportedRows(prev => [...prev.filter(row => !toRemove.has(row.row_index)), ...newRows]); showNotification("Distrito atualizado!", "success");
  };

  const handleEditDistrictWeek = (districtId: string, newWeek: number) => {
    const district = processedDistricts.find(d => d.id === districtId); if (!district) return;
    const newDate = new Date(planningDate + 'T12:00:00'); newDate.setDate(newDate.getDate() - ((newWeek - 1) * 7));
    const dtStr = newDate.toISOString().split('T')[0];
    setOverrides(prev => [...prev, ...district.missionaries.map(m => ({ id: crypto.randomUUID(), missionary_email: m.email, field: 'training_start_date', original_value: m.startDate, new_value: dtStr, reason: `Semana ${newWeek}`, timestamp: new Date().toISOString() }))]);
    showNotification(`Semana alterada para ${newWeek}`, "success");
  };

  const handleChangeVersionWeek = (version: number, newWeek: number) => {
    const dists = processedDistricts.filter(d => d.planVersion === version); if (dists.length === 0) return;
    const newDate = new Date(planningDate + 'T12:00:00'); newDate.setDate(newDate.getDate() - ((newWeek - 1) * 7));
    const dtStr = newDate.toISOString().split('T')[0];
    const newOvs: Override[] = [];
    dists.forEach(d => d.missionaries.forEach(m => newOvs.push({ id: crypto.randomUUID(), missionary_email: m.email, field: 'training_start_date', original_value: m.startDate, new_value: dtStr, reason: `Mudança Versão ${version}`, timestamp: new Date().toISOString() })));
    setOverrides(prev => [...prev, ...newOvs]); showNotification(`Semana da Versão ${version} alterada para ${newWeek}`, "success");
  };

  const handleRecalculateAll = () => { if (window.confirm("ATENÇÃO: Sobrescrever TODAS as versões?")) { setImportedRows(autoBalancePlans([...activeRows], true)); setOverrides([]); setManualScheduleEdits({}); showNotification("Recálculo total aplicado.", "success"); } };
  const handleAutoFix = () => { setImportedRows(autoBalancePlans([...activeRows], false)); showNotification("Correção automática aplicada.", "success"); };

  const sortEvts = (events: ScheduleEvent[]) => events.sort((a,b) => a.date === b.date ? (a.time || '').localeCompare(b.time || '') : (a.date || '').localeCompare(b.date || ''));

  const handleUpdateSchedule = (districtId: string, action: ScheduleAction, event: ScheduleEvent, originalActivity?: string) => {
    setManualScheduleEdits(prev => {
        let evts = [...(prev[districtId] || schedules.find(s => s.districtId === districtId)?.events || [])];
        if (action === 'ADD') evts.push(event);
        else if (action === 'EDIT') evts = evts.map(e => (`${e.date}|${e.time}|${e.activity}` === originalActivity) ? event : e);
        else if (action === 'DELETE') evts = evts.filter(e => !(e.date === event.date && e.time === event.time && e.activity === event.activity));
        return { ...prev, [districtId]: sortEvts(evts) };
    });
    showNotification(action === 'ADD' ? "Atividade adicionada." : action === 'DELETE' ? "Atividade apagada." : "Cronograma atualizado.", "success");
  };

  const handleUpdateVersionSchedule = (version: number, week: number, action: ScheduleAction, event: ScheduleEvent, originalActivity?: string) => {
    const tgts = processedDistricts.filter(d => d.planVersion === version && d.missionaries[0]?.weekIndex === week);
    setManualScheduleEdits(prev => {
      const newState = { ...prev };
      tgts.forEach(d => {
        let evts = [...(prev[d.id] || schedules.find(s => s.districtId === d.id)?.events || [])];
        if (action === 'ADD') evts.push(event);
        else if (action === 'EDIT') evts = evts.map(e => (`${e.date}|${e.time}|${e.activity}` === originalActivity) ? event : e);
        else if (action === 'DELETE') evts = evts.filter(e => !(e.date === event.date && e.time === event.time && e.activity === event.activity));
        newState[d.id] = sortEvts(evts);
      }); return newState;
    });
    showNotification(`V${version} Semana ${week} atualizada!`, "success");
  };

  const steps = [
    { id: AppStep.IMPORT, label: 'Importação', icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12' },
    { id: AppStep.MAPPING, label: 'Mapeamento', hidden: currentStep !== AppStep.MAPPING, icon: 'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4' },
    { id: AppStep.VALIDATION, label: 'Validação', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: AppStep.DISTRICTS, label: 'Distritos', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: AppStep.DISTRIBUTION, label: 'Distribuição', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { id: AppStep.CONFIGURE, label: 'Configuração', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: AppStep.REVIEW, label: 'Dashboard Final', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  ];

  if (isLoadingCloud) {
    return <div className="h-screen w-screen flex items-center justify-center bg-[#F1F5F9] dark:bg-[#080F1E]"><div className="text-indigo-500 font-bold text-xl flex flex-col items-center">Carregando planejamento...</div></div>;
  }

  return (
    <div className="flex h-screen overflow-hidden text-slate-800 dark:text-slate-200">
      {notification.show && <Notification message={notification.message} type={notification.type} onClose={() => setNotification({ ...notification, show: false })} />}

      <aside className="w-20 lg:w-72 flex flex-col p-4 z-20 transition-all duration-300 flex-shrink-0">
         <div className="glass-panel h-full w-full rounded-[2rem] flex flex-col overflow-hidden shadow-2xl bg-white dark:bg-[#0F172A] border border-slate-200/50 dark:border-slate-800/50">
            <div className="h-24 flex items-center justify-center lg:justify-start px-6 bg-gradient-to-b from-white/40 to-transparent dark:from-slate-800/40">
               <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
               </div>
               <div className="hidden lg:block ml-4">
                  <h1 className="font-extrabold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-blue-500 dark:from-indigo-400 dark:to-blue-300">CTM Planner</h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Enterprise Edition</p>
               </div>
            </div>
            
            <nav className="flex-1 overflow-y-auto px-3 py-6 space-y-2 custom-scrollbar">
               {steps.map((step) => {
                   if (step.hidden) return null;
                   const isActive = step.id === currentStep;
                   const canClick = step.id === AppStep.IMPORT || step.id === AppStep.MAPPING || (!!validationReport?.totalCount && (step.id === AppStep.VALIDATION || !validationReport.blockerCount));
                   
                   return (
                   <button key={step.id} onClick={() => canClick && setCurrentStep(step.id)} disabled={!canClick} className={`w-full flex items-center px-4 py-3.5 rounded-2xl transition-all duration-300 group ${isActive ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100 dark:border-indigo-500/20' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-700 dark:hover:text-slate-300'} disabled:opacity-40 disabled:cursor-not-allowed`}>
                     <svg className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={isActive ? 2.5 : 2} d={step.icon} /></svg>
                     <span className="hidden lg:block ml-3 font-bold text-sm tracking-wide">{step.label}</span>
                   </button>
                   )
               })}
            </nav>
            
            <div className="p-4 mt-auto">
               <button onClick={toggleTheme} className="w-full flex items-center justify-center lg:justify-start gap-3 px-4 py-3 rounded-2xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all font-bold text-sm">
                   {darkMode ? <><span className="text-xl">🌙</span> <span className="hidden lg:block">Modo Escuro</span></> : <><span className="text-xl">☀️</span> <span className="hidden lg:block">Modo Claro</span></>}
               </button>
            </div>
         </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 h-full relative z-10 py-4 pr-4 pl-0">
         <header className="h-20 mb-4 bg-white dark:bg-[#0F172A] border border-slate-200/50 dark:border-slate-800/50 rounded-[2rem] px-6 flex justify-between items-center z-10 flex-shrink-0 animate-fade-in-up shadow-sm">
               <div>
                 {currentStep !== AppStep.IMPORT && (
                  <div>
                      <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{currentStep === AppStep.REVIEW ? 'Centro de Comando' : currentStep === AppStep.DISTRICTS ? 'Gestão de Distritos' : currentStep}</h2>
                  </div>
                 )}
               </div>
               
               <div className="flex items-center gap-3">
                  <button onClick={handleClearAll} className="px-4 py-2.5 bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400 rounded-xl font-bold text-xs hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center gap-2">
                      🗑️ <span className="hidden sm:inline">Limpar Tudo</span>
                  </button>
                  <button onClick={handleOpenHistory} className="px-4 py-2.5 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-2">
                      📚 <span className="hidden sm:inline">Histórico</span>
                  </button>

                  {importedRows.length > 0 && (
                      <button onClick={handleSaveToCloud} disabled={isSaving} className={`px-6 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${isSaving ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 shadow-sm border border-indigo-200 dark:border-indigo-500/30 active:scale-95'}`}>
                          {isSaving ? '⏳ Salvando...' : 'Salvar neste navegador'}
                      </button>
                  )}
                  {currentStep === AppStep.REVIEW && <BatchStatusBar status={batchStatus} onChangeStatus={setBatchStatus} canApprove={!validationReport?.blockerCount} onExport={() => setBatchStatus(BatchStatus.EXPORTED)} />}
               </div>
         </header>

         <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar animate-fade-in-up rounded-[2rem] p-1">
            <div className="h-full rounded-[1.8rem] overflow-hidden">
                <div key={currentStep} className="h-full flex flex-col overflow-y-auto custom-scrollbar">
                  
                  {currentStep === AppStep.IMPORT && <FileUpload onDataLoaded={handleDataLoaded} onRequireMapping={handleRequireMapping} onError={handleError} />}
                  
                  {currentStep === AppStep.MAPPING && rawMappingData && <ColumnMapper rawHeaders={rawMappingData.headers} rawRows={rawMappingData.rows} onConfirm={handleMappingConfirm} onCancel={() => setCurrentStep(AppStep.IMPORT)} />}
                  
                  {currentStep === AppStep.VALIDATION && validationReport && (
                    <div className="space-y-8 max-w-7xl mx-auto w-full"><HealthCheck report={validationReport} onAutoFix={handleAutoFix} onRecalculateAll={handleRecalculateAll} onProceed={() => setCurrentStep(AppStep.DISTRICTS)} onBack={() => setCurrentStep(AppStep.IMPORT)} onResolveError={setOverrideSearchTerm} /></div>
                  )}
                  
                  {currentStep === AppStep.DISTRICTS && (
                      <DistrictManager districts={processedDistricts} onAddRows={handleAddManualDistricts} onUpdateDistrict={handleUpdateDistrict} onDeleteDistrict={handleDeleteDistrict} onContinue={() => setCurrentStep(AppStep.DISTRIBUTION)} onBack={() => setCurrentStep(AppStep.VALIDATION)} planningDate={planningDate} onEditWeek={handleEditDistrictWeek} />
                  )}
                  
                  {currentStep === AppStep.DISTRIBUTION && <VersionDistributor districts={processedDistricts} onMoveMissionary={handleMoveMissionaryVersion} onContinue={() => setCurrentStep(AppStep.CONFIGURE)} onBack={() => setCurrentStep(AppStep.DISTRICTS)} />}
                  
                  {currentStep === AppStep.CONFIGURE && (
                    <div className="space-y-8 pb-10 max-w-6xl mx-auto w-full">
                      <div className="bento-card p-8 flex items-center justify-between gap-4 flex-wrap bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 border-indigo-100 dark:border-indigo-800/30">
                        <div>
                            <h3 className="font-black text-xl text-indigo-900 dark:text-indigo-100">Período Logístico</h3>
                            <p className="text-sm text-indigo-600 dark:text-indigo-400 mt-1 font-medium">Defina a janela de geração do cronograma.</p>
                        </div>
                        <div className="flex gap-4 items-center bg-white dark:bg-[#1E293B] p-2 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                          <input type="date" value={planningDate} onChange={(e) => setPlanningDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none px-2" />
                          <span className="text-slate-300 dark:text-slate-600 font-black">→</span>
                          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent border-none text-sm font-bold text-slate-700 dark:text-slate-300 focus:ring-0 cursor-pointer outline-none px-2" />
                        </div>
                      </div>
                      <SettingsEditor settings={settings} onUpdate={setSettings} />
                      <CapacitySimulator slots={capacitySlots} capacities={settings.capacities} />
                      <div className="flex justify-end gap-4 mt-8">
                          <button onClick={() => setCurrentStep(AppStep.REVIEW)} className="btn-premium bg-indigo-600 hover:bg-indigo-500 text-white px-10 py-4 text-lg shadow-xl shadow-indigo-500/30 border-none">
                              Gerar Cronogramas Oficiais
                              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          </button>
                      </div>
                    </div>
                  )}
                  
                  {currentStep === AppStep.REVIEW && (
                      <Dashboard key={refreshKey} districts={processedDistricts} schedules={schedules} planningDate={planningDate} settings={settings} onUpdateSchedule={handleUpdateSchedule} onUpdateVersionSchedule={handleUpdateVersionSchedule} onChangeVersionWeek={handleChangeVersionWeek} capacitySlots={capacitySlots} />
                  )}
                </div>
            </div>
         </div>
      </main>

      {showHistoryModal && (
         <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
             <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[24px] shadow-2xl overflow-hidden flex flex-col border border-slate-200/50 dark:border-slate-700/50 max-h-[85vh]">
                 <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 flex justify-between items-center">
                     <div>
                         <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">📚 Histórico local</h3>
                         <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Guarde o planejamento atual ou recupere um antigo.</p>
                     </div>
                     <button onClick={() => setShowHistoryModal(false)} className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-800 hover:bg-slate-100 dark:hover:text-white dark:hover:bg-slate-700 transition-all flex items-center justify-center font-bold shadow-sm">✕</button>
                 </div>
                 
                 <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Salvar Planejamento Atual no Histórico</label>
                     <div className="flex gap-3">
                         <input type="text" placeholder="Ex: Semana 15 de Março" className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 text-sm font-bold rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all shadow-inner" value={historyName} onChange={(e) => setHistoryName(e.target.value)} />
                         <button onClick={handleSaveToHistory} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md active:scale-95">Salvar</button>
                     </div>
                 </div>

                 <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-2">Planejamentos Salvos</label>
                     {historyList.length === 0 ? (
                         <div className="text-center p-8 text-slate-400">Nenhum histórico salvo ainda.</div>
                     ) : (
                         historyList.map((hist, idx) => (
                             <div key={idx} className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-4 rounded-xl shadow-sm flex justify-between items-center hover:border-indigo-300 dark:hover:border-indigo-600 transition-all">
                                 <div>
                                     <h4 className="font-bold text-slate-800 dark:text-white text-lg">{hist.planName || 'Sem Nome'}</h4>
                                     <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Modificado: {new Date(hist.lastUpdated).toLocaleString('pt-BR')}</p>
                                 </div>
                                 <button onClick={() => handleRestoreHistory(hist)} className="bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 font-bold text-xs px-5 py-2.5 rounded-lg transition-colors border border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-500/30 shadow-sm">
                                     Restaurar
                                 </button>
                             </div>
                         ))
                     )}
                 </div>
             </div>
         </div>
      )}
    </div>
  );
};

export default App;


import { GlobalSettings, TemplateBlock } from './types';

// Default Template Structure (Dynamic)
// Updated: Meal Durations (30/40/40) & Fixed Classes
const DEFAULT_TEMPLATE: TemplateBlock[] = [
  { id: '1', name: "Acordar / Higiene Pessoal", type: 'OTHER', durationMinutes: 60, isStaggered: false },
  { id: '2', name: "Desjejum (Refeitório)", type: 'MEAL', durationMinutes: 30, isStaggered: true, mealType: 'breakfast' },
  { id: '3', name: "Estudo Pessoal", type: 'STUDY', durationMinutes: 60, isStaggered: false },
  
  // 1ª AULA FIXA: 09:30 - 12:30 (180 min)
  { id: '4', name: "1ª Aula do Distrito (Fixo)", type: 'OTHER', durationMinutes: 180, isStaggered: false, fixedTime: "09:30" },
  
  { id: '6', name: "Almoço", type: 'MEAL', durationMinutes: 40, isStaggered: true, mealType: 'lunch' },
  { id: '7', name: "Estudo / Atividades", type: 'STUDY', durationMinutes: 60, isStaggered: false },
  
  // 2ª AULA FIXA: 15:00 - 18:00 (180 min)
  { id: '8', name: "2ª Aula do Distrito (Fixo)", type: 'OTHER', durationMinutes: 180, isStaggered: false, fixedTime: "15:00" },
  
  { id: '10', name: "Jantar", type: 'MEAL', durationMinutes: 40, isStaggered: true, mealType: 'dinner' },
  { id: '9', name: "Atividade Física (Ginásio)", type: 'GYM', durationMinutes: 50, isStaggered: true }, 
  { id: '11', name: "Planejamento Diário", type: 'OTHER', durationMinutes: 30, isStaggered: false },

  // --- EVENING ROUTINE (Fixed Times) ---
  { id: 'night-prep', name: "Preparar-se para dormir", type: 'OTHER', durationMinutes: 60, isStaggered: false, fixedTime: "21:00" },
  { id: 'night-dorms', name: "Estar em seus dormitórios", type: 'OTHER', durationMinutes: 0, isStaggered: false, fixedTime: "22:00" },
  { id: 'night-lights', name: "Apagar as luzes", type: 'OTHER', durationMinutes: 0, isStaggered: false, fixedTime: "22:30" },
];

const DEFAULT_EMAIL_BODY = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; color: #334155; }
  .container { max-width: 600px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0; }
  .header { background: linear-gradient(135deg, #4f46e5 0%, #4338ca 100%); padding: 30px 20px; text-align: center; }
  .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; }
  .header p { color: #c7d2fe; margin: 5px 0 0; font-size: 14px; }
  .content { padding: 30px; }
  .greeting { font-size: 16px; margin-bottom: 25px; line-height: 1.6; color: #475569; }
  .district-badge { background-color: #4f46e5; color: white; padding: 2px 8px; border-radius: 4px; font-weight: bold; }
  
  .card { background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 20px; border-left: 5px solid #4f46e5; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
  .card h2 { margin-top: 0; font-size: 16px; color: #1e293b; margin-bottom: 15px; display: flex; align-items: center; gap: 8px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 700; }
  
  .schedule-list { list-style: none; padding: 0; margin: 0; }
  .schedule-item { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px dashed #cbd5e1; }
  .schedule-item:last-child { border-bottom: none; }
  .schedule-label { font-size: 14px; color: #64748b; font-weight: 500; }
  .schedule-time { font-size: 14px; font-weight: 700; color: #0f172a; background-color: #e2e8f0; padding: 4px 8px; border-radius: 6px; white-space: nowrap; }
  
  .alert-box { background-color: #fef2f2; color: #991b1b; padding: 15px; border-radius: 12px; font-size: 13px; text-align: center; border: 1px solid #fecaca; margin-top: 25px; }
  
  .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  
  /* Mobile Responsive */
  @media only screen and (max-width: 600px) {
    .container { margin: 0; border-radius: 0; width: 100%; }
    .content { padding: 20px; }
    .schedule-item { flex-direction: column; align-items: flex-start; gap: 4px; }
    .schedule-time { align-self: flex-start; font-size: 13px; }
  }
</style>
</head>
<body>
<div class="container">
  <div class="header">
    <h1>CTM Planner</h1>
    <p>Planejamento Semanal</p>
  </div>
  <div class="content">
    <div class="greeting">
      Olá, missionários do Distrito <span class="district-badge">{{Distrito}}</span>!
      <br><br>
      Este é o cronograma oficial para a <strong>Semana {{Semana}}</strong>. Por favor, atentem-se aos horários designados para manter a ordem da casa.
    </div>

    <div class="card">
      <h2>📚 Horários de Aula (Fixos)</h2>
      <ul class="schedule-list">
        <li class="schedule-item">
          <span class="schedule-label">1ª Aula (Manhã)</span>
          <span class="schedule-time">{{Aula1}}</span>
        </li>
        <li class="schedule-item">
          <span class="schedule-label">2ª Aula (Tarde)</span>
          <span class="schedule-time">{{Aula2}}</span>
        </li>
      </ul>
    </div>

    <div class="card" style="border-left-color: #0ea5e9;">
      <h2>🕒 Rotina Escalonada</h2>
      <ul class="schedule-list">
        <li class="schedule-item">
          <span class="schedule-label">☕ Desjejum</span>
          <span class="schedule-time">{{Cafe}}</span>
        </li>
        <li class="schedule-item">
          <span class="schedule-label">🍽️ Almoço</span>
          <span class="schedule-time">{{Almoco}}</span>
        </li>
        <li class="schedule-item">
          <span class="schedule-label">🥗 Jantar</span>
          <span class="schedule-time">{{Jantar}}</span>
        </li>
        <li class="schedule-item">
          <span class="schedule-label">💪 Ginásio</span>
          <span class="schedule-time">{{Ginasio}}</span>
        </li>
      </ul>
    </div>

    <div class="alert-box">
      <strong>⚠️ Importante:</strong> O recolhimento aos dormitórios deve ocorrer pontualmente às 22:00.
    </div>
  </div>
  <div class="footer">
    <p>Este é um e-mail automático. Não responda.</p>
    <p>Versão do Plano: {{Versao}} | Total Missionários: {{QtdMissionarios}}</p>
  </div>
</div>
</body>
</html>`;

export const DEFAULT_SETTINGS: GlobalSettings = {
  baseStartTime: "06:30",
  template: DEFAULT_TEMPLATE,
  mealOffsets: {
    breakfast: {
      1: "07:30", 2: "07:45", 3: "08:00", 4: "08:15", 
      5: "08:30", 6: "08:45", 7: "09:00", 8: "09:15"
    },
    lunch: {
      1: "12:30", 2: "12:45", 3: "13:00", 4: "13:15", 
      5: "13:30", 6: "13:45", 7: "14:00", 8: "14:15"
    },
    dinner: {
      1: "18:00", 2: "18:15", 3: "18:30", 4: "18:45", 
      5: "19:00", 6: "19:15", 7: "19:30", 8: "19:45"
    }
  },
  gymOffsets: {
    1: "19:00", 2: "19:15", 3: "19:30", 4: "19:45",
    5: "20:00", 6: "20:15", 7: "20:30", 8: "20:45"
  },
  capacities: {
    cafeteria: 150,
    gym: 100,
    temple: 150
  },
  emailTemplate: DEFAULT_EMAIL_BODY
};

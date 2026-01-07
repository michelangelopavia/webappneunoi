import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, TrendingUp } from 'lucide-react';

export default function RiepilogoOreTurni({ turni, userId }) {
  // Filtra i turni: se userId è specificato usa solo quelli dell'utente, altrimenti escludi quelli con neu_guadagnati = 0 (associazione)
  const turniUtente = userId 
    ? turni.filter(t => t.utente_id === userId) 
    : turni.filter(t => t.neu_guadagnati > 0);
  
  const calcStatistiche = () => {
    let oreStandard = 0;  // 9:00-18:30 lun-ven (2.5 NEU/h)
    let oreSerali = 0;    // 18:30-20:30 lun-ven (4 NEU/h)
    let oreExtra = 0;     // Weekend/festivi/altre (6 NEU/h)
    let neuTotali = 0;
    
    const festivitaItaliane = {
      2024: [
        '2024-01-01', '2024-01-06', '2024-04-01', '2024-04-25', '2024-05-01',
        '2024-06-02', '2024-08-15', '2024-11-01', '2024-12-08', '2024-12-25', '2024-12-26'
      ],
      2025: [
        '2025-01-01', '2025-01-06', '2025-04-20', '2025-04-21', '2025-04-25', '2025-05-01',
        '2025-06-02', '2025-08-15', '2025-11-01', '2025-12-08', '2025-12-25', '2025-12-26'
      ]
    };
    
    const isFestivo = (data) => {
      const anno = data.getFullYear();
      const dataStr = data.toISOString().split('T')[0];
      return festivitaItaliane[anno]?.includes(dataStr) || false;
    };
    
    turniUtente.forEach(turno => {
      const inizio = new Date(turno.data_inizio);
      const fine = new Date(turno.data_fine);
      let currentTime = new Date(inizio);
      
      while (currentTime < fine) {
        const giornoSettimana = currentTime.getDay();
        const isWeekend = giornoSettimana === 0 || giornoSettimana === 6;
        const isFest = isFestivo(currentTime);
        const ora = currentTime.getHours();
        const minuti = currentTime.getMinutes();
        const oraDecimale = ora + minuti / 60;
        
        const nextTime = new Date(currentTime.getTime() + 60000);
        const nextHour = nextTime > fine ? fine : nextTime;
        const minutiLavorati = (nextHour - currentTime) / 60000;
        const oreLavorate = minutiLavorati / 60;
        
        if (isWeekend || isFest) {
          oreExtra += oreLavorate;
        } else {
          if (oraDecimale >= 9 && oraDecimale < 18.5) {
            oreStandard += oreLavorate;
          } else if (oraDecimale >= 18.5 && oraDecimale < 20.5) {
            oreSerali += oreLavorate;
          } else {
            oreExtra += oreLavorate;
          }
        }
        
        currentTime = nextTime;
      }
      
      neuTotali += turno.neu_guadagnati || 0;
    });
    
    return {
      oreStandard: Math.round(oreStandard * 100) / 100,
      oreSerali: Math.round(oreSerali * 100) / 100,
      oreExtra: Math.round(oreExtra * 100) / 100,
      oreTotali: Math.round((oreStandard + oreSerali + oreExtra) * 100) / 100,
      neuTotali: Math.round(neuTotali * 100) / 100
    };
  };
  
  const stats = calcStatistiche();
  
  if (turniUtente.length === 0) {
    return null;
  }
  
  return (
    <div className="bg-white p-6 border-l-4 border-[#db222a]">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-6 h-6 text-[#053c5e]" />
        <h2 className="text-2xl font-bold text-[#053c5e]">{userId ? 'Riepilogo Ore Hosting Personali' : 'Riepilogo Ore Hosting Totali'}</h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#bfdbf7] p-4">
          <div className="text-xs text-[#053c5e] font-bold mb-1 uppercase">Ore Standard</div>
          <div className="text-2xl font-bold text-[#053c5e]">{stats.oreStandard}h</div>
          <div className="text-xs text-[#1f7a8c] mt-1">Lun-Ven 9-18:30</div>
          <div className="text-xs text-[#053c5e] font-semibold">2.5 NEU/h</div>
        </div>
        
        <div className="bg-[#1f7a8c] text-white p-4">
          <div className="text-xs font-bold mb-1 uppercase opacity-90">Ore Serali</div>
          <div className="text-2xl font-bold">{stats.oreSerali}h</div>
          <div className="text-xs mt-1 opacity-90">Lun-Ven 18:30-20:30</div>
          <div className="text-xs font-semibold">4 NEU/h</div>
        </div>
        
        <div className="bg-[#053c5e] text-white p-4">
          <div className="text-xs font-bold mb-1 uppercase opacity-90">Ore Extra</div>
          <div className="text-2xl font-bold">{stats.oreExtra}h</div>
          <div className="text-xs mt-1 opacity-90">Weekend/Festivi</div>
          <div className="text-xs font-semibold">6 NEU/h</div>
        </div>
        
        <div className="bg-[#db222a] text-white p-4">
          <div className="text-xs font-bold mb-1 uppercase opacity-90">Totale</div>
          <div className="text-2xl font-bold">{stats.oreTotali}h</div>
          <div className="text-xs mt-1 flex items-center gap-1 opacity-90">
            <TrendingUp className="w-3 h-3" />
            {stats.neuTotali} NEU
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Coins } from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, isSameMonth, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths } from 'date-fns';
import { it } from 'date-fns/locale';

export default function CalendarioTurni({ turni, onSelectTurno, vista }) {
  const [currentDate, setCurrentDate] = useState(new Date());

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
    const dataStr = format(data, 'yyyy-MM-dd');
    return festivitaItaliane[anno]?.includes(dataStr) || false;
  };

  const getTurniForDay = (day) => {
    return turni
      .filter(t => isSameDay(new Date(t.data_inizio), day))
      .sort((a, b) => new Date(a.data_inizio) - new Date(b.data_inizio));
  };

  const renderGiorno = () => {
    const turniGiorno = getTurniForDay(currentDate);

    return (
      <div className="space-y-4">
        <div className="text-center py-6 bg-[#053c5e] text-white">
          <h3 className="text-2xl font-bold">
            {format(currentDate, 'EEEE d MMMM yyyy', { locale: it })}
          </h3>
        </div>

        {turniGiorno.length === 0 ? (
          <div className="text-center py-12 bg-[#bfdbf7] text-[#053c5e]">
            Nessun turno per questo giorno
          </div>
        ) : (
          <div className="space-y-3">
            {turniGiorno.map(turno => (
              <div
                key={turno.id}
                className="bg-white p-4 border-l-4 border-[#1f7a8c] cursor-pointer hover:bg-[#bfdbf7] transition-colors"
                onClick={() => onSelectTurno(turno)}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-lg text-[#053c5e]">{turno.utente_nome}</div>
                    <div className="text-sm text-[#053c5e] mt-1 font-semibold">
                      {new Date(turno.data_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} -
                      {new Date(turno.data_fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="text-xs text-[#1f7a8c] mt-1">{turno.ore_lavorate}h</div>
                  </div>
                  <div className="flex items-center gap-1 text-[#db222a] font-bold text-xl">
                    <Coins className="w-5 h-5" />
                    {turno.neu_guadagnati}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderSettimana = () => {
    const start = startOfWeek(currentDate, { locale: it });
    const end = endOfWeek(currentDate, { locale: it });
    const days = eachDayOfInterval({ start, end });

    return (
      <div className="space-y-4">
        <div className="text-center py-4 bg-[#053c5e] text-white">
          <h3 className="text-xl font-bold">
            {format(start, 'd MMM', { locale: it })} - {format(end, 'd MMM yyyy', { locale: it })}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map(day => {
            const turniDay = getTurniForDay(day);
            const isToday = isSameDay(day, new Date());
            const isFestivoDay = isFestivo(day);

            return (
              <div
                key={day.toString()}
                className={`border-2 p-2 min-h-[140px] ${isToday ? 'bg-[#bfdbf7] border-[#db222a]' :
                    isFestivoDay ? 'bg-red-50 border-[#db222a]' :
                      'bg-white border-[#1f7a8c]'
                  }`}
              >
                <div className={`text-center font-bold mb-2 ${isToday ? 'text-[#db222a]' :
                    isFestivoDay ? 'text-[#db222a]' :
                      'text-[#053c5e]'
                  }`}>
                  {format(day, 'EEE d', { locale: it })}
                </div>
                <div className="space-y-1">
                  {turniDay.map(turno => (
                    <div
                      key={turno.id}
                      className="text-xs p-1 bg-[#053c5e] text-white cursor-pointer hover:bg-[#1f7a8c]"
                      onClick={() => onSelectTurno(turno)}
                    >
                      <div className="font-semibold truncate">{turno.utente_nome}</div>
                      <div className="text-[10px] opacity-90">
                        {new Date(turno.data_inizio).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })} - {new Date(turno.data_fine).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderMese = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const startWeek = startOfWeek(start, { locale: it });
    const endWeek = endOfWeek(end, { locale: it });
    const days = eachDayOfInterval({ start: startWeek, end: endWeek });

    return (
      <div className="space-y-4">
        <div className="text-center py-4 bg-[#053c5e] text-white">
          <h3 className="text-xl font-bold">
            {format(currentDate, 'MMMM yyyy', { locale: it })}
          </h3>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'].map(day => (
            <div key={day} className="text-center font-bold text-sm text-[#053c5e] py-2 bg-[#bfdbf7]">
              {day}
            </div>
          ))}

          {days.map(day => {
            const turniDay = getTurniForDay(day);
            const isToday = isSameDay(day, new Date());
            const isCurrentMonth = isSameMonth(day, currentDate);
            const isFestivoDay = isFestivo(day);

            return (
              <div
                key={day.toString()}
                className={`border p-1 min-h-[80px] ${isToday ? 'bg-[#bfdbf7] border-[#db222a] border-2' :
                    isFestivoDay && isCurrentMonth ? 'bg-red-50 border-[#db222a]' :
                      isCurrentMonth ? 'bg-white border-[#1f7a8c]' : 'bg-slate-100 border-slate-300'
                  }`}
              >
                <div className={`text-center text-sm font-bold mb-1 ${isToday ? 'text-[#db222a]' :
                    isFestivoDay && isCurrentMonth ? 'text-[#db222a]' :
                      isCurrentMonth ? 'text-[#053c5e]' : 'text-slate-400'
                  }`}>
                  {format(day, 'd')}
                </div>
                {turniDay.length > 0 && (
                  <div className="text-center">
                    <div
                      className="text-[10px] px-1 py-0.5 cursor-pointer bg-[#db222a] hover:bg-[#053c5e] text-white font-semibold"
                      onClick={() => onSelectTurno(turniDay[0])}
                    >
                      {turniDay.length} {turniDay.length === 1 ? 'turno' : 'turni'}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const handlePrevious = () => {
    if (vista === 'giorno') setCurrentDate(subDays(currentDate, 1));
    if (vista === 'settimana') setCurrentDate(subWeeks(currentDate, 1));
    if (vista === 'mese') setCurrentDate(subMonths(currentDate, 1));
  };

  const handleNext = () => {
    if (vista === 'giorno') setCurrentDate(addDays(currentDate, 1));
    if (vista === 'settimana') setCurrentDate(addWeeks(currentDate, 1));
    if (vista === 'mese') setCurrentDate(addMonths(currentDate, 1));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button className="bg-[#1f7a8c] hover:bg-[#053c5e] text-white" onClick={handlePrevious}>
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <Button className="bg-[#053c5e] hover:bg-[#1f7a8c] text-white" onClick={() => setCurrentDate(new Date())}>
          Oggi
        </Button>
        <Button className="bg-[#1f7a8c] hover:bg-[#053c5e] text-white" onClick={handleNext}>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {vista === 'giorno' && renderGiorno()}
      {vista === 'settimana' && renderSettimana()}
      {vista === 'mese' && renderMese()}
    </div>
  );
}

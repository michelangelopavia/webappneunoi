import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function CalendarioGriglia({ sale, prenotazioni, onNuovaPrenotazione }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [vistaSettimana, setVistaSettimana] = useState(false);
  const [dataCorrente, setDataCorrente] = useState(new Date());
  const [inizioSettimana, setInizioSettimana] = useState(() => {
    const oggi = new Date();
    const giorno = oggi.getDay();
    const diff = giorno === 0 ? -6 : 1 - giorno;
    const lunedi = new Date(oggi);
    lunedi.setDate(oggi.getDate() + diff);
    lunedi.setHours(0, 0, 0, 0);
    return lunedi;
  });
  const [saleSelezionate, setSaleSelezionate] = useState([]);

  useEffect(() => {
    if (saleSelezionate.length === 0 && sale.length > 0) {
      setSaleSelezionate(sale.map(s => s.id));
    }
  }, [sale]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile) setVistaSettimana(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const START_HOUR = 9;
  const END_HOUR = 19; // Fino alle 19:00 per coprire fino alle 18:30+
  const PIXELS_PER_HOUR = 60;

  const oreGiornata = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  const giorniSettimana = Array.from({ length: 5 }, (_, i) => {
    const giorno = new Date(inizioSettimana);
    giorno.setDate(giorno.getDate() + i);
    return giorno;
  });

  const saleFiltrate = sale.filter(s => saleSelezionate.includes(s.id));

  const navigaSettimana = (direzione) => {
    const nuova = new Date(inizioSettimana);
    nuova.setDate(nuova.getDate() + (direzione * 7));
    setInizioSettimana(nuova);
  };

  const navigaGiorno = (direzione) => {
    const nuova = new Date(dataCorrente);
    nuova.setDate(nuova.getDate() + direzione);
    setDataCorrente(nuova);
  };

  const toggleSala = (salaId) => {
    setSaleSelezionate(prev =>
      prev.includes(salaId) ? prev.filter(id => id !== salaId) : [...prev, salaId]
    );
  };

  const toggleTutte = () => {
    setSaleSelezionate(saleSelezionate.length === sale.length ? [] : sale.map(s => s.id));
  };

  const getFormatoSettimana = () => {
    const fine = new Date(inizioSettimana);
    fine.setDate(fine.getDate() + 4);
    return `${inizioSettimana.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })} - ${fine.toLocaleDateString('it-IT', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  };

  // Helper per calcolare posizione e altezza
  const getStylePrenotazione = (inizio, fine) => {
    const startH = inizio.getHours();
    const startM = inizio.getMinutes();
    const endH = fine.getHours();
    const endM = fine.getMinutes();

    // Calcolo offset dall'inizio giornata (ore 9:00)
    const minutesFromStart = (startH - START_HOUR) * 60 + startM;
    const durationMinutes = (endH * 60 + endM) - (startH * 60 + startM);

    const top = (minutesFromStart / 60) * PIXELS_PER_HOUR;
    const height = (durationMinutes / 60) * PIXELS_PER_HOUR;

    return {
      top: `${top}px`,
      height: `${height}px`,
      minHeight: '20px' // Ensure visibility for very short events
    };
  };

  return (
    <Card>
      <CardHeader>
        <div className="space-y-4">
          {/* Header Controls (invariato) */}
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <CalendarIcon className="w-5 h-5 text-[#1f7a8c]" />
              <CardTitle>Calendario Sale</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {!isMobile && (
                <div className="flex gap-1 border border-slate-300 rounded-md p-1">
                  <Button size="sm" variant={!vistaSettimana ? 'default' : 'ghost'} onClick={() => setVistaSettimana(false)} className={!vistaSettimana ? 'bg-[#053c5e] hover:bg-[#1f7a8c]' : ''}>Giorno</Button>
                  <Button size="sm" variant={vistaSettimana ? 'default' : 'ghost'} onClick={() => setVistaSettimana(true)} className={vistaSettimana ? 'bg-[#053c5e] hover:bg-[#1f7a8c]' : ''}>Settimana</Button>
                </div>
              )}
              {onNuovaPrenotazione && (
                <Button onClick={() => onNuovaPrenotazione(null, null)} className="bg-[#053c5e] hover:bg-[#1f7a8c]">
                  <Plus className="w-4 h-4 mr-2" /> Crea
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => vistaSettimana ? navigaSettimana(-1) : navigaGiorno(-1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="text-sm font-semibold text-[#053c5e] min-w-[200px] text-center">
                {vistaSettimana ? getFormatoSettimana() : dataCorrente.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
              <Button variant="outline" size="sm" onClick={() => vistaSettimana ? navigaSettimana(1) : navigaGiorno(1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Checkbox id="tutte" checked={saleSelezionate.length === sale.length} onCheckedChange={toggleTutte} />
              <label htmlFor="tutte" className="text-sm font-semibold cursor-pointer">Tutte le sale</label>
            </div>
            <div className="flex flex-wrap gap-2">
              {sale.map(sala => (
                <div key={sala.id} className="flex items-center space-x-2">
                  <Checkbox id={sala.id} checked={saleSelezionate.includes(sala.id)} onCheckedChange={() => toggleSala(sala.id)} />
                  <label htmlFor={sala.id} className="text-sm cursor-pointer flex items-center gap-2">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: sala.colore || '#1f7a8c' }} />
                    {sala.nome}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {saleFiltrate.length === 0 ? (
          <p className="text-center text-slate-500 py-8">Seleziona almeno una sala</p>
        ) : (
          <div className="border rounded-lg overflow-hidden flex flex-col h-[650px] relative">

            {/* Header Columns */}
            <div className="flex border-b bg-slate-100 z-10 sticky top-0">
              {/* Time Column Header (Empty) */}
              <div className="w-16 flex-shrink-0 border-r bg-white"></div>

              {/* Columns Headers */}
              <div className="flex-1 flex overflow-hidden">
                {vistaSettimana ? (
                  giorniSettimana.map(giorno => (
                    <div key={giorno.toISOString()} className="flex-1 flex flex-col items-center justify-center p-2 border-r last:border-r-0 min-w-[100px] bg-[#053c5e] text-white">
                      <span className="text-xs uppercase opacity-80">{giorno.toLocaleDateString('it-IT', { weekday: 'short' })}</span>
                      <span className="font-bold">{giorno.getDate()}</span>
                    </div>
                  ))
                ) : (
                  saleFiltrate.map(sala => (
                    <div key={sala.id} className="flex-1 flex items-center justify-center p-3 border-r last:border-r-0 min-w-[120px] bg-[#053c5e] text-white font-bold">
                      <div className="w-3 h-3 rounded mr-2" style={{ backgroundColor: sala.colore || '#1f7a8c' }} />
                      {sala.nome}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Scrollable Grid Area */}
            <div className="flex-1 overflow-y-auto relative">
              <div className="flex relative" style={{ height: `${(END_HOUR - START_HOUR) * PIXELS_PER_HOUR}px` }}> {/* Total height based on hours */}

                {/* Time Labels Column */}
                <div className="w-16 flex-shrink-0 border-r bg-white sticky left-0 z-10">
                  {oreGiornata.map((ora, index) => (
                    <div key={ora} className="absolute w-full text-right pr-2 text-xs text-slate-500 -mt-2" style={{ top: `${index * PIXELS_PER_HOUR}px` }}>
                      {ora}:00
                    </div>
                  ))}
                </div>

                {/* Grid Body */}
                <div className="flex-1 relative bg-white">
                  {/* Horizontal Grid Lines */}
                  {oreGiornata.map((_, index) => (
                    <div key={index} className="absolute w-full border-t border-slate-200" style={{ top: `${index * PIXELS_PER_HOUR}px` }}></div>
                  ))}

                  {/* Vertical Dividing Lines & Events */}
                  <div className="absolute inset-0 flex">
                    {vistaSettimana ? (
                      giorniSettimana.map(giorno => (
                        <div key={giorno.toISOString()} className="flex-1 border-r last:border-r-0 relative min-w-[100px]">
                          {saleFiltrate.map(sala => {
                            const events = prenotazioni.filter(p => {
                              if (p.sala_id !== sala.id || p.stato !== 'confermata') return false;
                              const pDate = new Date(p.data_inizio);
                              return pDate.getDate() === giorno.getDate() &&
                                pDate.getMonth() === giorno.getMonth() &&
                                pDate.getFullYear() === giorno.getFullYear();
                            });

                            return events.map(p => {
                              const inizio = new Date(p.data_inizio);
                              const fine = new Date(p.data_fine);
                              const style = getStylePrenotazione(inizio, fine);

                              return (
                                <div
                                  key={p.id}
                                  className="absolute left-0.5 right-0.5 rounded px-1 py-0.5 text-[10px] overflow-hidden hover:z-20 hover:shadow-lg transition-all border shadow-sm"
                                  style={{
                                    ...style,
                                    backgroundColor: sala.colore ? `${sala.colore}20` : '#e2e8f0', // 20 opacity hex
                                    borderColor: sala.colore || '#cbd5e1',
                                    borderLeftWidth: '3px'
                                  }}
                                  title={`${p.utente_nome} - ${p.tipo_utilizzo}`}
                                >
                                  <div className="font-bold text-[#053c5e] truncate">{p.utente_nome}</div>
                                  <div className="text-xs truncate">{inizio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {fine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                              );
                            });
                          })}
                        </div>
                      ))
                    ) : (
                      saleFiltrate.map(sala => (
                        <div key={sala.id} className="flex-1 border-r last:border-r-0 relative min-w-[120px]">
                          {prenotazioni
                            .filter(p => p.sala_id === sala.id && p.stato === 'confermata')
                            .filter(p => {
                              const pDate = new Date(p.data_inizio);
                              return pDate.getDate() === dataCorrente.getDate() &&
                                pDate.getMonth() === dataCorrente.getMonth() &&
                                pDate.getFullYear() === dataCorrente.getFullYear();
                            })
                            .map(p => {
                              const inizio = new Date(p.data_inizio);
                              const fine = new Date(p.data_fine);
                              const style = getStylePrenotazione(inizio, fine);

                              return (
                                <div
                                  key={p.id}
                                  className="absolute left-1 right-1 rounded p-2 text-xs overflow-hidden hover:z-20 hover:shadow-xl transition-all border shadow-sm cursor-pointer group"
                                  style={{
                                    ...style,
                                    backgroundColor: sala.colore ? `${sala.colore}20` : '#e2e8f0',
                                    borderColor: sala.colore || '#cbd5e1',
                                    borderLeftWidth: '4px'
                                  }}
                                >
                                  <div className="font-bold text-[#053c5e] truncate group-hover:whitespace-normal">{p.utente_nome}</div>
                                  <div className="text-slate-600 mb-1">{inizio.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {fine.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                  <Badge variant="outline" className="bg-white/50 border-slate-400 text-[10px] h-5">{p.tipo_utilizzo}</Badge>
                                </div>
                              );
                            })
                          }
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

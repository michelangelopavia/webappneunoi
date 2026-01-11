import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs as TabsUI, TabsContent as TabsContentUI, TabsList as TabsListUI, TabsTrigger as TabsTriggerUI } from '@/components/ui/tabs';
import { Coins, Clock, Users, TrendingUp, Globe, Award, Calendar, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import jsPDF from 'jspdf';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- Componente WorldMap ---
const WorldMap = ({ data }) => {
  // Coordinate approssimative per i paesi più comuni
  const countryCoords = {
    'Italy': { x: 520, y: 155 },
    'Italia': { x: 520, y: 155 },
    'France': { x: 485, y: 145 },
    'Francia': { x: 485, y: 145 },
    'Germany': { x: 512, y: 130 },
    'Germania': { x: 512, y: 130 },
    'Spain': { x: 465, y: 165 },
    'Spagna': { x: 465, y: 165 },
    'United Kingdom': { x: 470, y: 115 },
    'UK': { x: 470, y: 115 },
    'USA': { x: 180, y: 180 },
    'United States': { x: 180, y: 180 },
    'Brazil': { x: 300, y: 350 },
    'Brasile': { x: 300, y: 350 },
    'Australia': { x: 850, y: 380 },
    'Japan': { x: 880, y: 180 },
    'Giappone': { x: 880, y: 180 },
    'China': { x: 800, y: 190 },
    'Cina': { x: 800, y: 190 },
    'India': { x: 720, y: 240 },
    'Netherlands': { x: 495, y: 120 },
    'Olanda': { x: 495, y: 120 },
    'Portugal': { x: 450, y: 170 },
    'Portogallo': { x: 450, y: 170 },
    'Switzerland': { x: 505, y: 150 },
    'Svizzera': { x: 505, y: 150 },
    'Austria': { x: 520, y: 145 },
    'Belgium': { x: 490, y: 130 },
    'Belgio': { x: 490, y: 130 },
    'Denmark': { x: 510, y: 105 },
    'Danimarca': { x: 510, y: 105 },
    'Norway': { x: 510, y: 75 },
    'Norvegia': { x: 510, y: 75 },
    'Sweden': { x: 535, y: 80 },
    'Svezia': { x: 535, y: 80 },
    'Poland': { x: 555, y: 125 },
    'Polonia': { x: 555, y: 125 },
  };

  return (
    <div className="relative w-full h-full bg-[#bfdbf7]/20">
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full opacity-30 fill-slate-400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M165.4,142.1l-1.3,4.4l-5.6,2.2l-3,1.3l-2.9,2.4l-1.4,4.2l-0.7,5.9l0.9,7l5.2,10.6l2.1,3.2l5.6,2.9l5.3,0.3l1.8,0.7l0.2,4.8l-1.4,5.4l1.1,5.6l5.4,3.1l4,0.1l3.5-2.1l3.3,0.2l3.4-3.5l3.8-1l3.7,1.8l3.1-4l2.5-0.1l1.7-5.4l-0.3-6.9l-3.2-6.5l-0.9-4.8l2-4.1l5.4-4.8l3.7-0.3l6,1.4l5.9,4l4.3-1.6l0.2-6.6l-5.8-9l-3.2-3.8l0.9-3.7l6.6-4.5l5.1,0.2l4.8,2.7l3.8,4.2l1.6,4.5l0.1,6.5l5.3,8.7l4,4l6.1,1l5.1-1.3l2.8-4l0.1-4.8l-2.4-7.5l-0.9-5.4l2.1-4.8l5.2-4l4.5,0.7l4,2.8l4,1.4l4.1,4.5l0.3,5.9l-1.3,4.2l-1.3,4l1.4,5.4l5.6,3.8l5.3,0.1l3.1-2.9l3.5-0.1l2.4-5.2l0.2-7l-2.4-6.8l-5.6-8.5l-3.5-3.8l0.2-4.1l3.2-4.8l6.6-1.3l6.5,2.4l3.1,3.8l3.5,0.2l3.2-4.5l0.1-5.6l-2.4-6l-5.8-8.5l-3.1-4.1l0.9-6.3l3.5-3.7l6.9-3.5l6,0.3l5.4,3.1l4,2.8l5.4-1.3l2.8-4l-0.3-6.9l-4.1-9.3l-3.5-4.1l0.9-4.2l3.8-0.1l4.5,3.1l4,4l4.5,1.1l4-2.8l1.3-4l-1.6-4.2l-5.6-3.8l-3.5-3.8l-1.3-3.8l2.1-4l5.4-0.1l4.1,3.2l4.2,3.8l0.2,4.8l-1.4,3.8l-1.4,3.8l1.3,4.1l5.8,4.1l5.6,0.1l4-2.8l3.5-4l-0.9-5.6l-4.1-8.5l-3.1-4l0.2-4.2l3.7-0.1l4.8,3.2l4,4l5.4,1.3l4.2-2.8l1.4-4.2l-0.2-4.1L165.4,142.1z" />
        <path d="M485.4,142.1l-1.3,4.4l-5.6,2.2l-3,1.3l-2.9,2.4l-1.4,4.2l-0.7,5.9l0.9,7l5.2,10.6l2.1,3.2l5.6,2.9l5.3,0.3l1.8,0.7l0.2,4.8l-1.4,5.4l1.1,5.6l5.4,3.1l4,0.1l3.5-2.1l3.3,0.2l3.4-3.5l3.8-1l3.7,1.8l3.1-4l2.5-0.1l1.7-5.4l-0.3-6.9l-3.2-6.5l-0.9-4.8l2-4.1l5.4-4.8l3.7-0.3l6,1.4l5.9,4l4.3-1.6l0.2-6.6l-5.8-9l-3.2-3.8l0.9-3.7l6.6-4.5l5.1,0.2l4.8,2.7l3.8,4.2l1.6,4.5l0.1,6.5l5.3,8.7l4,4l6.1,1l5.1-1.3l2.8-4l0.1-4.8l-2.4-7.5l-0.9-5.4l2.1-4.8l5.2-4l4.5,0.7l4,2.8l4,1.4l4.1,4.5l0.3,5.9l-1.3,4.2l-1.3,4l1.4,5.4l5.6,3.8l5.3,0.1l3.1-2.9l3.5-0.1l2.4-5.2l0.2-7l-2.4-6.8l-5.6-8.5l-3.5-3.8l0.2-4.1l3.2-4.8l6.6-1.3l6.5,2.4l3.1,3.8l3.5,0.2l3.2-4.5l0.1-5.6l-2.4-6l-5.8-8.5l-3.1-4.1l0.9-6.3l3.5-3.7l6.9-3.5l6,0.3l5.4,3.1l4,2.8l5.4-1.3l2.8-4l-0.3-6.9l-4.1-9.3l-3.5-4.1l0.9-4.2l3.8-0.1l4.5,3.1l4,4l4.5,1.1l4-2.8l1.3-4l-1.6-4.2l-5.6-3.8l-3.5-3.8l-1.3-3.8l2.1-4l5.4-0.1l4.1,3.2l4.2,3.8l0.2,4.8l-1.4,3.8l-1.4,3.8l1.3,4.1l5.8,4.1l5.6,0.1l4-2.8l3.5-4l-0.9-5.6l-4.1-8.5l-3.1-4l0.2-4.2l3.7-0.1l4.8,3.2l4,4l5.4,1.3l4.2-2.8l1.4-4.2l-0.2-4.1L485.4,142.1z" />
        {/* Simplified Shapes for Continental outlines */}
        <rect x="100" y="80" width="300" height="250" rx="20" className="opacity-10" />
        <rect x="450" y="50" width="200" height="200" rx="30" className="opacity-20" />
        <rect x="680" y="100" width="250" height="250" rx="40" className="opacity-10" />
        <rect x="250" y="300" width="150" height="150" rx="50" className="opacity-15" />
        <rect x="750" y="320" width="180" height="120" rx="60" className="opacity-10" />
      </svg>

      {/* Puntini provenienti dai soci */}
      {data.map((item) => {
        const coords = countryCoords[item.nome];
        if (!coords) return null;

        // Calcola dimensione in base al count (min 8px, max 24px)
        const size = Math.min(24, 8 + (item.count * 2));

        return (
          <div
            key={item.nome}
            className="absolute rounded-full bg-[#1f7a8c] border-2 border-white shadow-lg animate-pulse"
            style={{
              left: `${(coords.x / 1000) * 100}%`,
              top: `${(coords.y / 500) * 100}%`,
              width: `${size}px`,
              height: `${size}px`,
              marginLeft: `-${size / 2}px`,
              marginTop: `-${size / 2}px`
            }}
            title={`${item.nome}: ${item.count} persone`}
          />
        );
      })}

      <div className="absolute bottom-2 left-2 bg-white/80 p-1 px-2 rounded text-[10px] text-slate-500 shadow-sm border">
        Mappa stilizzata aggregata per Paese
      </div>
    </div>
  );
};

export default function RiepilogoAnnuale() {
  const now = new Date();
  const annoCorrente = now.getFullYear();
  const meseCorrente = now.getMonth();

  const generateYearsRange = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const solarYears = generateYearsRange(2024, annoCorrente);
  const currentAssocStartYear = meseCorrente >= 9 ? annoCorrente : annoCorrente - 1;
  const assocYearsStart = generateYearsRange(2024, currentAssocStartYear);

  // Default Calendar Year: previous year (last completed one)
  const [calendarYear, setCalendarYear] = useState(annoCorrente - 1);

  // Default Associative Year: handled similarly
  const defaultAssocStart = meseCorrente >= 9 ? annoCorrente - 1 : annoCorrente - 2;
  const defaultAssocStr = `${defaultAssocStart}/${(defaultAssocStart + 1).toString().slice(-2)}`;
  const [assocYear, setAssocYear] = useState(defaultAssocStr);

  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getLogoBase64 = () => {
    // Ritorna il logo in base64 per jsPDF (versione semplificata o via fetch se necessario)
    // Per ora usiamo il path, ma jsPDF funziona meglio con base64 in alcuni contesti
    return "/logo-white.png";
  };

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await neunoi.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error('Errore:', error);
      }
    };
    loadUser();
  }, []);

  // Fetch dati
  const { data: transazioni = [] } = useQuery({
    queryKey: ['transazioni'],
    queryFn: () => neunoi.entities.TransazioneNEU.list('-data_transazione'),
    initialData: []
  });

  const { data: turni = [] } = useQuery({
    queryKey: ['turni'],
    queryFn: () => neunoi.entities.TurnoHost.list('-data_inizio'),
    initialData: []
  });

  const { data: dichiarazioni = [] } = useQuery({
    queryKey: ['dichiarazioni_volontariato'],
    queryFn: () => neunoi.entities.DichiarazioneVolontariato.list({
      sort: '-data_dichiarazione',
      include: 'all'
    }),
    initialData: []
  });

  const { data: profili = [] } = useQuery({
    queryKey: ['profili'],
    queryFn: () => neunoi.entities.ProfiloCoworker.list('-created_date'),
    initialData: []
  });

  const { data: ingressi = [] } = useQuery({
    queryKey: ['ingressi'],
    queryFn: () => neunoi.entities.IngressoCoworking.list('-data_ingresso'),
    initialData: []
  });

  const { data: abbonamenti = [] } = useQuery({
    queryKey: ['abbonamenti'],
    queryFn: () => neunoi.entities.AbbonamentoUtente.list('-data_inizio'),
    initialData: []
  });

  // Helpers per Anno Associativo
  const getAssocRange = (assocStr) => {
    const startYear = parseInt(assocStr.split('/')[0]);
    const startDate = new Date(startYear, 9, 1); // October 1st
    const endDate = new Date(startYear + 1, 8, 30, 23, 59, 59); // September 30th of next year
    return { startDate, endDate };
  };

  const { startDate: assocStart, endDate: assocEnd } = getAssocRange(assocYear);

  // Filtra dati per Calendario
  const transazioniAnno = transazioni.filter(t => new Date(t.data_transazione).getFullYear() === calendarYear);
  const profiliAnno = profili.filter(p => new Date(p.data_compilazione || p.createdAt).getFullYear() === calendarYear);
  const ingressiAnno = ingressi.filter(i => new Date(i.data_ingresso).getFullYear() === calendarYear);
  const abbonamentiAnno = abbonamenti.filter(a => new Date(a.data_inizio).getFullYear() === calendarYear);

  // Filtra dati per Anno Associativo
  const turniAssoc = turni.filter(t => {
    const d = new Date(t.data_inizio);
    return d >= assocStart && d <= assocEnd;
  });
  const dichiarazioniAssoc = dichiarazioni.filter(d => {
    if (d.anno_associativo) return d.anno_associativo === assocYear;
    const date = new Date(d.data_dichiarazione);
    return date >= assocStart && date <= assocEnd;
  });

  // === STATISTICHE VOLONTARIATO (Anno Associativo) ===
  const oreHostTotali = turniAssoc.reduce((sum, t) => sum + (t.ore_lavorate || 0), 0);
  const personeHost = new Set(turniAssoc.map(t => t.utente_id)).size;

  const dichiarazioniClassiche = dichiarazioniAssoc.filter(d => !d.azione_id);
  const oreClassicheTotali = dichiarazioniClassiche.reduce((sum, d) => sum + (d.ore || 0), 0);
  const personeClassiche = new Set(dichiarazioniClassiche.map(d => d.user_id)).size;

  const dichiarazioniNEU = dichiarazioniAssoc.filter(d => d.azione_id);
  const neuAzioniTotali = dichiarazioniNEU.reduce((sum, d) => sum + (d.neu_guadagnati || 0), 0);
  const personeNEU = new Set(dichiarazioniNEU.map(d => d.user_id)).size;

  const ambitiClassici = dichiarazioniClassiche.reduce((acc, d) => {
    const ambito = d.AmbitoVolontariato?.nome || d.ambito_nome || 'Altro';
    acc[ambito] = (acc[ambito] || 0) + (d.ore || 0);
    return acc;
  }, {});

  const ambitiData = Object.entries(ambitiClassici).map(([nome, ore]) => ({
    nome,
    ore: Math.round(ore * 100) / 100
  })).sort((a, b) => b.ore - a.ore);

  // === STATISTICHE NEU (Anno Solare) ===
  const turniAnno = turni.filter(t =>
    new Date(t.data_inizio).getFullYear() === calendarYear &&
    (t.neu_guadagnati > 0)
  );

  const festivita = {
    2024: ['2024-01-01', '2024-01-06', '2024-04-01', '2024-04-25', '2024-05-01', '2024-06-02', '2024-08-15', '2024-11-01', '2024-12-08', '2024-12-25', '2024-12-26'],
    2025: ['2025-01-01', '2025-01-06', '2025-04-20', '2025-04-21', '2025-04-25', '2025-05-01', '2025-06-02', '2025-08-15', '2025-11-01', '2025-12-08', '2025-12-25', '2025-12-26']
  };

  let h_standard = 0, h_serale = 0, h_weekend = 0;

  turniAnno.forEach(t => {
    const inizio = new Date(t.data_inizio);
    const fine = new Date(t.data_fine);
    if (isNaN(inizio) || isNaN(fine) || fine <= inizio) return;

    let curr = new Date(inizio);
    while (curr < fine) {
      const day = curr.getDay();
      const isWeekend = day === 0 || day === 6;
      const dStr = curr.toISOString().split('T')[0];
      const isFest = festivita[curr.getFullYear()]?.includes(dStr);
      const hDec = curr.getHours() + curr.getMinutes() / 60;

      const step = 60000;
      const next = new Date(curr.getTime() + step);
      const actualNext = next > fine ? fine : next;
      const orePezzo = (actualNext - curr) / 3600000;

      if (isWeekend || isFest) {
        h_weekend += orePezzo * 6;
      } else {
        if (hDec >= 9 && hDec < 18.5) {
          h_standard += orePezzo * 2.5;
        } else if (hDec >= 18.5 && hDec < 20.5) {
          h_serale += orePezzo * 4;
        } else {
          h_weekend += orePezzo * 6;
        }
      }
      curr = next;
    }
  });

  const nHost = h_standard + h_serale + h_weekend;

  const dichiarazioniAnno = dichiarazioni.filter(d => new Date(d.data_dichiarazione).getFullYear() === calendarYear);
  const nVolontariato = dichiarazioniAnno.reduce((sum, d) => sum + (d.neu_guadagnati || 0), 0);
  const nCompiti = transazioniAnno.filter(t => t.tipo === 'compito_specifico' && t.a_utente_id !== null).reduce((sum, t) => sum + (t.importo || 0), 0);
  const nVoto = transazioniAnno.filter(t => t.tipo === 'voto_annuale' && t.a_utente_id !== null).reduce((sum, t) => sum + (t.importo || 0), 0);

  const neuImmessi = nHost + nCompiti + nVolontariato + nVoto;

  const transazioniScambio = transazioniAnno.filter(t =>
    (t.tipo === 'trasferimento_soci' || t.tipo === 'pagamento_associazione') &&
    t.da_utente_id !== null // Esclude i duplicati "Sconosciuto" derivanti da import errati
  );
  const neuScambiati = transazioniScambio.reduce((sum, t) => sum + (t.importo || 0), 0);

  const neuScadutiAnno = transazioniAnno.filter(t =>
    (t.da_utente_id && !t.a_utente_id) &&
    (t.tipo === 'scadenza' || t.tipo === 'scadenza_neu' ||
      t.causale?.toLowerCase().includes('scadenza') ||
      t.causale?.toLowerCase().includes('scadut'))
  ).reduce((sum, t) => sum + (t.importo || 0), 0);

  // Dettaglio Utilizzo NEU per Macro-Categorie
  const aggregazioneNeu = {
    'Servizi Coworking': 0,
    'Quota Associativa': 0,
    'Scambi tra Soci': 0
  };

  transazioniScambio.forEach(t => {
    const importo = t.importo || 0;
    const causale = (t.causale || '').toLowerCase();

    if (t.tipo === 'trasferimento_soci') {
      aggregazioneNeu['Scambi tra Soci'] += importo;
    } else if (t.tipo === 'pagamento_associazione') {
      if (causale.includes('quota') || causale.includes('associativa') || causale.includes('iscrizione')) {
        aggregazioneNeu['Quota Associativa'] += importo;
      } else {
        // Assumiamo che tutto il resto pagato all'associazione sia per servizi/coworking
        aggregazioneNeu['Servizi Coworking'] += importo;
      }
    }
  });

  const neuUsageData = Object.entries(aggregazioneNeu)
    .filter(([_, val]) => val > 0)
    .map(([nome, valore]) => ({ nome, valore: Math.round(valore * 100) / 100 }))
    .sort((a, b) => b.valore - a.valore);

  const neuDashboardData = [
    { nome: 'NEU Immessi (Totale)', valore: Math.round(neuImmessi * 10) / 10 },
    { nome: ' - da Turni Host', valore: Math.round(nHost * 10) / 10 },
    { nome: ' - da Volontariato', valore: Math.round(nVolontariato * 10) / 10 },
    { nome: ' - da Compiti Specifici', valore: Math.round(nCompiti * 10) / 10 },
    { nome: ' - da Voto Annuale', valore: Math.round(nVoto * 10) / 10 },
    { nome: 'NEU Scambiati/Spesi', valore: Math.round(neuScambiati * 10) / 10 },
    { nome: 'NEU Scaduti', valore: Math.round(neuScadutiAnno * 10) / 10 }
  ];

  // === STATISTICHE COWORKING (Anno Solare) ===
  // Filter out legal entities for human-centric statistics
  const profiliUmaniAnno = profiliAnno.filter(p =>
    p.genere !== 'ente giuridico' &&
    !['neu noi', 'rewild sicily'].includes(`${p.first_name || ''} ${p.last_name || ''}`.trim().toLowerCase())
  );

  const totalePersone = profiliUmaniAnno.length;

  const calculateAverageAge = (profiles) => {
    if (profiles.length === 0) return 0;
    const today = new Date();
    const validProfiles = profiles.filter(p => p.data_nascita);
    if (validProfiles.length === 0) return 0;

    const ages = validProfiles.map(p => {
      const birthDate = new Date(p.data_nascita);
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    });

    const sum = ages.reduce((a, b) => a + b, 0);
    return Math.round((sum / ages.length) * 10) / 10;
  };

  const etaMedia = calculateAverageAge(profiliUmaniAnno);

  const normalizeCountry = (name) => {
    if (!name) return 'Non specificato';
    const n = name.trim().toLowerCase();
    if (n === 'italy' || n === 'italia' || n === 'it') return 'Italia';
    if (n === 'united kingdom' || n === 'uk' || n === 'gran bretagna' || n === 'england') return 'UK';
    if (n === 'germany' || n === 'deutschland' || n === 'germania') return 'Germania';
    if (n === 'france' || n === 'francia') return 'Francia';
    if (n === 'spain' || n === 'spagna' || n === 'espana') return 'Spagna';
    if (n === 'netherlands' || n === 'olanda' || n === 'nederland') return 'Olanda';
    if (n === 'usa' || n === 'united states' || n === 'stati uniti') return 'USA';
    if (n === 'switzerland' || n === 'svizzera') return 'Svizzera';
    if (n === 'brazil' || n === 'brasile') return 'Brasile';
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const stati = profiliUmaniAnno.reduce((acc, p) => {
    const rawStato = p.paese_residenza || p.citta_residenza?.split(',')[1]?.trim();
    const stato = normalizeCountry(rawStato);
    acc[stato] = (acc[stato] || 0) + 1;
    return acc;
  }, {});

  const statiDataFull = Object.entries(stati)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count);

  const statiData = statiDataFull.slice(0, 10);

  const generi = profiliUmaniAnno.reduce((acc, p) => {
    const genere = p.genere || 'altro';
    const label = {
      'maschio': 'Maschio',
      'femmina': 'Femmina',
      'altro': 'Altro'
    }[genere] || 'Altro';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});

  const percMaschio = totalePersone > 0 ? (((generi['Maschio'] || 0) / totalePersone) * 100).toFixed(1) : 0;
  const percFemmina = totalePersone > 0 ? (((generi['Femmina'] || 0) / totalePersone) * 100).toFixed(1) : 0;
  const percAltro = totalePersone > 0 ? (((generi['Altro'] || 0) / totalePersone) * 100).toFixed(1) : 0;

  const tipiIngresso = ingressiAnno.reduce((acc, i) => {
    acc[i.tipo] = (acc[i.tipo] || 0) + 1;
    return acc;
  }, {});

  const tipiIngressoData = Object.entries(tipiIngresso).map(([tipo, count]) => ({
    nome: tipo === 'giornaliero' ? 'Giornaliero' : tipo === 'abbonamento' ? 'Abbonamento' : 'Carnet',
    count
  }));

  // === STATISTICHE VENDITE (Ordini) ===
  const { data: ordini = [] } = useQuery({
    queryKey: ['ordini'],
    queryFn: () => neunoi.entities.OrdineCoworking.list('-data_ordine'),
    initialData: []
  });

  const ordiniAnno = ordini.filter(o => new Date(o.data_ordine).getFullYear() === calendarYear);

  const serviziVenduti = ordiniAnno.reduce((acc, ordine) => {
    let prodotti = ordine.prodotti;
    if (typeof prodotti === 'string') {
      try { prodotti = JSON.parse(prodotti); } catch (e) { prodotti = []; }
    }
    if (!Array.isArray(prodotti)) prodotti = [];

    prodotti.forEach(prod => {
      const nome = prod.tipo_abbonamento_nome || 'Sconosciuto';
      acc[nome] = (acc[nome] || 0) + (prod.quantita || 1);
    });
    return acc;
  }, {});

  const serviziVendutiData = Object.entries(serviziVenduti)
    .map(([nome, count]) => ({ nome, count }))
    .sort((a, b) => b.count - a.count);

  const COLORS = ['#053c5e', '#1f7a8c', '#db222a', '#bfdbf7', '#f4a261', '#e76f51', '#2a9d8f'];

  const anniPdf = Array.from({ length: 5 }, (_, i) => annoCorrente - i).filter(anno => anno >= 2024);

  const addPDFHeader = (pdf, title, subtitle, color = [5, 60, 94]) => {
    const margin = 20;
    // Fondo Header
    pdf.setFillColor(color[0], color[1], color[2]);
    pdf.rect(0, 0, 210, 50, 'F');

    // Logo (Proviamo a caricarlo, altrimenti testo)
    try {
      // Nota: jsPDF addImage con URL può essere sincrono o asincrono. 
      // In questo contesto usiamo un approccio robusto
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(28);
      pdf.text('neu [nòi]', margin, 25);
    } catch (e) {
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(24);
      pdf.text('neu [nòi]', margin, 25);
    }

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    pdf.text('SPAZIO AL LAVORO APS', margin, 32);

    // Titolo Report
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(title.toUpperCase(), margin, 42);
    if (subtitle) {
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'italic');
      pdf.text(subtitle, 190, 42, { align: 'right' });
    }

    pdf.setTextColor(0, 0, 0); // Reset colore testo per il corpo del documento
    return 65; // Nuova yPos dopo l'header
  };

  const addPDFFooter = (pdf) => {
    const pageCount = pdf.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFont('helvetica', 'italic');
      pdf.setFontSize(8);
      pdf.setTextColor(150, 150, 150);
      pdf.text(
        `Report generato il ${new Date().toLocaleDateString('it-IT')} • neu [nòi] spazio al lavoro APS • Pagina ${i} di ${pageCount}`,
        105, 285, { align: 'center' }
      );
    }
  };

  const generaPDF = async (anno) => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = addPDFHeader(pdf, `Riepilogo Annuale ${anno}`, `Dati aggregati ${anno}`);
    const margin = 20;

    // Filtra dati per l'anno del PDF
    const turniPdf = turni.filter(t => new Date(t.data_inizio).getFullYear() === anno);
    const transazioniPdf = transazioni.filter(t => t.data_transazione && new Date(t.data_transazione).getFullYear() === anno);

    // Sistema NEU
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(5, 60, 94);
    pdf.text('1. SISTEMA NEU', margin, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• NEU Immessi nel sistema: ${Math.round(neuImmessi * 100) / 100}`, margin + 5, yPos); yPos += 7;
    pdf.text(`• Volume scambi e rimborsi: ${Math.round(neuScambiati * 100) / 100}`, margin + 5, yPos); yPos += 7;
    pdf.text(`• NEU scaduti e rimossi: ${Math.round(neuScadutiAnno * 100) / 100}`, margin + 5, yPos); yPos += 15;

    // Volontariato
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(31, 122, 140);
    pdf.text('2. VOLONTARIATO', margin, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• Ore Host totali: ${Math.round(oreHostTotali * 10) / 10}`, margin + 5, yPos); yPos += 7;
    pdf.text(`• Ore Volontariato (Ambiti): ${Math.round(oreClassicheTotali * 10) / 10}`, margin + 5, yPos); yPos += 7;
    pdf.text(`• Rimborsi NEU per azioni: ${Math.round(neuAzioniTotali * 10) / 10}`, margin + 5, yPos); yPos += 15;

    // Coworking
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(219, 34, 42);
    pdf.text('3. COWORKING', margin, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.setTextColor(60, 60, 60);
    pdf.text(`• Utenti unici registrati: ${totalePersone}`, margin + 5, yPos); yPos += 7;
    pdf.text(`• Età media coworker: ${etaMedia} anni`, margin + 5, yPos); yPos += 7;
    pdf.text(`• Ingressi totali registrati: ${ingressiAnno.length}`, margin + 5, yPos);

    addPDFFooter(pdf);
    pdf.save(`riepilogo_${anno}_neunoi.pdf`);
  };

  const downloadVolontariatoPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = addPDFHeader(pdf, 'Report Volontariato', `Anno Associativo ${assocYear}`, [31, 122, 140]);
    const margin = 20;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('DETTAGLIO ATTIVITÀ', margin, yPos);
    yPos += 10;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`• Ore di Hosting (gestione spazio): ${Math.round(oreHostTotali * 10) / 10}h`, margin + 5, yPos);
    yPos += 7;
    pdf.text(`• Soci Host coinvolti: ${personeHost}`, margin + 5, yPos);
    yPos += 12;

    pdf.setFont('helvetica', 'bold');
    pdf.text('VOLONTARIATO PER AMBITO', margin + 5, yPos);
    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    ambitiData.forEach(item => {
      if (yPos > 260) { pdf.addPage(); yPos = 20; }
      pdf.text(`- ${item.nome}: ${item.ore}h`, margin + 10, yPos);
      yPos += 7;
    });

    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('IMPULSI NEU', margin + 5, yPos);
    yPos += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.text(`• NEU elargiti per azioni specifiche: ${Math.round(neuAzioniTotali * 10) / 10} NEU`, margin + 10, yPos);

    addPDFFooter(pdf);
    pdf.save(`volontariato_${assocYear.replace('/', '-')}.pdf`);
  };

  const downloadNeuPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = addPDFHeader(pdf, 'Report Sistema NEU', `Anno Solare ${calendarYear}`, [219, 34, 42]);
    const margin = 20;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('CIRCOLAZIONE MONETA COMPLEMENTARE', margin, yPos);
    yPos += 12;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    neuDashboardData.forEach(item => {
      if (yPos > 270) { pdf.addPage(); yPos = 20; }
      const isHeader = !item.nome.startsWith(' -');
      if (isHeader) {
        pdf.setFont('helvetica', 'bold');
        yPos += 3;
      } else {
        pdf.setFont('helvetica', 'normal');
      }
      pdf.text(`${item.nome}:`, margin + 5, yPos);
      pdf.text(`${item.valore} NEU`, 190, yPos, { align: 'right' });
      yPos += 8;
    });

    yPos += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.text('UTILIZZO NEU PER CATEGORIA', margin, yPos);
    yPos += 10;
    pdf.setFont('helvetica', 'normal');
    neuUsageData.forEach(item => {
      pdf.text(`- ${item.nome}:`, margin + 5, yPos);
      pdf.text(`${item.valore} NEU`, 190, yPos, { align: 'right' });
      yPos += 7;
    });

    addPDFFooter(pdf);
    pdf.save(`riepilogo_neu_${calendarYear}.pdf`);
  };

  const downloadCoworkingPDF = async () => {
    const pdf = new jsPDF('p', 'mm', 'a4');
    let yPos = addPDFHeader(pdf, 'Report Coworking', `Anno Solare ${calendarYear}`, [5, 60, 94]);
    const margin = 20;

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(13);
    pdf.text('STATISTICHE COMMUNITY', margin, yPos);
    yPos += 12;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(`• Persone attive nel periodo: ${totalePersone}`, margin + 5, yPos); yPos += 8;
    pdf.text(`• Età media della community: ${etaMedia} anni`, margin + 5, yPos); yPos += 8;
    pdf.text(`• Ingressi totali registrati: ${ingressiAnno.length}`, margin + 5, yPos); yPos += 8;
    pdf.text(`• Abbonamenti attivi: ${abbonamentiAnno.length}`, margin + 5, yPos);
    yPos += 15;

    pdf.setFont('helvetica', 'bold');
    pdf.text('DETTAGLIO SERVIZI E VENDITE', margin, yPos);
    yPos += 10;
    pdf.setFont('helvetica', 'normal');

    if (serviziVendutiData.length > 0) {
      serviziVendutiData.forEach(item => {
        if (yPos > 270) { pdf.addPage(); yPos = 20; }
        pdf.text(`- ${item.nome}:`, margin + 5, yPos);
        pdf.text(`${item.count} unità`, 190, yPos, { align: 'right' });
        yPos += 7;
      });
    } else {
      pdf.text('Nessuna vendita registrata nel periodo selezionato.', margin + 5, yPos);
    }

    addPDFFooter(pdf);
    pdf.save(`riepilogo_coworking_${calendarYear}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Header con Selettori */}
      <div className="bg-[#053c5e] text-white p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <h1 className="text-4xl font-bold">Riepilogo Annuale</h1>
            <p className="text-lg opacity-90 mt-2">Dati e statistiche dell'associazione</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
            <div className="bg-white/10 p-4 rounded border border-white/20 w-full sm:w-auto">
              <label className="text-white mb-2 block text-xs uppercase font-bold px-1">Filtro Volontariato</label>
              <Select value={assocYear} onValueChange={setAssocYear}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white text-slate-800">
                  <SelectValue placeholder="Anno Associativo" />
                </SelectTrigger>
                <SelectContent>
                  {assocYearsStart.map((startYear) => (
                    <SelectItem key={startYear} value={`${startYear}/${(startYear + 1).toString().slice(-2)}`}>
                      Anno {startYear}/{(startYear + 1).toString().slice(-2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="bg-white/10 p-4 rounded border border-white/20 w-full sm:w-auto">
              <label className="text-white mb-2 block text-xs uppercase font-bold px-1">Filtro NEU/Coworking</label>
              <Select value={calendarYear.toString()} onValueChange={(v) => setCalendarYear(parseInt(v))}>
                <SelectTrigger className="w-full sm:w-[180px] bg-white text-slate-800">
                  <SelectValue placeholder="Anno Solare" />
                </SelectTrigger>
                <SelectContent>
                  {solarYears.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      Anno {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      {/* === SEZIONE VOLONTARIATO === */}
      <div className="space-y-6 pt-10 border-t">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-[#1f7a8c]" />
            <h2 className="text-3xl font-bold text-[#053c5e]">Volontariato {assocYear}</h2>
          </div>
          <Button onClick={downloadVolontariatoPDF} variant="outline" className="border-[#1f7a8c] text-[#1f7a8c] hover:bg-[#1f7a8c] hover:text-white w-full sm:w-auto">
            <Download className="w-4 h-4 mr-2" />
            Scarica Report PDF
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-white border-l-4 border-l-[#1f7a8c]">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ore Volontariato</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">{Math.round(oreClassicheTotali * 10) / 10}</span>
                <span className="text-slate-400 font-medium">ore</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">In {personeClassiche} persone diverse</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-l-4 border-l-[#053c5e]">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">Ore Hosting</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-4xl font-bold text-slate-900">{Math.round(oreHostTotali * 10) / 10}</span>
                <span className="text-slate-400 font-medium">ore</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Da {personeHost} host attivi</p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 bg-slate-50 border-dashed">
            <CardContent className="pt-6 flex flex-col justify-center h-full">
              <p className="text-slate-600 text-sm italic">
                "Il volontariato è il cuore pulsante di neu [nòi]. Ogni ora dedicata contribuisce a far crescere la nostra comunità e a sostenere i nostri progetti condivisi."
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="w-full">
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#1f7a8c]" />
                Distribuzione per Ambito
              </CardTitle>
            </CardHeader>
            <CardContent>
              {ambitiData.length > 0 ? (
                <div className="space-y-8">
                  <ResponsiveContainer width="100%" height={Math.max(400, ambitiData.length * 40)}>
                    <BarChart
                      data={ambitiData}
                      layout="vertical"
                      margin={{ left: isMobile ? 10 : 160, right: 20, top: 10, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" hide />
                      <YAxis
                        dataKey="nome"
                        type="category"
                        width={isMobile ? 100 : 200}
                        tick={{ fontSize: isMobile ? 9 : 10, fontWeight: 600, fill: '#475569' }}
                        interval={0}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                        formatter={(value) => [`${value} ore`, 'Totale']}
                      />
                      <Bar
                        dataKey="ore"
                        fill="#1f7a8c"
                        radius={[0, 4, 4, 0]}
                        barSize={isMobile ? 25 : 40}
                      />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {ambitiData.map((item, idx) => {
                      const percentage = oreClassicheTotali > 0
                        ? Math.round((item.ore / oreClassicheTotali) * 100)
                        : 0;
                      return (
                        <div key={item.nome} className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-3 h-3 rounded-full shrink-0 shadow-inner"
                              style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                            />
                            <span className="text-xs font-bold text-slate-700 truncate" title={item.nome}>{item.nome}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-black text-[#053c5e]">{item.ore}h</div>
                            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">{percentage}% del totale</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center text-slate-400 italic">
                  Nessuna dichiarazione trovata per questo periodo
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* === SEZIONE NEU === */}
      <div className="space-y-6 pt-10 border-t">
        <div className="flex items-center gap-3">
          <Coins className="w-8 h-8 text-[#db222a]" />
          <h2 className="text-3xl font-bold text-[#053c5e]">Sistema NEU {calendarYear}</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-l-4 border-l-[#053c5e]">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">NEU Immessi</div>
              <div className="text-3xl font-bold text-[#053c5e] mt-2">{Math.round(neuImmessi * 10) / 10}</div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-[8px] font-bold text-slate-400 uppercase leading-tight">
                <span className="bg-slate-100 px-1 rounded">Mattina: {Math.round(h_standard * 2.5)}</span>
                <span className="bg-slate-100 px-1 rounded">Sera: {Math.round(h_serale * 4)}</span>
                <span className="bg-slate-100 px-1 rounded">Weekend: {Math.round(h_weekend * 6)}</span>
                <span className="bg-slate-100 px-1 rounded">Volont.: {Math.round(nVolontariato)}</span>
                <span className="bg-slate-100 px-1 rounded">Compiti: {Math.round(nCompiti)}</span>
                <span className="bg-slate-100 px-1 rounded">Voti: {Math.round(nVoto)}</span>
              </div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-[#1f7a8c]">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">NEU Scambiati</div>
              <div className="text-3xl font-bold text-[#1f7a8c] mt-2">{Math.round(neuScambiati * 10) / 10}</div>
              <div className="text-[10px] text-slate-400 mt-1">Volume totale scambi tra soci/associazione</div>
            </CardContent>
          </Card>
          <Card className="border-l-4 border-l-red-500">
            <CardContent className="pt-6">
              <div className="text-sm font-medium text-slate-500 uppercase tracking-wider">NEU Scaduti</div>
              <div className="text-3xl font-bold text-red-600 mt-2">{Math.round(neuScadutiAnno * 10) / 10}</div>
              <div className="text-[10px] text-slate-400 mt-1">Valore non speso al 31/12/{calendarYear}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Dettaglio Utilizzo NEU (Macro Categorie)</CardTitle>
          </CardHeader>
          <CardContent>
            {neuUsageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={Math.max(300, neuUsageData.length * 40 + 50)}>
                <BarChart
                  data={neuUsageData}
                  layout="vertical"
                  margin={{ left: isMobile ? 10 : 20, right: 30, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={isMobile ? 100 : 150}
                    tick={{ fontSize: isMobile ? 10 : 11 }}
                  />
                  <Tooltip formatter={(value) => [value, 'NEU']} />
                  <Bar dataKey="valore" fill="#db222a" radius={[0, 4, 4, 0]} barSize={25} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-slate-500 py-8">Nessun utilizzo (scambio) registrato quest'anno.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* === SEZIONE COWORKING === */}
      <div className="space-y-6 pt-10 border-t">
        <div className="flex items-center gap-3">
          <Users className="w-8 h-8 text-[#db222a]" />
          <h2 className="text-3xl font-bold text-[#053c5e]">Coworking {calendarYear}</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card className="border-t-4 border-t-[#053c5e]">
            <CardContent className="pt-6">
              <div className="text-xs uppercase font-bold text-slate-400">Persone</div>
              <div className="text-3xl font-bold text-[#053c5e]">{totalePersone}</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-[#db222a]">
            <CardContent className="pt-6">
              <div className="text-xs uppercase font-bold text-slate-400">Età Media</div>
              <div className="text-3xl font-bold text-[#db222a]">{etaMedia}</div>
              <div className="text-xs text-slate-400 mt-1">Anni</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-[#1f7a8c]">
            <CardContent className="pt-6">
              <div className="text-xs uppercase font-bold text-slate-400">Femmine</div>
              <div className="text-3xl font-bold text-[#1f7a8c]">{percFemmina}%</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-[#053c5e]">
            <CardContent className="pt-6">
              <div className="text-xs uppercase font-bold text-slate-400">Maschi</div>
              <div className="text-3xl font-bold text-[#053c5e]">{percMaschio}%</div>
            </CardContent>
          </Card>
          <Card className="border-t-4 border-t-slate-300">
            <CardContent className="pt-6">
              <div className="text-xs uppercase font-bold text-slate-400">Altro</div>
              <div className="text-3xl font-bold text-slate-500">{percAltro}%</div>
            </CardContent>
          </Card>
        </div>

        {/* STATISTICHE VENDITE */}
        <div className="pt-6">
          <Card>
            <CardHeader>
              <CardTitle>Servizi Venduti - Quantità</CardTitle>
            </CardHeader>
            <CardContent>
              {serviziVendutiData.length > 0 ? (
                <div className={isMobile ? "h-[500px]" : "h-[400px]"}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={serviziVendutiData}
                      layout="vertical"
                      margin={{ left: isMobile ? 10 : 50, right: 30, top: 20, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis
                        dataKey="nome"
                        type="category"
                        width={isMobile ? 120 : 200}
                        tick={{ fontSize: isMobile ? 10 : 12 }}
                      />
                      <Tooltip formatter={(value) => [value, 'Quantità']} />
                      <Legend />
                      <Bar dataKey="count" fill="#053c5e" name="Quantità Venduta" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-center text-slate-500 py-8">Nessuna vendita registrata in questo anno.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#1f7a8c]" />
                Mappa Coworkers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full aspect-video bg-blue-50 rounded-lg overflow-hidden shadow-inner flex items-center justify-center">
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  src="https://www.google.com/maps/d/u/1/embed?mid=1hZEj0wy8KAWkA-N93w1BXVbVMvEwOM4&ehbc=2E312F"
                  className="rounded-lg"
                ></iframe>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Provenienza (Top 10)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={statiData}
                  layout="vertical"
                  margin={{ left: isMobile ? 10 : 20, right: 30, top: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" />
                  <YAxis
                    dataKey="nome"
                    type="category"
                    width={isMobile ? 80 : 100}
                    fontSize={isMobile ? 10 : 12}
                  />
                  <Tooltip />
                  <Bar dataKey="count" fill="#1f7a8c" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* === DOWNLOAD PDF (Bottom section) === */}
      <div className="pt-10 border-t">
        <h2 className="text-2xl font-bold text-[#053c5e] mb-6">Esportazione Report</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-l-4 border-l-[#1f7a8c]">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Volontariato</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400 mb-4 font-mono">Periodo Associativo {assocYear}</p>
              <Button onClick={downloadVolontariatoPDF} className="w-full bg-[#1f7a8c] hover:bg-[#053c5e]">
                <Download className="w-4 h-4 mr-2" />
                Scarica PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#db222a]">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Sistema NEU</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400 mb-4 font-mono">Anno Solare {calendarYear}</p>
              <Button onClick={downloadNeuPDF} className="w-full bg-[#db222a] hover:bg-[#9d171d]">
                <Download className="w-4 h-4 mr-2" />
                Scarica PDF
              </Button>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-[#053c5e]">
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-slate-500">Coworking</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-400 mb-4 font-mono">Anno Solare {calendarYear}</p>
              <Button onClick={downloadCoworkingPDF} className="w-full bg-[#053c5e] hover:bg-black">
                <Download className="w-4 h-4 mr-2" />
                Scarica PDF
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-10 opacity-50 text-xs">
        neu [nòi] spazio al lavoro APS • Dati aggiornati al {new Date().toLocaleDateString('it-IT')}
      </div>
    </div>
  );
}

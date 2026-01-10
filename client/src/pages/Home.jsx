import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Link } from 'react-router-dom';
import { createPageUrl } from '../utils';
import { Coins, Calendar, Clock, Briefcase, Users, ArrowRight, ClipboardCheck, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';

import { useAuth } from '../hooks/useAuth';

export default function Home() {
  const { user, isLoading } = useAuth();
  const loading = isLoading;

  const { data: turni = [] } = useQuery({
    queryKey: ['turni'],
    queryFn: () => neunoi.entities.TurnoHost.list('-data_inizio'),
    initialData: [],
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#053c5e]">
        <div className="text-lg text-white">Caricamento...</div>
      </div>
    );
  }

  // Se non autenticato, mostra pagina Welcome
  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        {/* Hero Section */}
        <div className="relative">
          {/* Header con solo Accedi */}
          <div className="flex justify-end p-6">
            <Button
              onClick={() => neunoi.auth.redirectToLogin(createPageUrl('Home'))}
              className="bg-[#053c5e] text-white hover:bg-[#1f7a8c] font-semibold"
            >
              <ArrowRight className="w-4 h-4 mr-2" />
              Accedi
            </Button>
          </div>

          {/* Hero Content */}
          <div className="container mx-auto px-4 py-20 text-center">
            <div className="max-w-4xl mx-auto">
              {/* Logo centrale largo 250px */}
              <div className="mb-12">
                <img
                  src="/logo-red.png"
                  alt="neu [nòi]"
                  className="w-[250px] mx-auto"
                />
              </div>

              <p className="text-xl md:text-2xl text-[#053c5e] font-semibold mb-8">
                Spazio al lavoro - Coworking e comunità a Palermo
              </p>
              <p className="text-lg text-[#053c5e]/80 max-w-2xl mx-auto mb-12">
                Un'associazione di promozione sociale che unisce coworking, condivisione e collaborazione.
                Partecipa alla nostra comunità basata sul sistema NEU, la moneta complementare per valorizzare
                il contributo di ogni socio.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={() => window.location.href = createPageUrl('CheckIn')}
                  className="bg-[#1f7a8c] hover:bg-[#053c5e] text-white text-lg px-8 py-6 font-bold"
                >
                  <ClipboardCheck className="w-5 h-5 mr-2" />
                  Fai il Check-in
                </Button>
                <Button
                  onClick={() => neunoi.auth.redirectToLogin(createPageUrl('Home'))}
                  className="bg-[#db222a] hover:bg-[#053c5e] text-white text-lg px-8 py-6 font-bold"
                >
                  <ArrowRight className="w-5 h-5 mr-2" />
                  Iscriviti
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <div className="bg-white py-20">
          <div className="container mx-auto px-4">
            <h2 className="text-4xl font-bold text-[#053c5e] text-center mb-12">
              Cosa offriamo
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-[#bfdbf7] p-8 text-center">
                <div className="w-16 h-16 bg-[#053c5e] flex items-center justify-center mx-auto mb-4">
                  <Coins className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-[#053c5e] mb-4">Sistema NEU</h3>
                <p className="text-[#053c5e]">
                  Una moneta complementare che valorizza il tuo contributo all'associazione.
                  Guadagna NEU con turni host e compiti, usali per servizi coworking.
                </p>
              </div>

              <div className="bg-[#1f7a8c] p-8 text-center text-white">
                <div className="w-16 h-16 bg-white flex items-center justify-center mx-auto mb-4">
                  <Users className="w-8 h-8 text-[#1f7a8c]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Comunità</h3>
                <p>
                  Entra a far parte di una comunità di professionisti, freelancer e creativi.
                  Condividi conoscenze, collabora su progetti e cresci insieme a noi.
                </p>
              </div>

              <div className="bg-[#db222a] p-8 text-center text-white">
                <div className="w-16 h-16 bg-white flex items-center justify-center mx-auto mb-4">
                  <Clock className="w-8 h-8 text-[#db222a]" />
                </div>
                <h3 className="text-2xl font-bold mb-4">Spazi Flessibili</h3>
                <p>
                  Postazioni coworking, sale riunioni e spazi eventi.
                  Lavora quando e come vuoi, in un ambiente stimolante e professionale.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[#bfdbf7] py-20">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-4xl font-bold text-[#053c5e] mb-6">Dove siamo</h2>
            <p className="text-xl text-[#053c5e] mb-4">
              <strong>neu [nòi] spazio al lavoro APS</strong>
            </p>
            <p className="text-lg text-[#053c5e] mb-8">
              via Alloro 64, 90133 Palermo
            </p>
            <div className="flex justify-center">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3151.782800588661!2d13.364468676236688!3d38.11571437189999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x1319e5f54316834d%3A0xe677f98889445195!2svia%20Alloro%2C%2064%2C%2090133%20Palermo%20PA!5e0!3m2!1sit!2sit!4v1714820000000!5m2!1sit!2sit"
                width="800"
                height="450"
                className="w-full max-w-3xl h-[300px] md:h-[450px] border-0 rounded-lg shadow-lg"
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              ></iframe>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const hasRole = (role) => {
    if (!user) return false;
    return user.roles?.includes(role) || user.role === role;
  };

  const isSocio = hasRole('socio') || hasRole('admin') || hasRole('super_admin');
  const isCoworker = hasRole('coworker') || isSocio;

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-white p-8 text-[#053c5e] relative border-b-4 border-[#db222a] border-opacity-20 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">
              Ciao{user ? ` ${user.full_name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-lg text-[#053c5e] opacity-80 font-medium">
              {isSocio
                ? "neu [nòi] - spazio al lavoro & comunità"
                : "Benvenuto nel coworking di neu [nòi]"}
            </p>
          </div>
          {isSocio && (
            <Link to={createPageUrl('Riepiloghi')} className="w-full sm:w-auto">
              <Button variant="outline" className="w-full sm:w-auto border-[#1f7a8c] text-[#1f7a8c] hover:bg-[#1f7a8c] hover:text-white font-semibold">
                <Calendar className="w-4 h-4 mr-2" />
                Statistiche e Riepiloghi
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Welcome & Info Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-6">
          <Card className="border-none shadow-sm bg-slate-50">
            <CardHeader>
              <CardTitle className="text-[#053c5e]">
                {isSocio ? "La tua attività in associazione" : "Il tuo spazio di lavoro"}
              </CardTitle>
            </CardHeader>
            <CardContent className="prose prose-slate max-w-none text-[#053c5e]">
              {isSocio ? (
                <div className="space-y-4">
                  <p>
                    Questa è la tua area personale. Qui puoi monitorare il tuo contributo alla comunità,
                    gestire i tuoi NEU e dichiarare le tue ore di volontariato.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose">
                    <div className="bg-[#db222a] text-white p-4">
                      <div className="text-xs uppercase opacity-80 mb-1">Saldo NEU</div>
                      <div className="text-3xl font-bold">{Math.round((user?.saldo_neu || 0) * 100) / 100}</div>
                    </div>
                    <div className="bg-[#1f7a8c] text-white p-4">
                      <div className="text-xs uppercase opacity-80 mb-1">Ore Volontariato Anno</div>
                      <div className="text-3xl font-bold">{user?.ore_volontariato_anno || 0} / 60</div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p>
                    Siamo felici di averti con noi! In questo portale puoi gestire in autonomia le tue prenotazioni
                    delle sale riunioni e monitorare i tuoi ingressi carnet o il tuo abbonamento mensile.
                  </p>
                  <p>
                    Il nostro spazio è aperto dal lunedì al venerdì, dalle 9:00 alle 18:30. Ricorda di fare sempre
                    il check-in all'ingresso tramite il tablet in postazione host o il tuo smartphone.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info Section */}
          <div className="bg-white p-6 border-l-4 border-[#1f7a8c] shadow-sm">
            <h2 className="text-2xl font-bold text-[#053c5e] mb-4">Informazioni utili</h2>
            <div className="space-y-6">
              {isSocio ? (
                <>
                  <div>
                    <h3 className="font-bold text-[#053c5e] mb-2 flex items-center gap-2">
                      <Coins className="w-4 h-4 text-[#db222a]" />
                      Sistema NEU
                    </h3>
                    <p className="text-sm text-[#053c5e]">
                      I NEU sono la moneta complementare dell'associazione. Si guadagnano facendo turni host
                      e compiti specifici, e si possono usare per pagare i servizi dell'associazione o scambiare con altri soci.
                      <span className="font-semibold text-[#db222a]"> Attenzione:</span> i NEU guadagnati dal 1° ottobre al 30 settembre
                      scadono il 31 dicembre dell'anno successivo.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#053c5e] mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-[#1f7a8c]" />
                      Volontariato
                    </h3>
                    <p className="text-sm text-[#053c5e]">
                      Ogni socio/a è tenuto/a a svolgere almeno 60 ore di volontariato all'anno associativo.
                      Le ore possono essere dichiarate nella sezione dedicata del portale.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <h3 className="font-bold text-[#053c5e] mb-2 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-[#1f7a8c]" />
                      Prenotazione Sale
                    </h3>
                    <p className="text-sm text-[#053c5e]">
                      Puoi prenotare la Sala Riunioni Alloro o la Postazione Call direttamente dalla sezione Coworking.
                      Assicurati di avere crediti ore sufficienti nel tuo abbonamento.
                    </p>
                  </div>
                  <div>
                    <h3 className="font-bold text-[#053c5e] mb-2 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#053c5e]" />
                      La Community
                    </h3>
                    <p className="text-sm text-[#053c5e]">
                      Neu [nòi] è più di un semplice ufficio. È una comunità vibrante. Se hai bisogno di supporto,
                      non esitare a chiedere all'Host di turno!
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-slate-100 p-6 rounded-lg shadow-sm border border-slate-200">
            <h4 className="font-bold text-[#053c5e] mb-4 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Contatti Associazione
            </h4>
            <div className="space-y-3 text-sm text-slate-600">
              <p>
                <span className="font-semibold text-[#053c5e]">Email:</span><br />
                coworking@neunoi.it
              </p>
              <p>
                <span className="font-semibold text-[#053c5e]">Tel:</span><br />
                +39 091 5739129
              </p>
              <p>
                <span className="font-semibold text-[#053c5e]">Sede:</span><br />
                Via Alloro 64, 90133 Palermo
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

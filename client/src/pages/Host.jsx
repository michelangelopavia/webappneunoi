import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, Bell, ClipboardCheck, ShoppingCart, Users } from 'lucide-react';
import { createPageUrl } from '../utils';
import GestioneAbbonamenti from '../components/coworking/GestioneAbbonamenti';
import GestioneOrdini from '../components/coworking/GestioneOrdini';
import CalendarioSaleHost from '../components/host/CalendarioSaleHost';
import NotificheHost from '../components/host/NotificheHost';
import CreaTask from '../components/task/CreaTask';
import RegistraIngressoDialog from '../components/host/RegistraIngressoDialog';
import { UserPlus } from 'lucide-react';

import { useQuery } from '@tanstack/react-query';
import CalendarioTurni from '../components/turni/CalendarioTurni';

import ComunicazioneCoworker from '../components/host/ComunicazioneCoworker';

export default function Host() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [registraDialogOpen, setRegistraDialogOpen] = useState(false);

  // Fetch Turni Host for the "Calendario Host" tab
  const { data: turniHost = [] } = useQuery({
    queryKey: ['turni_host_public_host_page'],
    queryFn: () => neunoi.entities.TurnoHost.list('-data_inizio'),
    initialData: [],
  });

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const currentUser = await neunoi.auth.me();
      setUser(currentUser);
    } catch (error) {
      console.error('Errore:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Caricamento...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-[#053c5e] text-white p-6 md:p-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Postazione Host</h1>
            <p className="text-base md:text-lg opacity-90 mt-2">Gestisci notifiche, abbonamenti e calendari delle sale</p>
          </div>
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
            <Button
              onClick={() => setRegistraDialogOpen(true)}
              className="bg-[#db222a] hover:bg-[#1f7a8c] text-white flex-1 md:flex-none"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ingresso Carnet
            </Button>
            <Button
              onClick={() => window.location.href = createPageUrl('CheckIn')}
              className="bg-[#1f7a8c] hover:bg-white hover:text-[#053c5e] flex-1 md:flex-none"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Check-in
            </Button>
            <CreaTask />
          </div>
        </div>
      </div>

      <Tabs defaultValue="notifiche" className="w-full">
        <div className="overflow-x-auto pb-2">
          <TabsList className="flex w-max min-w-full bg-[#bfdbf7] p-1 h-auto">
            <TabsTrigger value="notifiche" className="flex-1 px-4 py-2 data-[state=active]:bg-[#053c5e] data-[state=active]:text-white whitespace-nowrap">
              <Bell className="w-4 h-4 mr-2" />
              Notifiche
            </TabsTrigger>
            <TabsTrigger value="coworkers" className="flex-1 px-4 py-2 data-[state=active]:bg-[#053c5e] data-[state=active]:text-white whitespace-nowrap">
              <Users className="w-4 h-4 mr-2" />
              Coworkers
            </TabsTrigger>
            <TabsTrigger value="ordini" className="flex-1 px-4 py-2 data-[state=active]:bg-[#053c5e] data-[state=active]:text-white whitespace-nowrap">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Acquisti
            </TabsTrigger>
            <TabsTrigger value="abbonamenti" className="flex-1 px-4 py-2 data-[state=active]:bg-[#053c5e] data-[state=active]:text-white whitespace-nowrap">
              <CreditCard className="w-4 h-4 mr-2" />
              Abbonamenti
            </TabsTrigger>
            <TabsTrigger value="calendario" className="flex-1 px-4 py-2 data-[state=active]:bg-[#053c5e] data-[state=active]:text-white whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              Calendario Sale
            </TabsTrigger>
            <TabsTrigger value="turni_host" className="flex-1 px-4 py-2 data-[state=active]:bg-[#053c5e] data-[state=active]:text-white whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              Calendario Host
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="notifiche" className="mt-6">
          <NotificheHost />
        </TabsContent>

        <TabsContent value="coworkers" className="mt-6">
          <ComunicazioneCoworker />
        </TabsContent>

        <TabsContent value="ordini" className="mt-6">
          <GestioneOrdini />
        </TabsContent>

        <TabsContent value="abbonamenti" className="mt-6">
          <GestioneAbbonamenti />
        </TabsContent>

        <TabsContent value="calendario" className="mt-6">
          <CalendarioSaleHost />
        </TabsContent>

        <TabsContent value="turni_host" className="mt-6">
          <CalendarioTurni
            turni={turniHost}
            onSelectTurno={() => { }}
            vista="giorno" // Default view as requested
            readOnly={true}
          />
        </TabsContent>
      </Tabs>

      <RegistraIngressoDialog
        open={registraDialogOpen}
        onOpenChange={setRegistraDialogOpen}
      />
    </div>
  );
}

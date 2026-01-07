import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar, CreditCard, Bell, ClipboardCheck, ShoppingCart } from 'lucide-react';
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
      <div className="bg-[#053c5e] text-white p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Postazione Host</h1>
            <p className="text-lg opacity-90 mt-2">Gestisci notifiche, abbonamenti e calendari delle sale</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setRegistraDialogOpen(true)}
              className="bg-[#db222a] hover:bg-[#1f7a8c] text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Ingresso Carnet
            </Button>
            <Button
              onClick={() => window.location.href = createPageUrl('CheckIn')}
              className="bg-[#1f7a8c] hover:bg-white hover:text-[#053c5e]"
            >
              <ClipboardCheck className="w-4 h-4 mr-2" />
              Check-in
            </Button>
            <CreaTask />
          </div>
        </div>
      </div>

      <Tabs defaultValue="notifiche" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-[#bfdbf7]">
          <TabsTrigger value="notifiche" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <Bell className="w-4 h-4 mr-2" />
            Notifiche
          </TabsTrigger>
          <TabsTrigger value="ordini" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <ShoppingCart className="w-4 h-4 mr-2" />
            Acquisti
          </TabsTrigger>
          <TabsTrigger value="abbonamenti" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <CreditCard className="w-4 h-4 mr-2" />
            Abbonamenti
          </TabsTrigger>
          <TabsTrigger value="calendario" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario Sale
          </TabsTrigger>
          <TabsTrigger value="turni_host" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario Host
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifiche" className="mt-6">
          <NotificheHost />
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

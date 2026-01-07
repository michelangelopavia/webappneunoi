import React, { useState } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, Calendar, CreditCard, DoorOpen } from 'lucide-react';
import GestioneServizi from '../components/coworking/GestioneServizi';
import GestioneSale from '../components/coworking/GestioneSale';
import GestioneAbbonamenti from '../components/coworking/GestioneAbbonamenti';
import CalendarioSale from '../components/coworking/CalendarioSale';
import { useAuth } from '../hooks/useAuth';

export default function GestioneCoworking() {
  const { user, isLoading: authLoading } = useAuth();
  const loading = authLoading;

  if (loading) {
    return <div className="text-center py-12">Caricamento...</div>;
  }

  const isAdmin = user?.roles?.some(r => ['admin', 'super_admin'].includes(r));
  const isHost = user?.roles?.some(r => ['host', 'admin', 'super_admin'].includes(r));

  return (
    <div className="space-y-6">
      <div className="bg-[#053c5e] text-white p-8">
        <h1 className="text-4xl font-bold">Gestione Coworking</h1>
        <p className="text-lg opacity-90 mt-2">Amministra servizi, abbonamenti e sale</p>
      </div>

      <Tabs defaultValue="abbonamenti" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-[#bfdbf7]">
          <TabsTrigger value="abbonamenti" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <CreditCard className="w-4 h-4 mr-2" />
            Abbonamenti
          </TabsTrigger>
          <TabsTrigger value="calendario" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
            <Calendar className="w-4 h-4 mr-2" />
            Calendario Sale
          </TabsTrigger>
          {isAdmin && (
            <>
              <TabsTrigger value="servizi" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
                <Settings className="w-4 h-4 mr-2" />
                Servizi/Prezzi
              </TabsTrigger>
              <TabsTrigger value="sale" className="data-[state=active]:bg-[#053c5e] data-[state=active]:text-white">
                <DoorOpen className="w-4 h-4 mr-2" />
                Sale
              </TabsTrigger>
            </>
          )}
        </TabsList>

        <TabsContent value="abbonamenti" className="mt-6">
          <GestioneAbbonamenti />
        </TabsContent>

        <TabsContent value="calendario" className="mt-6">
          <CalendarioSale />
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="servizi" className="mt-6">
              <GestioneServizi />
            </TabsContent>

            <TabsContent value="sale" className="mt-6">
              <GestioneSale />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

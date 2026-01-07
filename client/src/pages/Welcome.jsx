import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { createPageUrl } from '../utils';
import { LogIn, UserPlus, Coins, Users, Clock, MapPin, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Welcome() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const authenticated = await neunoi.auth.isAuthenticated();
      setIsAuthenticated(authenticated);
      if (authenticated) {
        window.location.href = createPageUrl('Home');
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#053c5e] flex items-center justify-center">
        <div className="text-white text-lg">Caricamento...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#053c5e]">
      {/* Hero Section */}
      <div className="relative">
        {/* Header */}
        <div className="absolute top-0 right-0 p-6 flex gap-4 z-10">
          <Button 
            onClick={() => neunoi.auth.redirectToLogin(createPageUrl('Home'))}
            className="bg-white text-[#053c5e] hover:bg-[#bfdbf7] font-semibold"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Accedi
          </Button>
          <Button 
            onClick={() => neunoi.auth.redirectToLogin(createPageUrl('Home'))}
            className="bg-[#db222a] hover:bg-[#1f7a8c] text-white font-semibold"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Registrati
          </Button>
        </div>

        {/* Hero Content */}
        <div className="container mx-auto px-4 py-20 text-center">
          <div className="max-w-4xl mx-auto">
            {/* Logo */}
            <div className="mb-8">
              <img 
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/neunoi-prod/public/6948101ec07ecbe73edb9edc/c79cf77cd_neunoi_logo_bianco.png" 
                alt="neu [nòi]" 
                className="h-24 mx-auto"
              />
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
              Benvenuto in neu [nòi]
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-8">
              Spazio al lavoro - Coworking e comunità a Palermo
            </p>
            <p className="text-lg text-white/80 max-w-2xl mx-auto mb-12">
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
                Check-in Coworking
              </Button>
              <Button 
                onClick={() => neunoi.auth.redirectToLogin(createPageUrl('Home'))}
                className="bg-[#db222a] hover:bg-white hover:text-[#053c5e] text-white text-lg px-8 py-6 font-bold"
              >
                <UserPlus className="w-5 h-5 mr-2" />
                Diventa Socio
              </Button>
              <Button 
                onClick={() => neunoi.auth.redirectToLogin(createPageUrl('Home'))}
                className="bg-white text-[#053c5e] hover:bg-[#bfdbf7] text-lg px-8 py-6 font-bold"
              >
                <LogIn className="w-5 h-5 mr-2" />
                Accedi
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
              <div className="w-16 h-16 bg-[#053c5e] rounded-full flex items-center justify-center mx-auto mb-4">
                <Coins className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-[#053c5e] mb-4">Sistema NEU</h3>
              <p className="text-[#053c5e]">
                Una moneta complementare che valorizza il tuo contributo all'associazione. 
                Guadagna NEU con turni host e compiti, usali per servizi coworking.
              </p>
            </div>

            <div className="bg-[#1f7a8c] p-8 text-center text-white">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-[#1f7a8c]" />
              </div>
              <h3 className="text-2xl font-bold mb-4">Comunità</h3>
              <p>
                Entra a far parte di una comunità di professionisti, freelancer e creativi. 
                Condividi conoscenze, collabora su progetti e cresci insieme a noi.
              </p>
            </div>

            <div className="bg-[#db222a] p-8 text-center text-white">
              <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
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

      {/* Location Section */}
      <div className="bg-[#bfdbf7] py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-3 mb-6">
            <MapPin className="w-8 h-8 text-[#db222a]" />
            <h2 className="text-4xl font-bold text-[#053c5e]">Dove siamo</h2>
          </div>
          <p className="text-xl text-[#053c5e] mb-4">
            <strong>neu [nòi] spazio al lavoro APS</strong>
          </p>
          <p className="text-lg text-[#053c5e]">
            via Alloro 64, 90133 Palermo
          </p>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-[#053c5e] text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/neunoi-prod/public/6948101ec07ecbe73edb9edc/c79cf77cd_neunoi_logo_bianco.png" 
            alt="neu [nòi]" 
            className="h-12 mx-auto mb-4"
          />
          <p className="text-white/80">
            © 2025 neu [nòi] spazio al lavoro APS - Palermo
          </p>
        </div>
      </div>
    </div>
  );
}

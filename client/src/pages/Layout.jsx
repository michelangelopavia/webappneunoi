
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { neunoi } from '@/api/neunoiClient';
import { createPageUrl } from '../utils';
import {
  Menu, X, Home, Calendar, Coins, Clock, Users,
  Settings, LogOut, Briefcase, DoorOpen, Upload, ListTodo
} from 'lucide-react';

import { useAuth } from '../hooks/useAuth';
import { useQuery } from '@tanstack/react-query';

export default function Layout({ children, currentPageName }) {
  const { user, logout, isLoading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const syncProfile = async () => {
      if (user) {
        try {
          const profiliEsistenti = await neunoi.entities.ProfiloCoworker.filter({
            email: user.email,
            user_id: null
          });
          if (profiliEsistenti.length > 0) {
            await neunoi.entities.ProfiloCoworker.update(profiliEsistenti[0].id, {
              user_id: user.id,
              stato: 'iscritto'
            });
          }
        } catch (error) {
          console.error('Errore sincronizzazione profilo:', error);
        }
      }
    };
    syncProfile();
  }, [user]);

  const hasRole = (role) => {
    if (!user) return false;
    return user.roles?.includes(role) || user.role === role;
  };

  const isSocio = hasRole('socio') || hasRole('admin') || hasRole('super_admin');
  const isAdmin = hasRole('admin') || hasRole('super_admin');
  const isSuperAdmin = hasRole('super_admin');
  const isGestoreTurni = hasRole('gestore_turni') || isAdmin;
  const isCoworker = hasRole('coworker') || isSocio;
  const isHost = hasRole('host');


  const handleLogout = async () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      {user && (
        <header className="bg-[#053c5e] border-b-4 border-[#db222a] sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo */}
              <Link to={createPageUrl('Home')} className="flex items-center space-x-3">
                <img
                  src="/logo-white.png"
                  alt="neu [nòi]"
                  className="h-12"
                />
              </Link>

              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-1">

                {isSocio && (
                  <>
                    <Link
                      to={createPageUrl('MieiNEU')}
                      className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                    >
                      <Coins className="w-4 h-4" />
                      Banca NEU
                    </Link>
                    <Link
                      to={createPageUrl('Volontariato')}
                      className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Volontariato
                    </Link>
                    <Link
                      to={createPageUrl('MieiTask')}
                      className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                    >
                      <ListTodo className="w-4 h-4" />
                      Task
                    </Link>
                  </>
                )}

                {isGestoreTurni && (
                  <Link
                    to={createPageUrl('TurniHost')}
                    className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    Turni Host
                  </Link>
                )}

                {isCoworker && (
                  <Link
                    to={createPageUrl('Coworking')}
                    className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                  >
                    <Briefcase className="w-4 h-4" />
                    Coworking
                  </Link>
                )}

                {isHost && (
                  <Link
                    to={createPageUrl('Host')}
                    className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                  >
                    <DoorOpen className="w-4 h-4" />
                    Host
                  </Link>
                )}

                {isAdmin && (
                  <>
                    <Link
                      to={createPageUrl('Amministrazione')}
                      className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Admin
                    </Link>
                  </>
                )}

                {user && (
                  <div className="flex items-center gap-3 ml-4 pl-4 border-l border-[#1f7a8c]">
                    <Link
                      to={createPageUrl('Profilo')}
                      className="px-3 py-2 text-white hover:bg-[#1f7a8c] flex items-center gap-2"
                    >
                      <Users className="w-4 h-4" />
                      {user.full_name}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="p-2 text-white hover:bg-[#db222a]"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </nav>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 text-white hover:bg-[#1f7a8c]"
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Menu */}
            {menuOpen && (
              <div className="md:hidden py-4 space-y-2 border-t border-[#1f7a8c]">
                {isSocio && (
                  <>
                    <Link
                      to={createPageUrl('MieiNEU')}
                      className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                      onClick={() => setMenuOpen(false)}
                    >
                      Banca NEU
                    </Link>
                    <Link
                      to={createPageUrl('Volontariato')}
                      className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                      onClick={() => setMenuOpen(false)}
                    >
                      Volontariato
                    </Link>
                    <Link
                      to={createPageUrl('MieiTask')}
                      className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                      onClick={() => setMenuOpen(false)}
                    >
                      Task
                    </Link>
                  </>
                )}
                {isGestoreTurni && (
                  <Link
                    to={createPageUrl('TurniHost')}
                    className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Turni Host
                  </Link>
                )}
                {isCoworker && (
                  <Link
                    to={createPageUrl('Coworking')}
                    className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Coworking
                  </Link>
                )}
                {isHost && (
                  <Link
                    to={createPageUrl('Host')}
                    className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                    onClick={() => setMenuOpen(false)}
                  >
                    Host
                  </Link>
                )}
                {isAdmin && (
                  <>
                    <Link
                      to={createPageUrl('Amministrazione')}
                      className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                      onClick={() => setMenuOpen(false)}
                    >
                      Amministrazione
                    </Link>
                  </>
                )}
                {user && (
                  <div className="pt-4 border-t border-[#1f7a8c]">
                    <Link
                      to={createPageUrl('Profilo')}
                      className="block px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                      onClick={() => setMenuOpen(false)}
                    >
                      {user.full_name}
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-2 rounded-lg text-white hover:bg-[#1f7a8c]"
                    >
                      Esci
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#053c5e] border-t-4 border-[#db222a] mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-white text-sm">
            <img
              src="/logo-white.png"
              alt="neu [nòi]"
              className="h-8 mx-auto mb-2"
            />
            <p>neu [nòi] spazio al lavoro APS</p>
            <p className="mt-1">via Alloro 64, 90133 Palermo</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

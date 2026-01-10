import React, { useState, useEffect } from 'react';
import { neunoi } from '@/api/neunoiClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Mail, Phone, Calendar, Briefcase, Shield, Edit, Save, X, Lock } from 'lucide-react';
import DatiAnagrafici from '../components/profilo/DatiAnagrafici';
import DatiCoworkerProfile from '../components/profilo/DatiCoworkerProfile';
import ProfiloCoworker from '../components/coworking/ProfiloCoworker'; // Billing Form
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function Profilo() {
  const [user, setUser] = useState(null);
  const [profilo, setProfilo] = useState(null);
  const [loading, setLoading] = useState(true);

  // Stati per editing dati base
  const [editingBasic, setEditingBasic] = useState(false);
  const [basicFormData, setBasicFormData] = useState({
    full_name: '',
    telefono: ''
  });

  // Stati per cambio password
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await neunoi.auth.me();
        setUser(currentUser);
        setBasicFormData({
          full_name: currentUser.full_name || '',
          telefono: currentUser.telefono || ''
        });

        // Carica profilo socio se disponibile
        let userProfile = null;

        // Try ProfiloSocio first if user matches
        if (currentUser.roles?.includes('socio') || currentUser.role === 'socio') {
          const profili = await neunoi.entities.ProfiloSocio.filter({ user_id: currentUser.id });
          if (profili.length > 0) userProfile = profili[0];
        }

        // If not found or user is coworker, try ProfiloCoworker
        if (!userProfile) {
          const profiliCw = await neunoi.entities.ProfiloCoworker.filter({ user_id: currentUser.id });
          if (profiliCw.length > 0) {
            const p = profiliCw[0];
            // Normalize data structure for display
            userProfile = {
              ...p,
              full_name: p.first_name && p.last_name ? `${p.first_name} ${p.last_name}` : (p.full_name || currentUser.full_name),
              isCoworker: true
            };
          }
        }

        if (userProfile) {
          setProfilo(userProfile);
        }
      } catch (error) {
        console.error('Errore:', error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleUpdateBasic = async () => {
    try {
      await neunoi.auth.updateProfile(basicFormData);
      setUser({ ...user, ...basicFormData });
      setEditingBasic(false);
      toast.success('Dati aggiornati con successo');
    } catch (error) {
      toast.error('Errore durante l\'aggiornamento: ' + error.message);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Le password non coincidono');
      return;
    }
    if (passwordData.newPassword.length < 6) {
      toast.error('La nuova password deve essere di almeno 6 caratteri');
      return;
    }

    try {
      await neunoi.auth.changePassword(passwordData.currentPassword, passwordData.newPassword);
      toast.success('Password aggiornata con successo');
      setShowPasswordForm(false);
      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error('Errore durante il cambio password: ' + error.message);
    }
  };

  if (loading) {
    return <div className="text-center py-12">Caricamento...</div>;
  }

  const getRoleName = (role) => {
    const roleNames = {
      super_admin: 'Super Admin',
      admin: 'Amministratore',
      gestore_turni: 'Gestore Turni',
      socio: 'Socio/a',
      coworker: 'Coworker'
    };
    return roleNames[role] || role;
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      super_admin: 'bg-purple-100 text-purple-800',
      admin: 'bg-red-100 text-red-800',
      gestore_turni: 'bg-blue-100 text-blue-800',
      socio: 'bg-green-100 text-green-800',
      coworker: 'bg-slate-100 text-slate-800'
    };
    return colors[role] || 'bg-slate-100 text-slate-800';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#1f7a8c]">Il mio profilo</h1>
        <Button
          variant="outline"
          onClick={() => setShowPasswordForm(!showPasswordForm)}
          className="border-[#1f7a8c] text-[#1f7a8c] hover:bg-[#1f7a8c] hover:text-white"
        >
          <Lock className="w-4 h-4 mr-2" />
          Cambia Password
        </Button>
      </div>

      {showPasswordForm && (
        <Card className="border-2 border-[#db222a] border-opacity-20 shadow-lg animate-in slide-in-from-top duration-300">
          <CardHeader>
            <CardTitle className="text-[#db222a] flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Cambia la tua password
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Password Attuale</Label>
                <Input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={e => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Nuova Password</Label>
                <Input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Conferma Nuova Password</Label>
                <Input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPasswordForm(false)}>Annulla</Button>
              <Button className="bg-[#db222a] hover:bg-[#053c5e]" onClick={handleChangePassword}>Aggiorna Password</Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Informazioni personali</CardTitle>
            {!editingBasic ? (
              <Button variant="ghost" size="sm" onClick={() => setEditingBasic(true)} className="text-[#1f7a8c]">
                <Edit className="w-4 h-4 mr-2" /> Modifica
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => setEditingBasic(false)}><X className="w-4 h-4" /></Button>
                <Button variant="ghost" size="sm" onClick={handleUpdateBasic} className="text-green-600"><Save className="w-4 h-4 mr-2" /> Salva</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-[#1f7a8c]" />
            <div className="flex-1">
              <p className="text-sm text-slate-500">Nome completo</p>
              {editingBasic ? (
                <Input
                  value={basicFormData.full_name}
                  onChange={e => setBasicFormData({ ...basicFormData, full_name: e.target.value })}
                  className="mt-1"
                />
              ) : (
                <p className="font-medium">{user?.full_name}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Mail className="w-5 h-5 text-[#1f7a8c]" />
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{user?.email}</p>
              <p className="text-[10px] text-slate-400 italic">L'email non può essere modificata autonomamente</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Phone className="w-5 h-5 text-[#1f7a8c]" />
            <div className="flex-1">
              <p className="text-sm text-slate-500">Telefono</p>
              {editingBasic ? (
                <Input
                  value={basicFormData.telefono}
                  onChange={e => setBasicFormData({ ...basicFormData, telefono: e.target.value })}
                  className="mt-1"
                  placeholder="+39 ..."
                />
              ) : (
                <p className="font-medium">{user?.telefono || '-'}</p>
              )}
            </div>
          </div>

          {user?.data_iscrizione && (
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-[#1f7a8c]" />
              <div>
                <p className="text-sm text-slate-500">Iscritto/a dal</p>
                <p className="font-medium">
                  {new Date(user.data_iscrizione).toLocaleDateString('it-IT', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sezione Dati Fatturazione (Spostata Sotto Informazioni Personali) */}
      <ProfiloCoworker user={user} />

      <Card>
        <CardHeader>
          <CardTitle>Ruoli e permessi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 mb-4">
            <Shield className="w-5 h-5 text-[#4A9FB4]" />
            <p className="text-sm text-slate-500">I tuoi ruoli</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {user?.roles?.map((role, index) => (
              <Badge key={index} className={getRoleBadgeColor(role)}>
                {getRoleName(role)}
              </Badge>
            ))}
            {(!user?.roles || user.roles.length === 0) && user?.role && (
              <Badge className={getRoleBadgeColor(user.role)}>
                {getRoleName(user.role)}
              </Badge>
            )}
          </div>

          {user?.tipo_utente && (
            <div className="mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-[#4A9FB4]" />
                <div>
                  <p className="text-sm text-slate-500">Tipo utente</p>
                  <p className="font-medium capitalize">{user.tipo_utente}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {user?.note && (
        <Card>
          <CardHeader>
            <CardTitle>Note</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600">{user.note}</p>
          </CardContent>
        </Card>
      )}

      {(user?.roles?.includes('socio') || user?.role === 'socio') && (
        <DatiAnagrafici />
      )}

      {/* Show Coworker Profile Editor if isCoworker flag is true OR if user has coworker role */}
      {profilo?.isCoworker && (
        <DatiCoworkerProfile profiloData={profilo} />
      )}
    </div>
  );
}

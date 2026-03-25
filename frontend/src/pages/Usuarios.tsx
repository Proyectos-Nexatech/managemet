import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
  Shield, 
  Lock, 
  UserPlus, 
  MoreVertical
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import clsx from 'clsx';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  role_id: string;
  role?: { name: string };
  last_login: string | null;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions?: Permission[];
}

interface Permission {
  id: string;
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

const modules = [
  { id: 'dashboard', name: 'Dashboard' },
  { id: 'equipos', name: 'Equipos' },
  { id: 'calibraciones', name: 'Calibraciones' },
  { id: 'documentos', name: 'Documentos' },
  { id: 'no_conformidades', name: 'No Conformidades' },
  { id: 'auditorias', name: 'Auditorías' },
  { id: 'programa', name: 'Programa' },
  { id: 'magnitudes', name: 'Magnitudes' },
  { id: 'competencias', name: 'Competencias' },
  { id: 'usuarios', name: 'Usuarios' },
];

export function Usuarios() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'matrix'>('users');
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data: pData }, { data: rData }] = await Promise.all([
        supabase.from('user_profiles').select('*, role:roles(name)'),
        supabase.from('roles').select('*, permissions:role_permissions(*)')
      ]);
      setProfiles(pData || []);
      setRoles(rData || []);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdatePermission = async (roleId: string, module: string, field: string, value: boolean) => {
     try {
       const { error } = await supabase
         .from('role_permissions')
         .upsert({ 
           role_id: roleId, 
           module, 
           [field]: value 
         }, { onConflict: 'role_id,module' });
       
       if (error) throw error;
       fetchData();
     } catch (err) {
       console.error('Error updating permission:', err);
     }
  };

  const handleToggleActive = async (profileId: string, currentStatus: boolean) => {
    try {
      await supabase.from('user_profiles').update({ is_active: !currentStatus }).eq('id', profileId);
      fetchData();
    } catch (err) {
      console.error('Error toggling active:', err);
    }
  };

  const handleChangeRole = async (profileId: string, roleId: string) => {
    try {
      await supabase.from('user_profiles').update({ role_id: roleId }).eq('id', profileId);
      fetchData();
    } catch (err) {
      console.error('Error changing role:', err);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-1">
          <h1 className="text-3xl font-black tracking-tight text-slate-800 uppercase">Configuración de Accesos</h1>
          <p className="text-xs font-bold text-slate-400">Control de usuarios, roles y matriz de permisos granulares.</p>
        </div>
        
        <div className="flex bg-white p-1 rounded-2xl border border-slate-100 shadow-sm">
          {(['users', 'roles', 'matrix'] as const).map(tab => (
            <button
               key={tab}
               onClick={() => setActiveTab(tab)}
               className={clsx(
                 "px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                 activeTab === tab ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-slate-400 hover:text-slate-600"
               )}
            >
               {tab === 'users' ? 'Usuarios' : tab === 'roles' ? 'Roles' : 'Matriz Permisos'}
            </button>
          ))}
        </div>
      </div>

      <Card className="rounded-[2.5rem] border-none shadow-[0_12px_45px_-12px_rgba(0,0,0,0.05)] bg-white overflow-hidden min-h-[600px]">
         {loading ? (
            <div className="h-full flex items-center justify-center p-20">
               <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            </div>
         ) : (
            <div className="p-0">
               {activeTab === 'users' && (
                  <div>
                    <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                       <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest">Gestión de Cuentas</h2>
                       <Button className="h-10 px-6 rounded-xl text-[10px] font-black bg-slate-900 text-white gap-2">
                          <UserPlus className="w-4 h-4" /> INVITAR USUARIO
                       </Button>
                    </div>
                    <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="bg-slate-50/10">
                             <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Usuario</th>
                             <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Email</th>
                             <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50">Rol Asignado</th>
                             <th className="py-5 px-8 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 text-right">Estado</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-50 text-[11px] font-bold">
                          {profiles.map(p => (
                             <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="py-6 px-8 text-slate-800">{p.full_name}</td>
                                <td className="py-6 px-8 text-slate-500">{p.email}</td>
                                <td className="py-6 px-8 transition-all">
                                   <select 
                                      value={p.role_id || ''} 
                                      onChange={(e) => handleChangeRole(p.id, e.target.value)}
                                      className="bg-slate-50 border-none rounded-xl py-2 px-3 text-[10px] font-black uppercase outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
                                   >
                                      {roles.map(r => <option key={r.id} value={r.id}>{r.name.replace('_', ' ')}</option>)}
                                   </select>
                                </td>
                                <td className="py-6 px-8 text-right">
                                   <button onClick={() => handleToggleActive(p.id, p.is_active)} className={clsx("inline-flex items-center gap-2 px-4 py-1.5 rounded-full border transition-all", p.is_active ? "bg-green-50 text-green-500 border-green-100" : "bg-red-50 text-red-400 border-red-100")}>
                                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                                      <span className="text-[9px] font-black uppercase tracking-widest">{p.is_active ? 'Activo' : 'Inactivo'}</span>
                                   </button>
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
                    </div>
                  </div>
               )}

               {activeTab === 'roles' && (
                  <div className="p-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                       {roles.map(r => (
                          <Card key={r.id} className="rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-4 hover:border-primary/20 transition-all group">
                             <div className="flex items-center justify-between">
                                <div className="p-3 bg-primary/5 rounded-2xl group-hover:bg-primary transition-colors duration-500">
                                   <Shield className="w-5 h-5 text-primary group-hover:text-white" />
                                </div>
                                <button className="p-2 text-slate-300 hover:text-slate-800"><MoreVertical className="w-5 h-5" /></button>
                             </div>
                             <div>
                                <h3 className="text-[13px] font-black text-slate-800 uppercase tracking-widest">{r.name.replace('_', ' ')}</h3>
                                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-tight leading-3">{r.description || 'Sin descripción'}</p>
                             </div>
                             <div className="pt-4 flex items-center justify-between">
                                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-3 py-1 rounded-lg uppercase">
                                   {profiles.filter(p => p.role_id === r.id).length} Usuarios
                                </span>
                                <Button variant="outline" className="h-8 rounded-xl text-[9px] font-black border-slate-200 uppercase px-4">EDITAR DESC.</Button>
                             </div>
                          </Card>
                       ))}
                       <button className="rounded-[2.5rem] border-2 border-dashed border-slate-100 p-8 flex flex-col items-center justify-center gap-4 text-slate-300 hover:text-primary hover:border-primary/20 transition-all min-h-[160px]">
                          <UserPlus className="w-8 h-8" />
                          <span className="text-[10px] font-black uppercase tracking-widest">Crear Nuevo Rol</span>
                       </button>
                    </div>
                  </div>
               )}

               {activeTab === 'matrix' && (
                  <div className="overflow-x-auto p-4 animate-in fade-in slide-in-from-right-4">
                    <table className="w-full text-left border-separate border-spacing-2">
                       <thead>
                          <tr>
                             <th className="py-4 px-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Módulo</th>
                             {roles.filter(r => r.name !== 'admin').map(role => (
                                <th key={role.id} className="text-center py-4 px-6 min-w-[150px]">
                                   <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest pb-1">{role.name.replace('_', ' ')}</p>
                                </th>
                             ))}
                          </tr>
                       </thead>
                       <tbody className="text-[11px] font-black">
                          {modules.map(mod => (
                             <tr key={mod.id}>
                                <td className="py-4 px-6 bg-slate-50 rounded-2xl text-slate-800 uppercase tracking-wide">{mod.name}</td>
                                {roles.filter(r => r.name !== 'admin').map(role => {
                                   const perm = role.permissions?.find(p => p.module === mod.id);
                                   return (
                                      <td key={role.id} className="p-2">
                                         <div className="flex items-center justify-center gap-1.5 bg-slate-50/50 p-2 rounded-2xl border border-slate-100">
                                            {(['read', 'create', 'update', 'delete'] as const).map(action => {
                                               const field = `can_${action}` as keyof Permission;
                                               const isActive = !!perm?.[field];
                                               return (
                                                  <button
                                                     key={action}
                                                     title={`${mod.name} - ${action}`}
                                                     onClick={() => handleUpdatePermission(role.id, mod.id, `can_${action}`, !isActive)}
                                                     className={clsx(
                                                       "w-7 h-7 rounded-xl flex items-center justify-center transition-all shadow-sm",
                                                       isActive 
                                                         ? "bg-primary text-white" 
                                                         : "bg-white text-slate-300 border border-slate-100 hover:text-slate-500"
                                                     )}
                                                  >
                                                     <span className="text-[9px] uppercase font-black">{action[0]}</span>
                                                  </button>
                                               );
                                            })}
                                         </div>
                                      </td>
                                   );
                                })}
                             </tr>
                          ))}
                       </tbody>
                    </table>
                  </div>
               )}
            </div>
         )}
      </Card>
      
      <div className="bg-amber-50 rounded-[2rem] p-6 border border-amber-100 flex gap-4 items-center">
         <div className="p-4 bg-white rounded-2xl shadow-sm text-amber-500 flex-shrink-0"><Lock className="w-6 h-6" /></div>
         <div className="space-y-1">
            <h4 className="text-sm font-black text-amber-900 uppercase tracking-wide">Seguridad de Módulos (RBAC)</h4>
            <p className="text-[11px] font-bold text-amber-700 leading-tight">El Administrador tiene acceso total por defecto. Los cambios de permisos se aplican instantáneamente a todos los usuarios asignados al rol.</p>
         </div>
      </div>
    </div>
  );
}

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { type User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role_id: string;
  is_active: boolean;
  role?: Role;
}

export interface Role {
  id: string;
  name: string;
  description: string;
  permissions?: RolePermission[];
}

export interface RolePermission {
  module: string;
  can_read: boolean;
  can_create: boolean;
  can_update: boolean;
  can_delete: boolean;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  can: (module: string, action: 'read' | 'create' | 'update' | 'delete') => boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check active sessions
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, role:roles(*, permissions:role_permissions(*))')
        .eq('id', userId)
        .single();
      
      if (error) throw error;
      setProfile(data as UserProfile);
    } catch (err) {
      console.error('Error fetching profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const can = (module: string, action: 'read' | 'create' | 'update' | 'delete'): boolean => {
    if (!profile || !profile.role?.permissions) return false;
    // Admins always have access
    if (profile.role.name === 'admin') return true;

    const modPerm = profile.role.permissions.find(p => p.module === module);
    if (!modPerm) return false;

    switch (action) {
      case 'read': return modPerm.can_read;
      case 'create': return modPerm.can_create;
      case 'update': return modPerm.can_update;
      case 'delete': return modPerm.can_delete;
      default: return false;
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, can, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

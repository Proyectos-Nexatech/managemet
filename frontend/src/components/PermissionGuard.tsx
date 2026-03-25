import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface PermissionGuardProps {
  module: string;
  action: 'read' | 'create' | 'update' | 'delete';
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ module, action, children, fallback = null }: PermissionGuardProps) {
  const { can } = useAuth();
  
  if (!can(module, action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

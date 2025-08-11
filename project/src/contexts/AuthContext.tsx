import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AuthContext as AuthContextType, Organization } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Mock data - in real app this would come from your auth system
  const [authData] = useState<AuthContextType>({
    user: {
      _id: '123',
      email: 'admin@church.com',
      name: 'Church Admin',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    organizationId: 'org123',
    userRole: 'admin',
    organizations: [
      {
        _id: 'org123',
        name: 'First Baptist Church',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        _id: 'org456',
        name: 'Community Church',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ],
  });

  return (
    <AuthContext.Provider value={authData}>
      {children}
    </AuthContext.Provider>
  );
};
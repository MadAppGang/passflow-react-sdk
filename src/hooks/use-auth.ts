import { AuthContext, type AuthContextValue } from '@/context';
import { useContext } from 'react';

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
};

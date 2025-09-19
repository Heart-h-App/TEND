import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Types
type User = {
  id: string;
  email: string;
  authenticated: boolean;
};

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
};

// Initial state
const initialState: AuthState = {
  user: null,
  loading: false,
  error: null
};

// Create the store
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    // Check current session
    checkSession: async () => {
      if (!browser) return;
      
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await fetch('/api/auth/me');
        
        if (response.ok) {
          const userData = await response.json();
          update(state => ({ ...state, user: userData, loading: false }));
        } else {
          update(state => ({ ...state, user: null, loading: false }));
        }
      } catch (error) {
        console.error('Session check error:', error);
        update(state => ({ 
          ...state, 
          user: null, 
          loading: false, 
          error: 'Failed to check authentication status' 
        }));
      }
    },
    
    // Login
    login: async (email: string, password: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          update(state => ({ ...state, user: data, loading: false }));
          return { success: true };
        } else {
          update(state => ({ 
            ...state, 
            loading: false, 
            error: data.error || 'Login failed' 
          }));
          return { success: false, error: data.error };
        }
      } catch (error) {
        console.error('Login error:', error);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: 'Login request failed' 
        }));
        return { success: false, error: 'Login request failed' };
      }
    },
    
    // Register
    register: async (email: string, password: string, confirmPassword: string) => {
      update(state => ({ ...state, loading: true, error: null }));
      
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, confirmPassword })
        });
        
        const data = await response.json();
        
        if (response.ok) {
          update(state => ({ ...state, user: data, loading: false }));
          return { success: true };
        } else {
          update(state => ({ 
            ...state, 
            loading: false, 
            error: data.error || 'Registration failed' 
          }));
          return { success: false, error: data.error };
        }
      } catch (error) {
        console.error('Registration error:', error);
        update(state => ({ 
          ...state, 
          loading: false, 
          error: 'Registration request failed' 
        }));
        return { success: false, error: 'Registration request failed' };
      }
    },
    
    // Logout
    logout: async () => {
      update(state => ({ ...state, loading: true }));
      
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
        update(state => ({ ...state, user: null, loading: false }));
      } catch (error) {
        console.error('Logout error:', error);
        update(state => ({ ...state, loading: false }));
      }
    },
    
    // Check if user has password
    checkHasPassword: async (email: string) => {
      try {
        const response = await fetch('/api/auth/check-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
        });
        
        if (response.ok) {
          const data = await response.json();
          return data.hasPassword;
        }
        return false;
      } catch (error) {
        console.error('Check password error:', error);
        return false;
      }
    },
    
    // Clear errors
    clearError: () => {
      update(state => ({ ...state, error: null }));
    },
    
    // Reset store
    reset: () => {
      set(initialState);
    }
  };
}

// Create and export the store
export const auth = createAuthStore();

// Derived stores for convenience
export const user = derived(auth, $auth => $auth.user);
export const isAuthenticated = derived(auth, $auth => !!$auth.user?.authenticated);
export const isLoading = derived(auth, $auth => $auth.loading);
export const authError = derived(auth, $auth => $auth.error);

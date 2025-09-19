import { redirect } from '@sveltejs/kit';

// List of routes that require authentication
const protectedRoutes = [
  '/mapConnection',
  '/createNorthStar',
  '/designExperiment'
];

// List of routes that are public
const publicRoutes = [
  '/',
  '/paulConnect'
];

export const load = async ({ fetch, url }) => {
  // Check if the current route is protected
  const isProtectedRoute = protectedRoutes.some(route => url.pathname.startsWith(route));
  
  if (!isProtectedRoute) {
    return {};
  }

  // For protected routes, check authentication
  try {
    const response = await fetch('/api/auth/me');
    
    if (response.ok) {
      const userData = await response.json();
      
      if (userData.authenticated) {
        return {
          user: userData
        };
      }
    }
    
    // If not authenticated, redirect to dashboard with the intended URL as a redirect parameter
    throw redirect(302, `/?redirectTo=${url.pathname}${url.search}`);
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }
    
    // For any other errors, redirect to dashboard
    throw redirect(302, '/');
  }
};

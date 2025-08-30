import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false, redirectTo = '/login' }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Debug logging for admin routes
  if (process.env.NODE_ENV === 'development' && requireAdmin) {
    console.log('=== PROTECTED ROUTE DEBUG ===');
    console.log('Route:', location.pathname);
    console.log('Require Auth:', requireAuth);
    console.log('Require Admin:', requireAdmin);
    console.log('User:', user);
    console.log('User is_admin:', user?.is_admin);
    console.log('Loading:', loading);
  }

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-reaper-black relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-pattern opacity-5"></div>
        
        {/* Dark overlay with red gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-reaper-black via-reaper-dark-gray to-reaper-black opacity-90"></div>

        {/* Floating red particles effect */}
        <div className="absolute inset-0">
          {[...Array(15)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-reaper-red rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>

        <div className="relative z-10 flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-reaper-red mx-auto mb-4"></div>
            <p className="text-gray-400 font-reaper">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // If authentication is required and user is not logged in
  if (requireAuth && !user) {
    // Redirect to login with the current location to redirect back after login
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // If admin access is required and user is not admin
  if (requireAdmin && user && !user.is_admin) {
    if (process.env.NODE_ENV === 'development') {
      console.log('Admin access denied - redirecting to dashboard');
    }
    // Redirect to dashboard if user is not admin
    return <Navigate to="/dashboard" replace />;
  }

  // If user is logged in but trying to access login/register pages
  if (!requireAuth && user) {
    // Redirect to dashboard if they're already logged in
    return <Navigate to="/dashboard" replace />;
  }

  // User is authenticated and can access the page
  if (process.env.NODE_ENV === 'development' && requireAdmin) {
    console.log('Admin access granted - rendering component');
  }
  return children;
};

export default ProtectedRoute;

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';

// Extend Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        username: string;
        is_admin: boolean;
      };
    }
  }
}

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// JWT verification middleware
export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    res.status(401).json({ success: false, error: 'Access token required' });
    return;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      res.status(500).json({ success: false, error: 'JWT secret not configured' });
      return;
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    // Fetch user data from Supabase
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, is_admin')
        .eq('id', decoded.userId)
        .single();

      if (error || !user) {
        res.status(401).json({ success: false, error: 'Invalid token' });
        return;
      }

      req.user = user;
    } else {
      // Fallback when Supabase is not configured
      req.user = {
        id: decoded.userId,
        email: decoded.email || '',
        username: decoded.username || '',
        is_admin: decoded.isAdmin || false
      };
    }

    next();
  } catch (error) {
    res.status(403).json({ success: false, error: 'Invalid token' });
  }
};

// Admin verification middleware
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ success: false, error: 'Authentication required' });
    return;
  }

  if (!req.user.is_admin) {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }

  next();
};

// Optional authentication middleware (doesn't fail if no token)
export const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next();
    }

    const decoded = jwt.verify(token, jwtSecret) as any;
    
    if (supabase) {
      const { data: user, error } = await supabase
        .from('users')
        .select('id, email, username, is_admin')
        .eq('id', decoded.userId)
        .single();

      if (!error && user) {
        req.user = user;
      }
    } else {
      req.user = {
        id: decoded.userId,
        email: decoded.email || '',
        username: decoded.username || '',
        is_admin: decoded.isAdmin || false
      };
    }
  } catch (error) {
    // Ignore token errors in optional auth
  }

  next();
};

import { RequestHandler } from 'express';
import { supabase } from '../middleware/auth';
import { ApiResponse } from '@shared/api';

// Health check endpoint
export const handleHealthCheck: RequestHandler = async (_req, res) => {
  try {
    const health: any = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Check database connection if Supabase is configured
    if (supabase) {
      try {
        const { error } = await supabase
          .from('users')
          .select('id')
          .limit(1)
          .single();

        health.database = error ? 'error' : 'connected';
      } catch (dbError) {
        health.database = 'error';
      }
    } else {
      health.database = 'not_configured';
    }

    res.json({
      success: true,
      data: health
    } as ApiResponse);

  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    });
  }
};

// Test database connection
export const handleTestConnection: RequestHandler = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Test basic query
    const { data, error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });

    if (error) {
      return res.status(500).json({
        success: false,
        error: `Database connection failed: ${error.message}`
      });
    }

    res.json({
      success: true,
      message: 'Database connection successful',
      data: {
        total_users: data || 0,
        connection_time: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed'
    });
  }
};

// Get application configuration (public settings)
export const handleGetConfigs: RequestHandler = async (req, res) => {
  try {
    const configs = {
      app: {
        name: 'Aura Hub',
        version: process.env.npm_package_version || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      },
      features: {
        registration: true,
        email_verification: !!process.env.SMTP_USERNAME || !!process.env.RESEND_API_KEY,
        payments: true,
        admin_panel: true
      },
      wallet: {
        minimum_deposit: parseFloat(process.env.MINIMUM_DEPOSIT || '50.00'),
        supported_currencies: (process.env.SUPPORTED_CURRENCIES || 'BTC,ETH,USDT').split(',')
      },
      limits: {
        max_file_size: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
        max_files_per_upload: parseInt(process.env.MAX_FILES_PER_UPLOAD || '10')
      }
    };

    res.json({
      success: true,
      data: configs
    } as ApiResponse);

  } catch (error) {
    console.error('Get configs error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get configs'
    });
  }
};

// Content statistics
export const handleContentStats: RequestHandler = async (req, res) => {
  try {
    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Get various content statistics
    const getUsersCount = supabase.from('users').select('*', { count: 'exact', head: true });
    const getDepositsCount = supabase.from('deposits').select('*', { count: 'exact', head: true });
    
    let getTicketsCount;
    let getNewsCount;
    
    try {
      getTicketsCount = supabase.from('tickets').select('*', { count: 'exact', head: true });
    } catch {
      getTicketsCount = Promise.resolve({ count: 0 });
    }
    
    try {
      getNewsCount = supabase.from('news').select('*', { count: 'exact', head: true });
    } catch {
      getNewsCount = Promise.resolve({ count: 0 });
    }

    const [
      { count: totalUsers },
      { count: totalDeposits },
      { count: totalTickets },
      { count: totalNews }
    ] = await Promise.all([
      getUsersCount,
      getDepositsCount,
      getTicketsCount,
      getNewsCount
    ]);

    // Get recent activity (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const getRecentUsersCount = supabase.from('users').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString());
    const getRecentDepositsCount = supabase.from('deposits').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString());
    
    let getRecentTicketsCount;
    let getRecentNewsCount;
    
    try {
      getRecentTicketsCount = supabase.from('tickets').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString());
    } catch {
      getRecentTicketsCount = Promise.resolve({ count: 0 });
    }
    
    try {
      getRecentNewsCount = supabase.from('news').select('*', { count: 'exact', head: true }).gte('created_at', weekAgo.toISOString());
    } catch {
      getRecentNewsCount = Promise.resolve({ count: 0 });
    }

    const [
      { count: recentUsers },
      { count: recentDeposits },
      { count: recentTickets },
      { count: recentNews }
    ] = await Promise.all([
      getRecentUsersCount,
      getRecentDepositsCount,
      getRecentTicketsCount,
      getRecentNewsCount
    ]);

    const stats = {
      totals: {
        users: totalUsers || 0,
        deposits: totalDeposits || 0,
        tickets: totalTickets || 0,
        news: totalNews || 0
      },
      recent: {
        users: recentUsers || 0,
        deposits: recentDeposits || 0,
        tickets: recentTickets || 0,
        news: recentNews || 0
      },
      generated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      data: stats
    } as ApiResponse);

  } catch (error) {
    console.error('Content stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get content stats'
    });
  }
};

// BIN checker functionality
export const handleBinCheck: RequestHandler = async (req, res) => {
  try {
    const { bin } = req.body;

    if (!bin) {
      return res.status(400).json({
        success: false,
        error: 'BIN number is required'
      });
    }

    if (bin.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'BIN must be at least 6 digits'
      });
    }

    // Mock BIN data - in a real implementation, you would query a BIN database
    const mockBinData = {
      bin: bin.substring(0, 6),
      bank: {
        name: 'Sample Bank',
        country: 'US',
        country_code: 'USA',
        website: 'https://example.com'
      },
      card: {
        scheme: 'VISA',
        type: 'DEBIT',
        brand: 'VISA'
      },
      prepaid: false,
      commercial: false
    };

    res.json({
      success: true,
      data: mockBinData,
      message: 'BIN lookup successful'
    } as ApiResponse);

  } catch (error) {
    console.error('BIN check error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'BIN check failed'
    });
  }
};

// Debug endpoints (only in development)
export const handleDebugToken: RequestHandler = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Debug endpoints not available in production'
    });
  }

  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.json({
        success: true,
        data: {
          token: null,
          message: 'No token provided'
        }
      });
    }

    // Decode without verification for debugging
    const jwt = require('jsonwebtoken');
    const decoded = jwt.decode(token, { complete: true });

    res.json({
      success: true,
      data: {
        token: token.substring(0, 20) + '...',
        decoded: decoded,
        user: req.user || null
      }
    });

  } catch (error) {
    console.error('Debug token error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed'
    });
  }
};

export const handleDebugDb: RequestHandler = async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({
      success: false,
      error: 'Debug endpoints not available in production'
    });
  }

  try {
    if (!supabase) {
      return res.json({
        success: true,
        data: {
          database: 'not_configured',
          supabase_url: !!process.env.VITE_SUPABASE_URL || !!process.env.SUPABASE_URL,
          supabase_key: !!process.env.VITE_SUPABASE_ANON_KEY || !!process.env.SUPABASE_ANON_KEY
        }
      });
    }

    // Test various table accesses
    const tests = {
      users: false,
      deposits: false,
      invite_codes: false
    };

    try {
      await supabase.from('users').select('id').limit(1);
      tests.users = true;
    } catch (e) {
      // Table might not exist
    }

    try {
      await supabase.from('deposits').select('id').limit(1);
      tests.deposits = true;
    } catch (e) {
      // Table might not exist
    }

    try {
      await supabase.from('invite_codes').select('id').limit(1);
      tests.invite_codes = true;
    } catch (e) {
      // Table might not exist
    }

    res.json({
      success: true,
      data: {
        database: 'configured',
        table_access: tests,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Debug DB error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Debug failed'
    });
  }
};

import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../middleware/auth';
import { LoginRequest, LoginResponse, AdminStats, AdminSettings, ApiResponse } from '@shared/api';

// Admin login handler
export const handleAdminLogin: RequestHandler = async (req, res) => {
  try {
    const { email, username, password }: LoginRequest = req.body;
    
    const loginIdentifier = email || username;
    console.log('Admin login attempt for:', loginIdentifier);
    
    if (!loginIdentifier || !password) {
      return res.status(400).json({ 
        success: false,
        error: 'Login identifier and password are required'
      } as LoginResponse);
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      } as LoginResponse);
    }

    // Find admin user
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${loginIdentifier},username.eq.${loginIdentifier}`)
      .eq('is_admin', true)
      .single();

    // Fallback to separate queries if OR fails
    if (userError) {
      const emailResult = await supabase
        .from('users')
        .select('*')
        .eq('email', loginIdentifier)
        .eq('is_admin', true)
        .single();
      
      if (emailResult.data && !emailResult.error) {
        user = emailResult.data;
        userError = null;
      } else {
        const usernameResult = await supabase
          .from('users')
          .select('*')
          .eq('username', loginIdentifier)
          .eq('is_admin', true)
          .single();
        
        if (usernameResult.data && !usernameResult.error) {
          user = usernameResult.data;
          userError = null;
        } else {
          userError = usernameResult.error;
        }
      }
    }

    if (userError || !user) {
      console.log('Admin user not found:', loginIdentifier);
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials'
      } as LoginResponse);
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.log('Invalid password for admin:', user.username);
      return res.status(401).json({
        success: false,
        error: 'Invalid admin credentials'
      } as LoginResponse);
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      } as LoginResponse);
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        username: user.username,
        isAdmin: true
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('Admin login successful:', user.username);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet_balance: user.wallet_balance || 0,
        is_admin: true
      },
      token
    } as LoginResponse);

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Admin login failed'
    } as LoginResponse);
  }
};

// Get admin statistics
export const handleGetAdminStats: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Get total users count
    const { count: totalUsers } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get total deposits count
    const { count: totalDeposits } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true });

    // Get pending deposits count
    const { count: pendingDeposits } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    // Calculate total revenue (sum of confirmed deposits)
    const { data: revenueData } = await supabase
      .from('deposits')
      .select('amount')
      .eq('status', 'confirmed');

    const totalRevenue = revenueData?.reduce((sum, deposit) => sum + deposit.amount, 0) || 0;

    const stats: AdminStats = {
      total_users: totalUsers || 0,
      total_deposits: totalDeposits || 0,
      total_revenue: totalRevenue,
      pending_deposits: pendingDeposits || 0
    };

    res.json({
      success: true,
      data: stats
    } as ApiResponse<AdminStats>);

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get admin stats'
    });
  }
};

// Get admin settings
export const handleGetAdminSettings: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // For now, return hardcoded settings
    // In a real implementation, these would come from a settings table
    const settings: AdminSettings = {
      walletSettings: {
        minimumDeposit: parseFloat(process.env.MINIMUM_DEPOSIT || '50.00'),
        supportedCurrencies: (process.env.SUPPORTED_CURRENCIES || 'BTC,ETH,USDT').split(',')
      }
    };

    res.json({
      success: true,
      data: settings
    } as ApiResponse<AdminSettings>);

  } catch (error) {
    console.error('Get admin settings error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get admin settings'
    });
  }
};

// Update admin settings
export const handleUpdateAdminSettings: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { walletSettings } = req.body;

    if (!walletSettings) {
      return res.status(400).json({
        success: false,
        error: 'Wallet settings are required'
      });
    }

    // In a real implementation, you would save these to a settings table
    // For now, we'll just validate and return success
    if (walletSettings.minimumDeposit && walletSettings.minimumDeposit < 0) {
      return res.status(400).json({
        success: false,
        error: 'Minimum deposit must be positive'
      });
    }

    const updatedSettings: AdminSettings = {
      walletSettings: {
        minimumDeposit: walletSettings.minimumDeposit || 50.00,
        supportedCurrencies: walletSettings.supportedCurrencies || ['BTC', 'ETH', 'USDT']
      }
    };

    res.json({
      success: true,
      data: updatedSettings,
      message: 'Settings updated successfully'
    } as ApiResponse<AdminSettings>);

  } catch (error) {
    console.error('Update admin settings error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update admin settings'
    });
  }
};

// Get pending deposits for admin review
export const handleGetPendingDeposits: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const { data: deposits, error } = await supabase
      .from('deposits')
      .select(`
        *,
        users:user_id (
          id,
          username,
          email
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get pending deposits'
      });
    }

    // Get total count
    const { count } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    res.json({
      success: true,
      data: deposits || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get pending deposits error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get pending deposits'
    });
  }
};

// Confirm deposit (admin only)
export const handleConfirmDeposit: RequestHandler = async (req, res) => {
  try {
    if (!req.user || !req.user.is_admin) {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { depositId } = req.body;

    if (!depositId) {
      return res.status(400).json({
        success: false,
        error: 'Deposit ID is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Get deposit details
    const { data: deposit, error: depositError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (depositError || !deposit) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found'
      });
    }

    if (deposit.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Deposit is not pending'
      });
    }

    // Update deposit status
    const { error: updateDepositError } = await supabase
      .from('deposits')
      .update({ 
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: req.user.id
      })
      .eq('id', depositId);

    if (updateDepositError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to confirm deposit'
      });
    }

    // Update user wallet balance
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('wallet_balance')
      .eq('id', deposit.user_id)
      .single();

    if (userError || !user) {
      console.error('Failed to get user for wallet update:', userError);
    } else {
      const newBalance = (user.wallet_balance || 0) + deposit.amount;
      
      const { error: balanceError } = await supabase
        .from('users')
        .update({ wallet_balance: newBalance })
        .eq('id', deposit.user_id);

      if (balanceError) {
        console.error('Failed to update wallet balance:', balanceError);
      }
    }

    res.json({
      success: true,
      message: 'Deposit confirmed successfully'
    });

  } catch (error) {
    console.error('Confirm deposit error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to confirm deposit'
    });
  }
};

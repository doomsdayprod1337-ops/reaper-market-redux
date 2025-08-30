import { RequestHandler } from 'express';
import { supabase } from '../middleware/auth';
import { CreateDepositRequest, Deposit, DepositResponse, ApiResponse, PaginatedResponse } from '@shared/api';

// Get user deposits
export const handleGetDeposits: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get user's deposits
    const { data: deposits, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get deposits'
      });
    }

    // Get total count
    const { count } = await supabase
      .from('deposits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', req.user.id);

    res.json({
      success: true,
      data: deposits || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    } as PaginatedResponse<Deposit>);

  } catch (error) {
    console.error('Get deposits error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deposits'
    });
  }
};

// Create new deposit
export const handleCreateDeposit: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { amount, currency, payment_processor }: CreateDepositRequest = req.body;

    if (!amount || !currency) {
      return res.status(400).json({
        success: false,
        error: 'Amount and currency are required'
      } as DepositResponse);
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Amount must be positive'
      } as DepositResponse);
    }

    // Check minimum deposit amount
    const minimumDeposit = parseFloat(process.env.MINIMUM_DEPOSIT || '50.00');
    if (amount < minimumDeposit) {
      return res.status(400).json({
        success: false,
        error: `Minimum deposit amount is ${minimumDeposit} ${currency}`
      } as DepositResponse);
    }

    // Validate currency
    const supportedCurrencies = (process.env.SUPPORTED_CURRENCIES || 'BTC,ETH,USDT').split(',');
    if (!supportedCurrencies.includes(currency.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Unsupported currency. Supported currencies: ${supportedCurrencies.join(', ')}`
      } as DepositResponse);
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      } as DepositResponse);
    }

    // Create deposit record
    const { data: deposit, error } = await supabase
      .from('deposits')
      .insert({
        user_id: req.user.id,
        amount: parseFloat(amount.toString()),
        currency: currency.toUpperCase(),
        payment_processor: payment_processor || 'manual',
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error || !deposit) {
      console.error('Create deposit error:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to create deposit'
      } as DepositResponse);
    }

    console.log('Deposit created:', deposit.id, 'for user:', req.user.username);

    res.json({
      success: true,
      deposit: deposit as Deposit
    } as DepositResponse);

  } catch (error) {
    console.error('Create deposit error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create deposit'
    } as DepositResponse);
  }
};

// Get specific deposit
export const handleGetDeposit: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { depositId } = req.params;

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

    const { data: deposit, error } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .eq('user_id', req.user.id) // Ensure user can only access their own deposits
      .single();

    if (error || !deposit) {
      return res.status(404).json({
        success: false,
        error: 'Deposit not found'
      });
    }

    res.json({
      success: true,
      data: deposit
    } as ApiResponse<Deposit>);

  } catch (error) {
    console.error('Get deposit error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get deposit'
    });
  }
};

// Get minimum deposit amount
export const handleGetMinimumDeposit: RequestHandler = async (req, res) => {
  try {
    const currency = (req.query.currency as string) || 'USD';
    const minimumDeposit = parseFloat(process.env.MINIMUM_DEPOSIT || '50.00');

    res.json({
      success: true,
      data: {
        minimumDepositAmount: minimumDeposit,
        currency: currency.toUpperCase()
      }
    });

  } catch (error) {
    console.error('Get minimum deposit error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get minimum deposit'
    });
  }
};

// Sync wallet balance (admin or user)
export const handleSyncWallet: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { userId } = req.body;
    const targetUserId = userId && req.user.is_admin ? userId : req.user.id;

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Calculate total confirmed deposits
    const { data: deposits, error: depositsError } = await supabase
      .from('deposits')
      .select('amount')
      .eq('user_id', targetUserId)
      .eq('status', 'confirmed');

    if (depositsError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to calculate wallet balance'
      });
    }

    const totalDeposits = deposits?.reduce((sum, deposit) => sum + deposit.amount, 0) || 0;

    // Update user wallet balance
    const { error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: totalDeposits })
      .eq('id', targetUserId);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update wallet balance'
      });
    }

    res.json({
      success: true,
      data: {
        wallet_balance: totalDeposits
      },
      message: 'Wallet balance synced successfully'
    });

  } catch (error) {
    console.error('Sync wallet error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to sync wallet'
    });
  }
};

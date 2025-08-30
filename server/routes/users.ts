import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import { supabase } from '../middleware/auth';
import { User, ProfileUpdateRequest, ApiResponse } from '@shared/api';

// Get user profile
export const handleGetProfile: RequestHandler = async (req, res) => {
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

    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, username, wallet_balance, is_admin, created_at, email_verified')
      .eq('id', req.user.id)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.json({
      success: true,
      data: user
    } as ApiResponse<User>);

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get profile'
    });
  }
};

// Update user profile
export const handleUpdateProfile: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { username, email }: ProfileUpdateRequest = req.body;

    if (!username && !email) {
      return res.status(400).json({
        success: false,
        error: 'At least one field must be provided'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    const updateData: any = {};
    
    if (username) {
      // Check if username is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .neq('id', req.user.id)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Username already taken'
        });
      }

      updateData.username = username;
    }

    if (email) {
      // Check if email is already taken
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', req.user.id)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          error: 'Email already taken'
        });
      }

      updateData.email = email;
      updateData.email_verified = false; // Require re-verification for new email
    }

    const { data: updatedUser, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.user.id)
      .select('id, email, username, wallet_balance, is_admin, created_at, email_verified')
      .single();

    if (error || !updatedUser) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update profile'
      });
    }

    res.json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully'
    } as ApiResponse<User>);

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update profile'
    });
  }
};

// Change password
export const handleChangePassword: RequestHandler = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current password and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 6 characters'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Get current user data
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('password_hash')
      .eq('id', req.user.id)
      .single();

    if (userError || !user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    // Verify current password
    const passwordMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect'
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    const { error: updateError } = await supabase
      .from('users')
      .update({ password_hash: newPasswordHash })
      .eq('id', req.user.id);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update password'
      });
    }

    res.json({
      success: true,
      message: 'Password updated successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to change password'
    });
  }
};

// Get user referrals
export const handleGetReferrals: RequestHandler = async (req, res) => {
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

    // Get referrals made by this user
    const { data: referrals, error } = await supabase
      .from('users')
      .select('id, username, email, created_at')
      .eq('referral_code_used', req.user.username) // Assuming username is used as referral code
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get referrals'
      });
    }

    res.json({
      success: true,
      data: referrals || [],
      message: `Found ${referrals?.length || 0} referrals`
    });

  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get referrals'
    });
  }
};

// Get all users (admin only)
export const handleGetAllUsers: RequestHandler = async (req, res) => {
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

    // Get total count
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    // Get users
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, username, wallet_balance, is_admin, created_at, email_verified')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return res.status(500).json({
        success: false,
        error: 'Failed to get users'
      });
    }

    res.json({
      success: true,
      data: users || [],
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get users'
    });
  }
};

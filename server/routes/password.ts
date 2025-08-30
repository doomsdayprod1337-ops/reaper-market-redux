import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../middleware/auth';
import { ApiResponse } from '@shared/api';

// Store password reset tokens temporarily (in production, use Redis or database)
const resetTokens = new Map<string, { userId: string; timestamp: number }>();

// Forgot password - send reset email
export const handleForgotPassword: RequestHandler = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    // Check if user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, username')
      .eq('email', email)
      .single();

    // Don't reveal whether user exists or not for security
    if (userError || !user) {
      return res.json({
        success: true,
        message: 'If an account with this email exists, a password reset link has been sent.'
      });
    }

    // Generate reset token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      });
    }

    const resetToken = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        type: 'password_reset'
      },
      jwtSecret,
      { expiresIn: '1h' }
    );

    // Store token temporarily
    resetTokens.set(resetToken, {
      userId: user.id,
      timestamp: Date.now()
    });

    // In a real implementation, you would send an email with the reset link
    // For development, we'll log it
    console.log(`Password reset token for ${email}: ${resetToken}`);
    console.log(`Reset link: http://localhost:8080/reset-password?token=${resetToken}`);

    res.json({
      success: true,
      message: 'If an account with this email exists, a password reset link has been sent.',
      // In development, include the token
      ...(process.env.NODE_ENV === 'development' && {
        development_token: resetToken,
        development_message: `Development mode: Use token ${resetToken} to reset password`
      })
    } as ApiResponse);

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process password reset request'
    });
  }
};

// Verify reset token
export const handleVerifyResetToken: RequestHandler = async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: 'Reset token is required'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          error: 'Invalid reset token'
        });
      }

      // Check if token exists in our store
      const tokenData = resetTokens.get(token);
      if (!tokenData) {
        return res.status(400).json({
          success: false,
          error: 'Reset token has expired or been used'
        });
      }

      // Check if token is expired (1 hour)
      if (Date.now() - tokenData.timestamp > 60 * 60 * 1000) {
        resetTokens.delete(token);
        return res.status(400).json({
          success: false,
          error: 'Reset token has expired'
        });
      }

      res.json({
        success: true,
        message: 'Reset token is valid',
        userId: decoded.userId
      } as ApiResponse);

    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

  } catch (error) {
    console.error('Verify reset token error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to verify reset token'
    });
  }
};

// Reset password
export const handleResetPassword: RequestHandler = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Reset token and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        error: 'JWT secret not configured'
      });
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      });
    }

    try {
      const decoded = jwt.verify(token, jwtSecret) as any;
      
      if (decoded.type !== 'password_reset') {
        return res.status(400).json({
          success: false,
          error: 'Invalid reset token'
        });
      }

      // Check if token exists in our store
      const tokenData = resetTokens.get(token);
      if (!tokenData) {
        return res.status(400).json({
          success: false,
          error: 'Reset token has expired or been used'
        });
      }

      // Check if token is expired (1 hour)
      if (Date.now() - tokenData.timestamp > 60 * 60 * 1000) {
        resetTokens.delete(token);
        return res.status(400).json({
          success: false,
          error: 'Reset token has expired'
        });
      }

      // Hash new password
      const saltRounds = 10;
      const passwordHash = await bcrypt.hash(newPassword, saltRounds);

      // Update user password
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          password_hash: passwordHash,
          updated_at: new Date().toISOString()
        })
        .eq('id', decoded.userId);

      if (updateError) {
        return res.status(500).json({
          success: false,
          error: 'Failed to update password'
        });
      }

      // Remove used token
      resetTokens.delete(token);

      console.log(`Password reset successful for user ${decoded.userId}`);

      res.json({
        success: true,
        message: 'Password has been reset successfully'
      } as ApiResponse);

    } catch (jwtError) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or expired reset token'
      });
    }

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to reset password'
    });
  }
};

// Clean up expired tokens (utility function)
export const cleanupExpiredTokens = () => {
  const now = Date.now();
  const oneHour = 60 * 60 * 1000;
  
  for (const [token, data] of resetTokens.entries()) {
    if (now - data.timestamp > oneHour) {
      resetTokens.delete(token);
    }
  }
};

// Run cleanup every 10 minutes
setInterval(cleanupExpiredTokens, 10 * 60 * 1000);

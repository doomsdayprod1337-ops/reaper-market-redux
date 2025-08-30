import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { supabase } from '../middleware/auth';
import { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse
} from '@shared/api';

// Login handler
export const handleLogin: RequestHandler = async (req, res) => {
  try {
    const { email, username, password }: LoginRequest = req.body;
    
    // Check if user provided either email or username
    const loginIdentifier = email || username;
    console.log('Login attempt for:', loginIdentifier, 'Type:', email ? 'email' : 'username');
    
    // Validate input
    if (!loginIdentifier || !password) {
      console.log('Missing login identifier or password');
      return res.status(400).json({ 
        success: false,
        error: 'Login identifier (email or username) and password are required'
      } as LoginResponse);
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      } as LoginResponse);
    }

    // Find user by email or username
    console.log('Looking up user in database...');
    let { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .or(`email.eq.${loginIdentifier},username.eq.${loginIdentifier}`)
      .single();

    // If the OR query fails, try separate queries
    if (userError) {
      console.log('OR query failed, trying separate queries...');
      console.log('OR query error:', userError);
      
      // Try email first
      let emailResult = await supabase
        .from('users')
        .select('*')
        .eq('email', loginIdentifier)
        .single();
      
      if (emailResult.data && !emailResult.error) {
        user = emailResult.data;
        userError = null;
        console.log('User found by email');
      } else {
        // Try username
        let usernameResult = await supabase
          .from('users')
          .select('*')
          .eq('username', loginIdentifier)
          .single();
        
        if (usernameResult.data && !usernameResult.error) {
          user = usernameResult.data;
          userError = null;
          console.log('User found by username');
        } else {
          userError = usernameResult.error;
          console.log('User not found by either email or username');
        }
      }
    }

    if (userError || !user) {
      console.log('User lookup error:', userError);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      } as LoginResponse);
    }

    console.log('User found:', user.username);

    // Check if email is verified
    if (!user.email_verified) {
      console.log('Email not verified for user:', user.username);
      return res.status(401).json({
        success: false,
        error: 'Please verify your email before logging in'
      } as LoginResponse);
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      console.log('Password mismatch for user:', user.username);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      } as LoginResponse);
    }

    console.log('Password verified for user:', user.username);

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
        isAdmin: user.is_admin 
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    console.log('Login successful for user:', user.username);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        wallet_balance: user.wallet_balance || 0,
        is_admin: user.is_admin || false
      },
      token
    } as LoginResponse);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Login failed'
    } as LoginResponse);
  }
};

// Register handler
export const handleRegister: RequestHandler = async (req, res) => {
  try {
    const { username, email, password, inviteCode, referralCode }: RegisterRequest = req.body;

    // Validate input
    if (!username || !email || !password || !inviteCode) {
      return res.status(400).json({
        success: false,
        error: 'All fields are required'
      } as RegisterResponse);
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters'
      } as RegisterResponse);
    }

    console.log('Registration attempt for:', email);

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      } as RegisterResponse);
    }

    // Check if invite code is valid
    console.log('Checking invite code:', inviteCode);
    const { data: inviteData, error: inviteError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', inviteCode)
      .eq('is_active', true)
      .single();

    if (inviteError || !inviteData) {
      console.log('Invalid invite code:', inviteCode);
      return res.status(400).json({
        success: false,
        error: 'Invalid invite code'
      } as RegisterResponse);
    }

    // Check if invite code has remaining uses
    if (inviteData.current_uses >= inviteData.max_uses) {
      return res.status(400).json({
        success: false,
        error: 'Invite code has been fully used'
      } as RegisterResponse);
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`email.eq.${email},username.eq.${username}`)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: 'User with this email or username already exists'
      } as RegisterResponse);
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        username,
        email,
        password_hash: passwordHash,
        wallet_balance: 0,
        is_admin: false,
        email_verified: false,
        invite_code_used: inviteCode,
        referral_code_used: referralCode || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (createError || !newUser) {
      console.error('User creation error:', createError);
      return res.status(500).json({
        success: false,
        error: 'Failed to create user'
      } as RegisterResponse);
    }

    // Update invite code usage
    await supabase
      .from('invite_codes')
      .update({ current_uses: inviteData.current_uses + 1 })
      .eq('id', inviteData.id);

    console.log('User created successfully:', newUser.username);

    res.json({
      success: true,
      user: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username
      }
    } as RegisterResponse);

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Registration failed'
    } as RegisterResponse);
  }
};

// Logout handler
export const handleLogout: RequestHandler = async (req, res) => {
  try {
    // In a stateless JWT system, logout is handled client-side
    // But we can log the logout event
    console.log('User logged out');
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
};

// Verify email handler  
export const handleVerifyEmail: RequestHandler = async (req, res) => {
  try {
    const { email, code }: VerifyEmailRequest = req.body;

    if (!email || !code) {
      return res.status(400).json({
        success: false,
        error: 'Email and code are required'
      } as VerifyEmailResponse);
    }

    if (!supabase) {
      return res.status(500).json({
        success: false,
        error: 'Database not configured'
      } as VerifyEmailResponse);
    }

    // Find user by email
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (userError || !user) {
      return res.status(400).json({
        success: false,
        error: 'User not found'
      } as VerifyEmailResponse);
    }

    // Check if already verified
    if (user.email_verified) {
      return res.json({
        success: true
      } as VerifyEmailResponse);
    }

    // In a real implementation, you would check the verification code
    // For now, we'll assume any code verifies the email
    const { error: updateError } = await supabase
      .from('users')
      .update({ email_verified: true })
      .eq('id', user.id);

    if (updateError) {
      return res.status(500).json({
        success: false,
        error: 'Failed to verify email'
      } as VerifyEmailResponse);
    }

    res.json({
      success: true
    } as VerifyEmailResponse);

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Verification failed'
    } as VerifyEmailResponse);
  }
};

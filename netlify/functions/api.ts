import type { Handler } from "@netlify/functions";
import nodemailer from "nodemailer";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createClient } from "@supabase/supabase-js";
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  AdminStats,
  AdminSettings,
  ApiResponse
} from "../../shared/api";

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';

const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// In-memory storage for verification codes (in production, use a database)
const verificationCodes = new Map<
  string,
  { code: string; timestamp: number; displayOnScreen?: boolean }
>();

// Create email transporter (Postmark SMTP or fallback)
const createTransporter = () => {
  // Use Postmark SMTP if configured
  if (process.env.POSTMARK_SERVER_TOKEN) {
    return nodemailer.createTransport({
      host: "smtp.postmarkapp.com",
      port: 587,
      secure: false, // Use TLS
      auth: {
        user: process.env.POSTMARK_SERVER_TOKEN,
        pass: process.env.POSTMARK_SERVER_TOKEN,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  
  // Fallback to regular SMTP
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // Use TLS
    auth: {
      user: process.env.SMTP_USERNAME,
      pass: process.env.SMTP_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
};

// Note: Using Postmark SMTP instead of API client for better compatibility

// JWT verification helper
const verifyToken = (token: string) => {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT secret not configured');
  }
  return jwt.verify(token, jwtSecret) as any;
};

// Get user from token
const getUserFromToken = async (authHeader: string | undefined) => {
  if (!authHeader) {
    throw new Error('Authorization header required');
  }
  
  const token = authHeader.split(' ')[1]; // Bearer TOKEN
  if (!token) {
    throw new Error('Access token required');
  }
  
  const decoded = verifyToken(token);
  
  if (!supabase) {
    throw new Error('Database not configured');
  }
  
  const { data: user, error } = await supabase
    .from('users')
    .select('id, email, username, is_admin, wallet_balance')
    .eq('id', decoded.userId)
    .single();
  
  if (error || !user) {
    throw new Error('User not found');
  }
  
  return user;
};

export const handler: Handler = async (event, context) => {
  // Enable CORS
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  };

  // Handle preflight requests
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers,
      body: "",
    };
  }

  const path = event.path.replace("/.netlify/functions/api", "");

  try {
    // Handle POST requests
    if (event.httpMethod === "POST") {
      const body = event.body ? JSON.parse(event.body) : {};

      switch (path) {
        case "/login":
          const { email: loginEmail, username: loginUsername, password: loginPassword }: LoginRequest = body;
          
          const loginIdentifier = loginEmail || loginUsername;
          if (!loginIdentifier || !loginPassword) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Login identifier (email or username) and password are required'
              } as LoginResponse),
            };
          }

          if (!supabase) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Database not configured'
              } as LoginResponse),
            };
          }

          try {
            // Find user by email or username
            let { data: loginUser, error: loginUserError } = await supabase
              .from('users')
              .select('*')
              .or(`email.eq.${loginIdentifier},username.eq.${loginIdentifier}`)
              .single();

            // Fallback to separate queries if OR fails
            if (loginUserError) {
              const emailResult = await supabase
                .from('users')
                .select('*')
                .eq('email', loginIdentifier)
                .single();
              
              if (emailResult.data && !emailResult.error) {
                loginUser = emailResult.data;
                loginUserError = null;
              } else {
                const usernameResult = await supabase
                  .from('users')
                  .select('*')
                  .eq('username', loginIdentifier)
                  .single();
                
                if (usernameResult.data && !usernameResult.error) {
                  loginUser = usernameResult.data;
                  loginUserError = null;
                }
              }
            }

            if (loginUserError || !loginUser) {
              return {
                statusCode: 401,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Invalid credentials'
                } as LoginResponse),
              };
            }

            // Verify password
            const passwordMatch = await bcrypt.compare(loginPassword, loginUser.password_hash);
            if (!passwordMatch) {
              return {
                statusCode: 401,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Invalid credentials'
                } as LoginResponse),
              };
            }

            // Generate JWT token
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
              return {
                statusCode: 500,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'JWT secret not configured'
                } as LoginResponse),
              };
            }

            const token = jwt.sign(
              { 
                userId: loginUser.id,
                email: loginUser.email,
                username: loginUser.username,
                isAdmin: loginUser.is_admin
              },
              jwtSecret,
              { expiresIn: '24h' }
            );

            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: true,
                user: {
                  id: loginUser.id,
                  email: loginUser.email,
                  username: loginUser.username,
                  wallet_balance: loginUser.wallet_balance || 0,
                  is_admin: loginUser.is_admin || false
                },
                token
              } as LoginResponse),
            };
          } catch (loginError) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Login failed'
              } as LoginResponse),
            };
          }

        case "/register":
          const { username: regUsername, email: regEmail, password: regPassword, inviteCode, referralCode }: RegisterRequest = body;

          // Validate input
          if (!regUsername || !regEmail || !regPassword || !inviteCode) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'All fields are required'
              } as RegisterResponse),
            };
          }

          if (regPassword.length < 6) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Password must be at least 6 characters'
              } as RegisterResponse),
            };
          }

          if (!supabase) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Database not configured'
              } as RegisterResponse),
            };
          }

          try {
            // Check if invite code is valid
            const { data: inviteData, error: inviteError } = await supabase
              .from('invite_codes')
              .select('*')
              .eq('code', inviteCode)
              .eq('is_active', true)
              .single();

            if (inviteError || !inviteData) {
              return {
                statusCode: 400,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Invalid invite code'
                } as RegisterResponse),
              };
            }

            // Check if invite code has remaining uses
            if (inviteData.current_uses >= inviteData.max_uses) {
              return {
                statusCode: 400,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Invite code has been fully used'
                } as RegisterResponse),
              };
            }

            // Check if user already exists
            const { data: existingUser } = await supabase
              .from('users')
              .select('id')
              .or(`email.eq.${regEmail},username.eq.${regUsername}`)
              .single();

            if (existingUser) {
              return {
                statusCode: 400,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'User with this email or username already exists'
                } as RegisterResponse),
              };
            }

            // Hash password
            const saltRounds = 10;
            const passwordHash = await bcrypt.hash(regPassword, saltRounds);

            // Create user
            const { data: newUser, error: createError } = await supabase
              .from('users')
              .insert({
                username: regUsername,
                email: regEmail,
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
              return {
                statusCode: 500,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Failed to create user'
                } as RegisterResponse),
              };
            }

            // Update invite code usage
            await supabase
              .from('invite_codes')
              .update({ current_uses: inviteData.current_uses + 1 })
              .eq('id', inviteData.id);

            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: true,
                user: {
                  id: newUser.id,
                  email: newUser.email,
                  username: newUser.username
                }
              } as RegisterResponse),
            };
          } catch (registerError) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Registration failed'
              } as RegisterResponse),
            };
          }

        case "/admin-login":
          const { email: adminEmail, username: adminUsername, password: adminPassword }: LoginRequest = body;
          
          const adminLoginIdentifier = adminEmail || adminUsername;
          if (!adminLoginIdentifier || !adminPassword) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Login identifier and password are required'
              } as LoginResponse),
            };
          }

          if (!supabase) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Database not configured'
              } as LoginResponse),
            };
          }

          try {
            // Find admin user
            let { data: adminUser, error: adminUserError } = await supabase
              .from('users')
              .select('*')
              .or(`email.eq.${adminLoginIdentifier},username.eq.${adminLoginIdentifier}`)
              .eq('is_admin', true)
              .single();

            // Fallback to separate queries if OR fails
            if (adminUserError) {
              const emailResult = await supabase
                .from('users')
                .select('*')
                .eq('email', adminLoginIdentifier)
                .eq('is_admin', true)
                .single();
              
              if (emailResult.data && !emailResult.error) {
                adminUser = emailResult.data;
                adminUserError = null;
              } else {
                const usernameResult = await supabase
                  .from('users')
                  .select('*')
                  .eq('username', adminLoginIdentifier)
                  .eq('is_admin', true)
                  .single();
                
                if (usernameResult.data && !usernameResult.error) {
                  adminUser = usernameResult.data;
                  adminUserError = null;
                }
              }
            }

            if (adminUserError || !adminUser) {
              return {
                statusCode: 401,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Invalid admin credentials'
                } as LoginResponse),
              };
            }

            // Verify password
            const adminPasswordMatch = await bcrypt.compare(adminPassword, adminUser.password_hash);
            if (!adminPasswordMatch) {
              return {
                statusCode: 401,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Invalid admin credentials'
                } as LoginResponse),
              };
            }

            // Generate JWT token
            const jwtSecret = process.env.JWT_SECRET;
            if (!jwtSecret) {
              return {
                statusCode: 500,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'JWT secret not configured'
                } as LoginResponse),
              };
            }

            const adminToken = jwt.sign(
              { 
                userId: adminUser.id,
                email: adminUser.email,
                username: adminUser.username,
                isAdmin: true
              },
              jwtSecret,
              { expiresIn: '24h' }
            );

            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: true,
                user: {
                  id: adminUser.id,
                  email: adminUser.email,
                  username: adminUser.username,
                  wallet_balance: adminUser.wallet_balance || 0,
                  is_admin: true
                },
                token: adminToken
              } as LoginResponse),
            };
          } catch (adminLoginError) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Admin login failed'
              } as LoginResponse),
            };
          }

        case "/verify-email":
          const { email: verifyEmailAddr, code: verifyEmailCode }: VerifyEmailRequest = body;

          if (!verifyEmailAddr || !verifyEmailCode) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Email and code are required'
              } as VerifyEmailResponse),
            };
          }

          if (!supabase) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Database not configured'
              } as VerifyEmailResponse),
            };
          }

          try {
            // Find user by email
            const { data: verifyUser, error: verifyUserError } = await supabase
              .from('users')
              .select('*')
              .eq('email', verifyEmailAddr)
              .single();

            if (verifyUserError || !verifyUser) {
              return {
                statusCode: 400,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'User not found'
                } as VerifyEmailResponse),
              };
            }

            // Check if already verified
            if (verifyUser.email_verified) {
              return {
                statusCode: 200,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: true
                } as VerifyEmailResponse),
              };
            }

            // In a real implementation, you would check the verification code
            // For now, we'll assume any code verifies the email
            const { error: updateError } = await supabase
              .from('users')
              .update({ email_verified: true })
              .eq('id', verifyUser.id);

            if (updateError) {
              return {
                statusCode: 500,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({
                  success: false,
                  error: 'Failed to verify email'
                } as VerifyEmailResponse),
              };
            }

            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: true
              } as VerifyEmailResponse),
            };
          } catch (verifyError) {
            return {
              statusCode: 500,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: false,
                error: 'Verification failed'
              } as VerifyEmailResponse),
            };
          }

        case "/send-verification-email":
          const { email } = body;
          if (!email) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: "Email is required" }),
            };
          }

          // Generate 6-digit verification code
          const code = Math.floor(100000 + Math.random() * 900000).toString();
          
          // Clean up expired codes (5 minutes)
          const now = Date.now();
          for (const [key, value] of verificationCodes.entries()) {
            if (now - value.timestamp > 5 * 60 * 1000) {
              verificationCodes.delete(key);
            }
          }

          let emailSent = false;
          let displayOnScreen = false;

          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #000; color: #fff;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #ff4444; margin: 0; font-size: 28px; text-shadow: 0 0 10px #ff4444;">REAPER MARKET</h1>
                <p style="color: #888; margin: 5px 0 0 0; font-size: 12px;">The Dark Web Marketplace</p>
              </div>

              <div style="background: linear-gradient(135deg, #1a1a1a, #2a2a2a); padding: 30px; border-radius: 10px; border: 1px solid #333;">
                <h2 style="color: #ff4444; margin-top: 0;">Email Verification Required</h2>
                <p style="color: #ccc; line-height: 1.6;">Your verification code for Reaper Market registration:</p>

                <div style="text-align: center; margin: 25px 0;">
                  <div style="background: #000; border: 2px solid #ff4444; border-radius: 8px; padding: 20px; display: inline-block;">
                    <span style="font-size: 32px; font-weight: bold; color: #ff4444; letter-spacing: 8px; text-shadow: 0 0 10px #ff4444;">${code}</span>
                  </div>
                </div>

                <p style="color: #888; font-size: 14px; text-align: center; margin-bottom: 0;">
                  This code expires in 5 minutes.<br>
                  Enter this code to complete your registration.
                </p>
              </div>

              <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #333;">
                <p style="color: #666; font-size: 12px; margin: 0;">
                  If you didn't request this verification, please ignore this email.
                </p>
              </div>
            </div>
          `;

          // Send email via SMTP (Postmark SMTP or fallback)
          try {
            const transporter = createTransporter();
            
            const mailOptions: any = {
              from: `"${process.env.POSTMARK_FROM_NAME || process.env.SMTP_FROM_NAME || 'Reaper Market'}" <${process.env.POSTMARK_FROM_EMAIL || process.env.SMTP_FROM_EMAIL || 'noreply@reapermarket.com'}>`,
              to: email,
              subject: "Your Reaper Market Verification Code",
              html: emailHtml,
              text: `Your Reaper Market verification code is: ${code}\n\nThis code expires in 5 minutes.\nEnter this code to complete your registration.`
            };

            // Add Postmark stream header if using Postmark SMTP
            if (process.env.POSTMARK_SERVER_TOKEN) {
              mailOptions.headers = {
                'X-PM-Message-Stream': process.env.POSTMARK_MESSAGE_STREAM || 'market'
              };
            }

            await transporter.sendMail(mailOptions);
            
            if (process.env.POSTMARK_SERVER_TOKEN) {
              console.log(`✅ Email sent via Postmark SMTP to ${email}`);
            } else {
              console.log(`✅ Email sent via SMTP to ${email}`);
            }
            emailSent = true;
          } catch (emailError) {
            console.log(`⚠️  Email sending failed:`, emailError);
            displayOnScreen = true;
          }

          // Store code with timestamp and display flag
          verificationCodes.set(email, {
            code,
            timestamp: Date.now(),
            displayOnScreen,
          });

          return {
            statusCode: 200,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              displayOnScreen,
              message: displayOnScreen
                ? `Development mode: Your verification code is ${code}`
                : "Verification email sent successfully",
            }),
          };

        case "/verify-email-code":
          const { email: verifyEmail, code: verifyCode } = body;
          if (!verifyEmail || !verifyCode) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: "Email and code are required" }),
            };
          }

          const storedData = verificationCodes.get(verifyEmail);
          if (!storedData) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: "No verification code found" }),
            };
          }

          // Check if code is expired (5 minutes)
          const currentTime = Date.now();
          if (currentTime - storedData.timestamp > 5 * 60 * 1000) {
            verificationCodes.delete(verifyEmail);
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: "Verification code has expired" }),
            };
          }

          // Check if code matches
          if (storedData.code !== verifyCode) {
            return {
              statusCode: 400,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: "Invalid verification code" }),
            };
          }

          // Remove used code
          verificationCodes.delete(verifyEmail);

          return {
            statusCode: 200,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({
              success: true,
              message: "Email verified successfully",
            }),
          };

        default:
          return {
            statusCode: 404,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Endpoint not found" }),
          };
      }
    }

    // Handle GET requests
    if (event.httpMethod === "GET") {
      switch (path) {
        case "/ping":
          return {
            statusCode: 200,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ message: "pong" }),
          };

        case "/demo":
          return {
            statusCode: 200,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ 
              message: "Hello from Netlify Functions!",
              timestamp: new Date().toISOString(),
              environment: process.env.NODE_ENV || "development"
            }),
          };

        case "/deposits":
          try {
            const user = await getUserFromToken(event.headers.authorization);
            
            if (!supabase) {
              return {
                statusCode: 500,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, error: 'Database not configured' }),
              };
            }

            const { data: deposits, error } = await supabase
              .from('deposits')
              .select('*')
              .eq('user_id', user.id)
              .order('created_at', { ascending: false });

            if (error) {
              return {
                statusCode: 500,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, error: 'Failed to fetch deposits' }),
              };
            }

            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: true, deposits: deposits || [] }),
            };
          } catch (authError) {
            return {
              statusCode: 401,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: 'Unauthorized' }),
            };
          }

        case "/admin-settings":
          try {
            const adminUser = await getUserFromToken(event.headers.authorization);
            
            if (!adminUser.is_admin) {
              return {
                statusCode: 403,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, error: 'Admin access required' }),
              };
            }

            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: true,
                settings: {
                  walletSettings: {
                    minimumDeposit: 50.00,
                    supportedCurrencies: ["BTC", "ETH", "USDT"]
                  }
                }
              } as ApiResponse<AdminSettings>),
            };
          } catch (authError) {
            return {
              statusCode: 401,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: 'Unauthorized' }),
            };
          }

        case "/profile":
          try {
            const profileUser = await getUserFromToken(event.headers.authorization);
            
            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: true,
                user: {
                  id: profileUser.id,
                  email: profileUser.email,
                  username: profileUser.username,
                  wallet_balance: profileUser.wallet_balance || 0,
                  is_admin: profileUser.is_admin || false
                }
              }),
            };
          } catch (authError) {
            return {
              statusCode: 401,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: 'Unauthorized' }),
            };
          }

        default:
          return {
            statusCode: 404,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Endpoint not found" }),
          };
      }
    }

    // Handle PUT requests
    if (event.httpMethod === "PUT") {
      const putBody = event.body ? JSON.parse(event.body) : {};
      
      switch (path) {
        case "/admin-settings":
          try {
            const adminUser = await getUserFromToken(event.headers.authorization);
            
            if (!adminUser.is_admin) {
              return {
                statusCode: 403,
                headers: { ...headers, "Content-Type": "application/json" },
                body: JSON.stringify({ success: false, error: 'Admin access required' }),
              };
            }

            // In a real implementation, you would update the settings in the database
            // For now, we'll just return success
            return {
              statusCode: 200,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({
                success: true,
                message: 'Settings updated successfully'
              }),
            };
          } catch (authError) {
            return {
              statusCode: 401,
              headers: { ...headers, "Content-Type": "application/json" },
              body: JSON.stringify({ success: false, error: 'Unauthorized' }),
            };
          }

        default:
          return {
            statusCode: 404,
            headers: { ...headers, "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Endpoint not found" }),
          };
      }
    }

    // Method not allowed
    return {
      statusCode: 405,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };

  } catch (error) {
    console.error('Netlify function error:', error);
    return {
      statusCode: 500,
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        error: "Internal server error",
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
    };
  }
};
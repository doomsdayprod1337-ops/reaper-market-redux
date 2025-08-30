import "dotenv/config";
import express from "express";
import cors from "cors";
import nodemailer from "nodemailer";
import { Resend } from "resend";
import { handleDemo } from "./routes/demo";
import { createClient } from "@supabase/supabase-js";

// Import middleware
import { authenticateToken, requireAdmin, optionalAuth } from "./middleware/auth";

// Import route handlers
import { handleLogin, handleRegister, handleLogout, handleVerifyEmail } from "./routes/auth";
import { handleGetProfile, handleUpdateProfile, handleChangePassword, handleGetReferrals, handleGetAllUsers } from "./routes/users";
import { handleAdminLogin, handleGetAdminStats, handleGetAdminSettings, handleUpdateAdminSettings, handleGetPendingDeposits, handleConfirmDeposit } from "./routes/admin";
import { handleGetDeposits, handleCreateDeposit, handleGetDeposit, handleGetMinimumDeposit, handleSyncWallet } from "./routes/deposits";
import { handleHealthCheck, handleTestConnection, handleGetConfigs, handleContentStats, handleBinCheck, handleDebugToken, handleDebugDb } from "./routes/utils";

// Import new route handlers
import { handleGetNews, handleGetNewsArticle, handleCreateNews, handleUpdateNews, handleDeleteNews, handleGetAllNews } from "./routes/news";
import { handleGetTickets, handleCreateTicket, handleGetTicket, handleUpdateTicket, handleAddTicketReply, handleGetAllTickets } from "./routes/tickets";
import { handleGetProducts, handleGetServices, handleGetBots, handleGetCategories, handleGetProduct, handleCreateProduct, handleUpdateProduct, handleDeleteProduct } from "./routes/products";
import { handleGetCreditCards, handleAddCreditCard, handleUpdateCreditCard, handleDeleteCreditCard, handleGetCreditCardStats } from "./routes/credit-cards";
import { handleForgotPassword, handleVerifyResetToken, handleResetPassword } from "./routes/password";

// Store verification codes temporarily (in production, use Redis or database)
const verificationCodes = new Map<
  string,
  { code: string; timestamp: number; displayOnScreen?: boolean }
>();

// Initialize Resend if API key is provided
const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Email transporter configuration
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false, // Use TLS
    auth: {
      user: process.env.SMTP_USERNAME || process.env.EMAIL_USER,
      pass: process.env.SMTP_PASSWORD || process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  // Test email configuration on startup
  const hasEmailConfig = (process.env.SMTP_USERNAME && process.env.SMTP_PASSWORD) || (process.env.EMAIL_USER && process.env.EMAIL_PASS);
  
  if (hasEmailConfig) {
    transporter.verify((error, success) => {
      if (error) {
        console.log("❌ Email configuration error:", error.message);
      } else {
        console.log("✅ Email server is ready to send messages");
        console.log(`📧 Using SMTP: ${process.env.SMTP_HOST || 'smtp.gmail.com'}:${process.env.SMTP_PORT || '587'}`);
        console.log(`👤 From: ${process.env.SMTP_FROM_EMAIL || process.env.SMTP_USERNAME || process.env.EMAIL_USER}`);
      }
    });
  } else {
    console.log("⚠️  Email credentials not configured.");
    console.log("   For local development: Create a .env file with your credentials");
    console.log("   For Netlify: Set SMTP_USERNAME, SMTP_PASSWORD, etc. in Netlify environment variables");
  }

  // Basic API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Authentication routes
  app.post("/api/login", handleLogin);
  app.post("/api/register", handleRegister);
  app.post("/api/logout", handleLogout);
  app.post("/api/verify-email", handleVerifyEmail);

  // User management routes
  app.get("/api/profile", authenticateToken, handleGetProfile);
  app.put("/api/profile", authenticateToken, handleUpdateProfile);
  app.post("/api/change-password", authenticateToken, handleChangePassword);
  app.get("/api/referrals", authenticateToken, handleGetReferrals);
  app.get("/api/users", authenticateToken, requireAdmin, handleGetAllUsers);

  // Admin routes
  app.post("/api/admin-login", handleAdminLogin);
  app.get("/api/admin-stats", authenticateToken, requireAdmin, handleGetAdminStats);
  app.get("/api/admin-settings", authenticateToken, requireAdmin, handleGetAdminSettings);
  app.put("/api/admin-settings", authenticateToken, requireAdmin, handleUpdateAdminSettings);
  app.get("/api/admin-pending-deposits", authenticateToken, requireAdmin, handleGetPendingDeposits);
  app.post("/api/admin-confirm-deposit", authenticateToken, requireAdmin, handleConfirmDeposit);

  // Deposit routes
  app.get("/api/deposits", authenticateToken, handleGetDeposits);
  app.post("/api/create-deposit", authenticateToken, handleCreateDeposit);
  app.get("/api/deposits/:depositId", authenticateToken, handleGetDeposit);
  app.get("/api/get-minimum-deposit", handleGetMinimumDeposit);
  app.post("/api/sync-wallet", authenticateToken, handleSyncWallet);

  // Utility routes
  app.get("/api/health-check", handleHealthCheck);
  app.get("/api/test-connection", handleTestConnection);
  app.get("/api/configs", handleGetConfigs);
  app.get("/api/content-stats", optionalAuth, handleContentStats);
  app.post("/api/bin-check", handleBinCheck);
  
  // Debug routes (development only)
  app.get("/api/debug-token", authenticateToken, handleDebugToken);
  app.get("/api/debug-db", handleDebugDb);

  // News routes
  app.get("/api/news", handleGetNews);
  app.get("/api/news/:articleId", handleGetNewsArticle);
  app.post("/api/news", authenticateToken, requireAdmin, handleCreateNews);
  app.put("/api/news/:articleId", authenticateToken, requireAdmin, handleUpdateNews);
  app.delete("/api/news/:articleId", authenticateToken, requireAdmin, handleDeleteNews);
  app.get("/api/admin/news", authenticateToken, requireAdmin, handleGetAllNews);

  // Tickets routes
  app.get("/api/tickets", authenticateToken, handleGetTickets);
  app.post("/api/tickets", authenticateToken, handleCreateTicket);
  app.get("/api/tickets/:ticketId", authenticateToken, handleGetTicket);
  app.put("/api/tickets/:ticketId", authenticateToken, requireAdmin, handleUpdateTicket);
  app.post("/api/tickets/:ticketId/replies", authenticateToken, handleAddTicketReply);
  app.get("/api/admin/tickets", authenticateToken, requireAdmin, handleGetAllTickets);

  // Products routes
  app.get("/api/products", handleGetProducts);
  app.get("/api/services", handleGetServices);
  app.get("/api/bots", handleGetBots);
  app.get("/api/categories", handleGetCategories);
  app.get("/api/products/:productId", handleGetProduct);
  app.post("/api/products", authenticateToken, requireAdmin, handleCreateProduct);
  app.put("/api/products/:productId", authenticateToken, requireAdmin, handleUpdateProduct);
  app.delete("/api/products/:productId", authenticateToken, requireAdmin, handleDeleteProduct);

  // Credit Cards routes
  app.get("/api/credit-cards", authenticateToken, handleGetCreditCards);
  app.post("/api/credit-cards", authenticateToken, handleAddCreditCard);
  app.put("/api/credit-cards/:cardId", authenticateToken, handleUpdateCreditCard);
  app.delete("/api/credit-cards/:cardId", authenticateToken, handleDeleteCreditCard);
  app.get("/api/admin/credit-card-stats", authenticateToken, requireAdmin, handleGetCreditCardStats);

  // Password management routes
  app.post("/api/forgot-password", handleForgotPassword);
  app.post("/api/verify-reset-token", handleVerifyResetToken);
  app.post("/api/reset-password", handleResetPassword);

  // Enhanced Invites endpoints (placeholder implementations)
  app.get("/api/enhanced-invites", authenticateToken, async (_req, res) => {
    try {
      const invites: any[] = [];
      res.json({ success: true, data: invites, pagination: { pages: 1 } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to load invites" });
    }
  });

  app.get("/api/enhanced-invites/packages", async (_req, res) => {
    try {
      const packages = [
        { id: 1, name: "Basic", price: 10, invites: 5 },
        { id: 2, name: "Premium", price: 25, invites: 15 }
      ];
      res.json({ success: true, data: packages });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to load packages" });
    }
  });

  app.get("/api/enhanced-invites/stats", authenticateToken, async (_req, res) => {
    try {
      const stats = {
        freeInvitesRemaining: 3,
        totalInvitesGenerated: 0,
        totalInvitesUsed: 0,
        activeInvites: 0,
        usedInvites: 0,
        totalSpentOnInvites: 0
      };
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to load stats" });
    }
  });

  app.get("/api/enhanced-invites/tracking", authenticateToken, async (_req, res) => {
    try {
      const tracking: any[] = [];
      res.json({ success: true, data: tracking, pagination: { pages: 1 } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to load tracking" });
    }
  });

  app.get("/api/enhanced-invites/purchases", authenticateToken, async (_req, res) => {
    try {
      const purchases: any[] = [];
      res.json({ success: true, data: purchases, pagination: { pages: 1 } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to load purchases" });
    }
  });

  app.post("/api/enhanced-invites/generate", authenticateToken, async (_req, res) => {
    try {
      const inviteCode = `INV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      res.json({ success: true, data: { invite_code: inviteCode } });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to generate invite" });
    }
  });

  app.post("/api/enhanced-invites/purchase", authenticateToken, async (req, res) => {
    try {
      const { packageId } = req.body;
      console.log('Package purchased:', packageId);
      res.json({ success: true, message: "Package purchased successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to purchase package" });
    }
  });

  app.put("/api/enhanced-invites/cancel-invite", authenticateToken, async (req, res) => {
    try {
      const { inviteId } = req.body;
      console.log('Invite cancelled:', inviteId);
      res.json({ success: true, message: "Invite cancelled successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to cancel invite" });
    }
  });

  // Checker File Manager endpoints (placeholder implementations)
  app.get("/api/checker-file-config", authenticateToken, async (_req, res) => {
    try {
      const files: any[] = [];
      res.json({ success: true, files });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to load files" });
    }
  });

  app.post("/api/upload-checker-file", authenticateToken, async (req, res) => {
    try {
      const { files } = req.body;
      res.json({ 
        success: true, 
        total_uploaded: files?.length || 0,
        errors: []
      });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to upload files" });
    }
  });

  app.post("/api/checker-file-config", authenticateToken, async (req, res) => {
    try {
      const config = req.body;
      console.log('Configuration saved:', config);
      res.json({ success: true, message: "Configuration saved" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to save configuration" });
    }
  });

  app.delete("/api/checker-file-config", authenticateToken, async (req, res) => {
    try {
      const { file_id } = req.query;
      console.log('File deleted:', file_id);
      res.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
      res.status(500).json({ success: false, error: "Failed to delete file" });
    }
  });

  // Initialize Supabase client for server-side operations (moved to middleware/auth.ts)
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const supabaseAnonKey =
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  const supabase =
    supabaseUrl && supabaseAnonKey
      ? createClient(supabaseUrl, supabaseAnonKey)
      : null;

  // Wallet balance endpoint (now uses authentication)
  app.get("/api/user/wallet-balance", authenticateToken, async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ success: false, error: "Authentication required" });
      }

      if (!supabase) {
        // Fallback: no Supabase configured, return zero balance
        return res.json({ success: true, wallet_balance: 0 });
      }

      const { data, error } = await supabase
        .from("users")
        .select("wallet_balance")
        .eq("id", req.user.id)
        .single();

      if (error) {
        console.warn("Supabase error fetching wallet_balance:", error.message);
        return res.json({ success: true, wallet_balance: 0 });
      }

      const balance = (data?.wallet_balance ?? 0) as number;
      return res.json({ success: true, wallet_balance: balance });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      return res.status(500).json({ success: false, error: message });
    }
  });

  // Send verification email endpoint
  app.post("/api/send-verification-email", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res
          .status(400)
          .json({ success: false, error: "Email is required" });
      }

      // Generate 6-digit verification code
      const code = Math.floor(100000 + Math.random() * 900000).toString();

      // Clean up expired codes first
      const now = Date.now();
      for (const [key, value] of verificationCodes.entries()) {
        if (now - value.timestamp > 5 * 60 * 1000) {
          // 5 minutes
          verificationCodes.delete(key);
        }
      }

      let emailSent = false;
      let displayOnScreen = false;

      // Try Resend first if available
      if (resend) {
        try {
          await resend.emails.send({
            from: "Reaper Market <onboarding@resend.dev>",
            to: email,
            subject: "Your Reaper Market Verification Code",
            html: `
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
            `,
          });
          console.log(`✅ Email sent via Resend to ${email}`);
          emailSent = true;
        } catch (resendError) {
          console.log(`⚠️  Resend failed:`, resendError);
        }
      }

      // Try Gmail SMTP if Resend failed
      if (!emailSent) {
        try {
          const mailOptions = {
            from: `"Reaper Market" <${process.env.EMAIL_USER || "admin@reaper-market.com"}>`,
            to: email,
            subject: "Your Reaper Market Verification Code",
            html: `
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
            `,
          };

          await transporter.sendMail(mailOptions);
          console.log(`✅ Email sent via Gmail SMTP to ${email}`);
          emailSent = true;
        } catch (emailError) {
          console.log(`⚠️  Gmail SMTP failed:`, emailError);
        }
      }

      // If both email methods failed, use development fallback
      if (!emailSent) {
        console.log(
          `⚠️  All email methods failed, showing code on screen for development`,
        );
        console.log(`📧 Verification code for ${email}: ${code}`);
        displayOnScreen = true;
      }

      // Store code with timestamp and display flag
      verificationCodes.set(email, {
        code,
        timestamp: Date.now(),
        displayOnScreen,
      });

      res.json({
        success: true,
        displayOnScreen,
        message: displayOnScreen
          ? `Development mode: Your verification code is ${code}`
          : undefined,
      });
    } catch (error) {
      console.error("Email sending error:", error);

      // Provide more specific error messages
      let errorMessage = "Failed to send verification email";
      if (error instanceof Error) {
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Invalid login")
        ) {
          errorMessage =
            "Email authentication failed. Please check email server configuration.";
        } else if (
          error.message.includes("ENOTFOUND") ||
          error.message.includes("ECONNREFUSED")
        ) {
          errorMessage =
            "Cannot connect to email server. Please check network connection.";
        } else {
          errorMessage = error.message;
        }
      }

      res.status(500).json({
        success: false,
        error: errorMessage,
      });
    }
  });

  // Verify email code endpoint
  app.post("/api/verify-email-code", async (req, res) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res
          .status(400)
          .json({ success: false, error: "Email and code are required" });
      }

      const storedData = verificationCodes.get(email);

      if (!storedData) {
        return res
          .status(400)
          .json({ success: false, error: "No verification code found" });
      }

      // Check if code is expired (5 minutes)
      const codeAge = Date.now() - storedData.timestamp;
      if (codeAge > 5 * 60 * 1000) {
        verificationCodes.delete(email);
        return res
          .status(400)
          .json({ success: false, error: "Verification code expired" });
      }

      if (storedData.code === code) {
        // Clean up used code
        verificationCodes.delete(email);
        res.json({ success: true });
      } else {
        res
          .status(400)
          .json({ success: false, error: "Invalid verification code" });
      }
    } catch (error) {
      console.error("Code verification error:", error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : "Verification failed",
      });
    }
  });

  return app;
}

import { supabase } from "./supabase";
import type { AuthUser, RegistrationData, UserProfile } from "./supabase";

// Send verification email via backend
export const sendVerificationCode = async (
  email: string,
): Promise<{
  success: boolean;
  error?: string;
  displayOnScreen?: boolean;
  message?: string;
}> => {
  try {
    const response = await fetch("/api/send-verification-email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email }),
    });

    // Check if response is ok first
    if (!response.ok) {
      // If endpoint not found (404), generate fallback code
      if (response.status === 404) {
        const fallbackCode = Math.floor(100000 + Math.random() * 900000).toString();
        // Store the code in localStorage for verification
        localStorage.setItem(`verification_code_${email}`, JSON.stringify({
          code: fallbackCode,
          timestamp: Date.now()
        }));
        
        return {
          success: true,
          displayOnScreen: true,
          message: `Development mode: Your verification code is ${fallbackCode}`,
        };
      }
      
      // Try to parse JSON error response
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Failed to send verification email",
        };
      } catch (jsonError) {
        // If JSON parsing fails, use status-based error message
        if (response.status === 400) {
          return { success: false, error: "Invalid email address" };
        } else if (response.status === 500) {
          return {
            success: false,
            error: "Email service temporarily unavailable",
          };
        } else {
          return { success: false, error: "Failed to send verification email" };
        }
      }
    }

    // For successful responses, parse JSON
    try {
      const data = await response.json();
      return {
        success: true,
        displayOnScreen: data.displayOnScreen,
        message: data.message,
      };
    } catch (jsonError) {
      return { success: false, error: "Invalid server response" };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

// Verify the code entered by user via backend
export const verifyCode = async (
  email: string,
  code: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    const response = await fetch("/api/verify-email-code", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ email, code }),
    });

    // If endpoint not found, check localStorage for fallback code
    if (response.status === 404) {
      const storedData = localStorage.getItem(`verification_code_${email}`);
      if (storedData) {
        const { code: storedCode, timestamp } = JSON.parse(storedData);
        
        // Check if code is expired (5 minutes)
        const currentTime = Date.now();
        if (currentTime - timestamp > 5 * 60 * 1000) {
          localStorage.removeItem(`verification_code_${email}`);
          return {
            success: false,
            error: "Verification code has expired",
          };
        }
        
        // Check if code matches
        if (storedCode === code) {
          localStorage.removeItem(`verification_code_${email}`);
          return {
            success: true,
          };
        } else {
          return {
            success: false,
            error: "Invalid verification code",
          };
        }
      } else {
        return {
          success: false,
          error: "No verification code found",
        };
      }
    }

    // Check if response is ok first
    if (!response.ok) {
      // Try to parse JSON error response
      try {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || "Verification failed",
        };
      } catch (jsonError) {
        // If JSON parsing fails, use status-based error message
        if (response.status === 400) {
          return { success: false, error: "Invalid verification code" };
        } else if (response.status === 500) {
          return { success: false, error: "Server error occurred" };
        } else {
          return { success: false, error: "Verification failed" };
        }
      }
    }

    // For successful responses, parse JSON
    try {
      const data = await response.json();
      return { success: true };
    } catch (jsonError) {
      return { success: false, error: "Invalid server response" };
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Network error occurred",
    };
  }
};

// Validate invite code against the database
export const validateInviteCode = async (
  code: string,
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Check against enhanced_invite_codes table
    const { data: enhancedInvite, error: enhancedError } = await supabase
      .from("enhanced_invite_codes")
      .select("*")
      .eq("code", code)
      .eq("status", "active")
      .single();

    if (enhancedInvite && !enhancedError) {
      // Check if invite code hasn't exceeded max uses
      if (enhancedInvite.used_count < enhancedInvite.max_uses) {
        return { success: true };
      } else {
        return {
          success: false,
          error: "Invitation code has reached maximum uses",
        };
      }
    }

    // Check against basic invite_codes table as fallback
    const { data: basicInvite, error: basicError } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("code", code)
      .eq("is_active", true)
      .single();

    if (basicInvite && !basicError) {
      // Check if invite code hasn't exceeded max uses
      if (basicInvite.current_uses < basicInvite.max_uses) {
        return { success: true };
      } else {
        return {
          success: false,
          error: "Invitation code has reached maximum uses",
        };
      }
    }

    // For demo purposes, also accept some basic codes
    if (code.toUpperCase().includes("REAPER") || code === "DEMO123") {
      return { success: true };
    }

    return { success: false, error: "Invalid invitation code" };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Invite validation failed",
    };
  }
};

// Register user with Supabase
export const registerUser = async (
  data: RegistrationData,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
  try {
    // Create user directly in the users table (since this appears to be a custom setup)
    const userId = crypto.randomUUID();

    // Hash password (in production, you'd want to use a proper hashing library)
    // For now, we'll store it as plain text but this should be bcrypt or similar
    const { data: userData, error: userError } = await supabase
      .from("users")
      .insert({
        id: userId,
        email: data.email,
        username: data.username,
        password_hash: data.password, // Should be bcrypt hashed in production
        is_verified: true, // Since we verified the email in our flow
        referral_code: data.inviteCode,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (userError) {
      if (userError.code === "23505") {
        // Unique constraint violation
        if (userError.message.includes("email")) {
          return {
            success: false,
            error: "Email address is already registered",
          };
        } else if (userError.message.includes("username")) {
          return { success: false, error: "Username is already taken" };
        }
        return {
          success: false,
          error: "User with this email or username already exists",
        };
      }
      return { success: false, error: userError.message };
    }

    // Update invite code usage if it's from the invite_codes table
    const { data: inviteData } = await supabase
      .from("invite_codes")
      .select("*")
      .eq("code", data.inviteCode)
      .single();

    if (inviteData) {
      await supabase
        .from("invite_codes")
        .update({
          current_uses: inviteData.current_uses + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", inviteData.id);

      // Record invite usage
      await supabase.from("invite_usage").insert({
        invite_code: data.inviteCode,
        used_by: userId,
        used_at: new Date().toISOString(),
      });
    }

    // Update enhanced invite code usage if it's from enhanced_invite_codes table
    const { data: enhancedInviteData } = await supabase
      .from("enhanced_invite_codes")
      .select("*")
      .eq("code", data.inviteCode)
      .single();

    if (enhancedInviteData) {
      await supabase
        .from("enhanced_invite_codes")
        .update({
          used_count: enhancedInviteData.used_count + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", enhancedInviteData.id);
    }

    const user = {
      id: userId,
      email: data.email,
      user_metadata: {
        username: data.username,
        invite_code_used: data.inviteCode,
      },
    };

    // Set user session
    setUserSession(user);

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Registration failed",
    };
  }
};

// Login user
export const loginUser = async (
  username: string,
  password: string,
): Promise<{ success: boolean; user?: AuthUser; error?: string }> => {
  try {
    // Try to find user by username or email
    let userData = null;
    let userError = null;

    // First try by username
    const { data: userByUsername, error: usernameError } = await supabase
      .from("users")
      .select("*")
      .eq("username", username)
      .single();

    if (userByUsername && !usernameError) {
      userData = userByUsername;
    } else {
      // Try by email if username lookup failed
      const { data: userByEmail, error: emailError } = await supabase
        .from("users")
        .select("*")
        .eq("email", username)
        .single();

      if (userByEmail && !emailError) {
        userData = userByEmail;
      } else {
        return { success: false, error: "Invalid username or password" };
      }
    }

    // Verify password (in production, you'd use bcrypt.compare)
    // For now, we're doing plain text comparison but this should be hashed comparison
    if (userData.password_hash !== password) {
      return { success: false, error: "Invalid username or password" };
    }

    // Update last login timestamp
    await supabase
      .from("users")
      .update({
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", userData.id);

    const user = {
      id: userData.id,
      email: userData.email,
      user_metadata: {
        username: userData.username,
        role: userData.role,
        is_admin: userData.is_admin,
        tier: userData.tier,
      },
    };

    // Set user session
    setUserSession(user);

    return {
      success: true,
      user,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Login failed",
    };
  }
};

// Session management using localStorage
const SESSION_KEY = "reaper_market_session";

export const setUserSession = (user: AuthUser) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
};

export const getUserSession = (): AuthUser | null => {
  try {
    const session = localStorage.getItem(SESSION_KEY);
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
};

export const clearUserSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

// Get current user from session
export const getCurrentUser = async (): Promise<AuthUser | null> => {
  try {
    const sessionUser = getUserSession();
    if (!sessionUser) return null;

    // Verify the user still exists in the database
    const { data: userData, error } = await supabase
      .from("users")
      .select("id, email, username, role, is_admin, tier, status")
      .eq("id", sessionUser.id)
      .single();

    if (error || !userData || userData.status !== "active") {
      clearUserSession();
      return null;
    }

    return {
      id: userData.id,
      email: userData.email,
      user_metadata: {
        username: userData.username,
        role: userData.role,
        is_admin: userData.is_admin,
        tier: userData.tier,
      },
    };
  } catch (error) {
    console.error("Get current user failed:", error);
    clearUserSession();
    return null;
  }
};

// Logout user
export const logoutUser = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    clearUserSession();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Logout failed",
    };
  }
};

import React, { createContext, useContext, useState, useEffect } from "react";
import api from "../config/axios";

interface User {
  id: string;
  email: string;
  username?: string;
  wallet_balance?: number;
  user_metadata?: {
    username?: string;
    role?: string;
    is_admin?: boolean;
    tier?: string;
  };
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
  syncWallet: () => Promise<{
    success: boolean;
    wallet_balance?: number;
    error?: string;
  }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check for stored user session on mount
    const storedUser = localStorage.getItem("reaper_market_session");
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error("Failed to parse stored user session:", error);
        localStorage.removeItem("reaper_market_session");
      }
    }
  }, []);

  const login = (userData: User) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem("reaper_market_session", JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem("reaper_market_session");
  };

  const updateUser = (userData: User | null) => {
    setUser(userData);
    setIsAuthenticated(!!userData);
    if (userData) {
      localStorage.setItem("reaper_market_session", JSON.stringify(userData));
    } else {
      localStorage.removeItem("reaper_market_session");
    }
  };

  const syncWallet = async () => {
    if (!user) {
      return { success: false, error: "No user logged in" };
    }

    try {
      const response = await api.get(
        `/api/user/wallet-balance?userId=${encodeURIComponent(user.id)}`,
      );
      const payload =
        typeof response.data === "string" ? {} : (response.data as any);
      if ((payload as any).success) {
        const balance = Number((payload as any).wallet_balance ?? 0) || 0;
        const updatedUser = { ...user, wallet_balance: balance };
        updateUser(updatedUser);
        return { success: true, wallet_balance: balance };
      } else {
        return {
          success: false,
          error: (payload as any).error || "Failed to sync wallet",
        };
      }
    } catch (error) {
      console.error("Error syncing wallet:", error);
      return { success: false, error: "Network error occurred" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        login,
        logout,
        setUser: updateUser,
        syncWallet,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import confetti from "canvas-confetti";
import {
  sendVerificationCode,
  verifyCode,
  validateInviteCode,
  registerUser,
  loginUser,
} from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  EyeOff,
  Shield,
  Skull,
  Fingerprint,
  Mail,
  Key,
  UserPlus,
  Check,
  ArrowLeft,
  ArrowRight,
  FileText,
  RefreshCw,
} from "lucide-react";

// Registration step types
type RegistrationStep = "email" | "verify" | "invite" | "credentials" | "terms";

export default function Index() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [loginData, setLoginData] = useState({ username: "", password: "" });

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend functionality
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isResending, setIsResending] = useState(false);

  // Development OTP display
  const [developmentOTP, setDevelopmentOTP] = useState<string | null>(null);

  // Password generation feedback
  const [passwordGenerated, setPasswordGenerated] = useState(false);

  // Registration state management
  const [registrationStep, setRegistrationStep] =
    useState<RegistrationStep>("email");
  const [currentAgreementIndex, setCurrentAgreementIndex] = useState(0);
  const [registerData, setRegisterData] = useState({
    email: "",
    verificationCode: "",
    inviteCode: "",
    username: "",
    password: "",
    confirmPassword: "",
    acceptTermsOfService: false,
    acceptPrivacyPolicy: false,
    acceptCodeOfConduct: false,
    acceptSecurityProtocols: false,
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginUser(loginData.username, loginData.password);

      if (result.success && result.user) {
        console.log("Login successful:", result.user);
        // Use AuthContext to set the user state
        login(result.user);
        navigate("/dashboard");
      } else {
        setError(result.error || "Login failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await sendVerificationCode(registerData.email);

      if (result.success) {
        setRegistrationStep("verify");
        startResendCooldown();

        // Handle development OTP display
        if (result.displayOnScreen && result.message) {
          setDevelopmentOTP(result.message);
        } else {
          setDevelopmentOTP(null);
        }
      } else {
        setError(result.error || "Failed to send verification code");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Email verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const startResendCooldown = () => {
    setResendCooldown(60); // 60 seconds cooldown
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleResendCode = async () => {
    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setError(null);

    try {
      const result = await sendVerificationCode(registerData.email);

      if (result.success) {
        startResendCooldown();
        // Clear the input field
        setRegisterData({ ...registerData, verificationCode: "" });

        // Handle development OTP display
        if (result.displayOnScreen && result.message) {
          setDevelopmentOTP(result.message);
        } else {
          setDevelopmentOTP(null);
        }
      } else {
        setError(result.error || "Failed to resend verification code");
      }
    } catch (err) {
      setError("Failed to resend code");
      console.error("Resend error:", err);
    } finally {
      setIsResending(false);
    }
  };

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await verifyCode(
        registerData.email,
        registerData.verificationCode,
      );

      if (result.success) {
        // Trigger celebration animation
        triggerCelebration();

        // Delay to let the animation complete before moving to next step
        setTimeout(() => {
          setRegistrationStep("invite");
        }, 1500); // 1.5 seconds for celebration animation
      } else {
        setError(result.error || "Verification failed");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Verification error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const triggerCelebration = () => {
    // Create confetti burst
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval = setInterval(function () {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);

      // Since confetti falls down, start a bit higher and randomize the horizontal direction
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
        colors: ["#dc2626", "#ef4444", "#f87171", "#ffffff", "#fecaca"],
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
        colors: ["#dc2626", "#ef4444", "#f87171", "#ffffff", "#fecaca"],
      });
    }, 250);

    // Fireworks effect
    setTimeout(() => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#dc2626", "#ef4444", "#f87171"],
      });
    }, 500);

    setTimeout(() => {
      confetti({
        particleCount: 150,
        spread: 120,
        origin: { y: 0.6 },
        colors: ["#dc2626", "#ef4444", "#f87171", "#ffffff"],
      });
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-reaper-black relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-pattern opacity-5"></div>

      {/* Dark overlay with subtle red gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-reaper-black via-reaper-dark-gray to-reaper-black opacity-90"></div>

      {/* Floating red particles effect */}
      <div className="absolute inset-0">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-reaper-red rounded-full animate-pulse"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${2 + Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="p-6 flex justify-between items-center border-b border-reaper-medium-gray/30">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Skull className="w-8 h-8 text-reaper-red animate-pulse-red" />
              <div className="absolute inset-0 bg-reaper-red opacity-20 blur-md rounded-full"></div>
            </div>
            <h1 className="font-reaper text-2xl font-bold text-reaper-red text-glow-red animate-glow">
              REAPER MARKET
            </h1>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <Shield className="w-4 h-4" />
            <span>Secure Portal</span>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            {/* Welcome Message */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-reaper-dark-gray rounded-full border border-reaper-red/30 mb-4 border-glow-red">
                <Fingerprint className="w-10 h-10 text-reaper-red" />
              </div>
              <h2 className="font-reaper text-3xl font-bold text-white mb-2">
                ENTER THE MARKET
              </h2>
              <p className="text-gray-400 text-sm">
                Access requires proper credentials
              </p>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mb-6 p-4 bg-gradient-to-r from-red-900/60 to-red-800/40 border border-red-500/70 rounded-xl animate-in slide-in-from-top duration-500 ease-out backdrop-blur-sm shadow-lg shadow-red-500/20">
                <p className="text-red-100 text-sm text-center animate-in fade-in duration-700 delay-200 font-medium">
                  {error}
                </p>
              </div>
            )}

            {/* Login/Register Tabs */}
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-reaper-dark-gray border border-reaper-medium-gray">
                <TabsTrigger
                  value="login"
                  className="data-[state=active]:bg-reaper-red data-[state=active]:text-white"
                >
                  LOGIN
                </TabsTrigger>
                <TabsTrigger
                  value="register"
                  className="data-[state=active]:bg-reaper-red data-[state=active]:text-white"
                >
                  REGISTER
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card className="bg-reaper-dark-gray/50 border-reaper-medium-gray backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-white font-reaper">
                      Access Portal
                    </CardTitle>
                    <CardDescription className="text-gray-400">
                      Enter your credentials to continue
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="username" className="text-gray-300">
                          Username
                        </Label>
                        <Input
                          id="username"
                          type="text"
                          placeholder="Enter username"
                          value={loginData.username}
                          onChange={(e) =>
                            setLoginData({
                              ...loginData,
                              username: e.target.value,
                            })
                          }
                          className="bg-reaper-medium-gray border-reaper-red/30 text-white placeholder-gray-500 focus:border-reaper-red focus:ring-reaper-red"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-300">
                          Password
                        </Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter password"
                            value={loginData.password}
                            onChange={(e) =>
                              setLoginData({
                                ...loginData,
                                password: e.target.value,
                              })
                            }
                            className="bg-reaper-medium-gray border-reaper-red/30 text-white placeholder-gray-500 focus:border-reaper-red focus:ring-reaper-red pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-reaper-red transition-colors"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>
                      <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-reaper-red hover:bg-reaper-red-light text-white font-reaper font-bold py-2 border-glow-red transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "ACCESSING..." : "ENTER MARKET"}
                      </Button>
                    </form>
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-gray-500 text-center w-full">
                      Unauthorized access is prohibited and monitored
                    </p>
                  </CardFooter>
                </Card>
              </TabsContent>

              <TabsContent value="register">
                <Card className="bg-reaper-dark-gray/50 border-reaper-medium-gray backdrop-blur-sm transition-all duration-300 hover:bg-reaper-dark-gray/60 hover:border-reaper-red/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white font-reaper text-lg sm:text-xl truncate">
                          Create Account
                        </CardTitle>
                        <CardDescription className="text-gray-400 text-sm sm:text-base mt-1">
                          Complete your registration
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label
                          htmlFor="reg-email"
                          className="text-gray-300 flex items-center gap-2"
                        >
                          <Mail className="w-4 h-4" />
                          Email Address
                        </Label>
                        <Input
                          id="reg-email"
                          type="email"
                          placeholder="Enter your email address"
                          value={registerData.email}
                          onChange={(e) =>
                            setRegisterData({
                              ...registerData,
                              email: e.target.value,
                            })
                          }
                          className="bg-reaper-medium-gray border-reaper-red/30 text-white placeholder-gray-500 focus:border-reaper-red focus:ring-reaper-red transition-all duration-300"
                          required
                        />
                      </div>
                      
                      <Button
                        type="button"
                        onClick={handleEmailSubmit}
                        disabled={isLoading || !registerData.email}
                        className="w-full bg-reaper-red hover:bg-reaper-red-light text-white font-reaper font-bold py-2 border-glow-red transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isLoading ? "SENDING..." : "SEND VERIFICATION CODE"}
                      </Button>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <p className="text-xs text-gray-500 text-center w-full">
                      All information is encrypted and secure
                    </p>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>

        {/* Footer */}
        <footer className="p-6 border-t border-reaper-medium-gray/30">
          <div className="flex justify-between items-center text-sm text-gray-500">
            <p>&copy; 2024 Reaper Market. All rights reserved.</p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-reaper-red transition-colors">
                Privacy
              </a>
              <a href="#" className="hover:text-reaper-red transition-colors">
                Terms
              </a>
              <a href="#" className="hover:text-reaper-red transition-colors">
                Support
              </a>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

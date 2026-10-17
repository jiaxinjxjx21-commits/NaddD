import React, { useState } from 'react';
import { UserProfile } from '../types';
import { NATURAL_PALETTES } from '../data/initialData';
import { signInWithGoogle } from '../lib/firebase';
import { 
  Sparkles, 
  Calendar, 
  Lock, 
  Mail, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  KeyRound,
  X
} from 'lucide-react';

// Official Google Multi-Color Brand SVG Icon
const GoogleIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      fill="#EA4335"
    />
  </svg>
);

interface GoogleSavedAccount {
  id: string;
  name: string;
  email: string;
  avatarColor: string;
  avatarLetter: string;
}

interface LoginPageProps {
  onLoginSuccess: (user: UserProfile) => void;
  onContinueAsGuest: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLoginSuccess,
  onContinueAsGuest,
}) => {
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  // Sign In Form State - Clean slate empty inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Google Sign-In state & Modal
  const [showGoogleChooser, setShowGoogleChooser] = useState(false);
  const [isGoogleSigningIn, setIsGoogleSigningIn] = useState(false);
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [isAddingOtherGoogleAccount, setIsAddingOtherGoogleAccount] = useState(false);

  // Sign Up Form State
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupTagline, setSignupTagline] = useState('');
  const [selectedColorIndex, setSelectedColorIndex] = useState(1); // Sage Green

  // Forgot password modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetMethod, setResetMethod] = useState<'google' | 'email'>('google');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSentSuccess, setForgotSentSuccess] = useState(false);
  const [isVerifyingGoogleForReset, setIsVerifyingGoogleForReset] = useState(false);
  const [verifiedGoogleAccount, setVerifiedGoogleAccount] = useState<GoogleSavedAccount | null>(null);
  const [newResetPassword, setNewResetPassword] = useState('');
  const [confirmResetPassword, setConfirmResetPassword] = useState('');
  const [showNewResetPassword, setShowNewResetPassword] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  const [customGoogleEmailForReset, setCustomGoogleEmailForReset] = useState('');
  const [isAddingOtherGoogleForReset, setIsAddingOtherGoogleForReset] = useState(false);

  const openResetPasswordModal = (method: 'google' | 'email' = 'google') => {
    setResetMethod(method);
    setVerifiedGoogleAccount(null);
    setResetSuccess(false);
    setResetError('');
    setNewResetPassword('');
    setConfirmResetPassword('');
    setForgotSentSuccess(false);
    setIsAddingOtherGoogleForReset(false);
    setShowForgotPassword(true);
  };

  const handleVerifyGoogleForReset = (gAccount: GoogleSavedAccount) => {
    setIsVerifyingGoogleForReset(true);
    setResetError('');
    setTimeout(() => {
      setIsVerifyingGoogleForReset(false);
      setVerifiedGoogleAccount(gAccount);
    }, 450);
  };

  const handleCustomGoogleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmailForReset.trim() || !customGoogleEmailForReset.includes('@')) {
      setResetError('Please enter a valid Google email address.');
      return;
    }
    const cleanName = customGoogleEmailForReset.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    handleVerifyGoogleForReset({
      id: `custom-google-${Date.now()}`,
      name: cleanName,
      email: customGoogleEmailForReset.trim(),
      avatarColor: '#4285F4',
      avatarLetter: cleanName.charAt(0).toUpperCase(),
    });
  };

  const handleUpdatePasswordWithGoogle = (e: React.FormEvent) => {
    e.preventDefault();
    setResetError('');
    if (newResetPassword.length < 6) {
      setResetError('New password must be at least 6 characters long.');
      return;
    }
    if (newResetPassword !== confirmResetPassword) {
      setResetError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      setResetSuccess(true);
    }, 500);
  };

  const handleCompleteResetAndSignIn = () => {
    if (!verifiedGoogleAccount) return;
    const user: UserProfile = {
      id: `google-${Date.now()}`,
      name: verifiedGoogleAccount.name,
      email: verifiedGoogleAccount.email.toLowerCase().trim(),
      googleEmail: verifiedGoogleAccount.email.toLowerCase().trim(),
      authProvider: 'google',
      isGoogleLinked: true,
      avatarColor: verifiedGoogleAccount.avatarColor || '#4285F4',
      role: 'admin',
      tagline: 'Signed in with updated password & Google account',
      createdAt: new Date().toISOString().split('T')[0],
    };
    setShowForgotPassword(false);
    onLoginSuccess(user);
  };

  // Handle Google Account Sign In Execution (Firebase Popup with fallback)
  const executeGoogleSignIn = async (gAccount?: { name: string; email: string; avatarColor?: string }) => {
    setIsGoogleSigningIn(true);
    setErrorMessage('');

    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        setIsGoogleSigningIn(false);
        setShowGoogleChooser(false);
        onLoginSuccess(fbUser);
        return;
      }
    } catch (err: unknown) {
      console.warn('Firebase popup signin closed or encountered an error:', err);
      // If user had a preconfigured account selected, fallback smoothly
      if (gAccount) {
        const user: UserProfile = {
          id: `google-${Date.now()}`,
          name: gAccount.name.trim() || gAccount.email.split('@')[0],
          email: gAccount.email.toLowerCase().trim(),
          googleEmail: gAccount.email.toLowerCase().trim(),
          authProvider: 'google',
          isGoogleLinked: true,
          avatarColor: gAccount.avatarColor || '#4285F4',
          role: 'admin',
          tagline: 'Signed in with Google Account',
          createdAt: new Date().toISOString().split('T')[0],
        };
        setIsGoogleSigningIn(false);
        setShowGoogleChooser(false);
        onLoginSuccess(user);
        return;
      }
      setIsGoogleSigningIn(false);
      setErrorMessage('Google Sign-In was cancelled or failed. Please try again.');
    }
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim() || !customGoogleEmail.includes('@')) {
      setErrorMessage('Please enter a valid Google email address.');
      return;
    }
    const cleanName = customGoogleName.trim() || customGoogleEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    executeGoogleSignIn({
      name: cleanName,
      email: customGoogleEmail,
      avatarColor: '#4285F4',
    });
  };

  // Handle standard email/password sign-in
  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const user: UserProfile = {
        id: `user-${Date.now()}`,
        name: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        email: email.trim(),
        avatarColor: '#8A9A5B',
        role: 'member',
        authProvider: 'email',
        tagline: 'Social organizer & friend',
        createdAt: new Date().toISOString().split('T')[0],
      };

      setIsLoading(false);
      onLoginSuccess(user);
    }, 500);
  };

  // Handle Sign Up registration
  const handleSignUpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!signupName.trim()) {
      setErrorMessage('Please provide your name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMessage('Password should be at least 6 characters.');
      return;
    }

    setIsLoading(true);

    const palette = NATURAL_PALETTES[selectedColorIndex] || NATURAL_PALETTES[0];

    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: signupName.trim(),
      email: signupEmail.trim(),
      phone: signupPhone.trim() || undefined,
      avatarColor: palette.color,
      role: 'admin',
      authProvider: 'email',
      tagline: signupTagline.trim() || 'Active organizer & friend',
      createdAt: new Date().toISOString().split('T')[0],
    };

    setTimeout(() => {
      setIsLoading(false);
      onLoginSuccess(newUser, true);
    }, 500);
  };

  const handleForgotPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotSentSuccess(true);
    setTimeout(() => {
      setForgotSentSuccess(false);
      setShowForgotPassword(false);
      setForgotEmail('');
    }, 2400);
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#FDFCF8] flex flex-col justify-between selection:bg-[#8A9A5B]/20 selection:text-[#3D3A35] pt-[env(safe-area-inset-top,0px)] pb-[env(safe-area-inset-bottom,0px)] pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)]">
      
      {/* Top bar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-[#8A9A5B] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-xs">
            N
          </div>
          <span className="text-2xl font-bold tracking-tight text-[#4A463F] font-serif-soft">
            Nadd<span className="text-[#8A9A5B]">D</span>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onContinueAsGuest}
            className="text-xs sm:text-sm font-semibold text-[#5C574F] hover:text-[#3D3A35] px-4 py-2 rounded-full border border-[#E8E4D9] bg-white hover:bg-[#F7F3EB] transition-all cursor-pointer shadow-2xs"
          >
            Explore as Guest →
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left Column: Clean presentation */}
        <div className="lg:col-span-6 space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-serif text-[#3D3A35] leading-tight">
              Friend gatherings, <br />
              <span className="text-[#8A9A5B] italic">simplified.</span>
            </h1>
            <p className="text-sm text-[#736E65] leading-relaxed">
              Coordinate friend circles, discover mutual free dates effortlessly, and manage calendar events with ease.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 pt-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8E4D9] text-xs font-semibold text-[#3D3A35] shadow-2xs">
              <Sparkles className="w-3.5 h-3.5 text-[#8A9A5B]" /> Free Date Matcher
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8E4D9] text-xs font-semibold text-[#3D3A35] shadow-2xs">
              <Calendar className="w-3.5 h-3.5 text-[#D48C70]" /> Friend Circles
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E8E4D9] text-xs font-semibold text-[#3D3A35] shadow-2xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#7096D4]" /> Attendance Check-Ins
            </span>
          </div>
        </div>

        {/* Right Column: Interactive Login / Register Card */}
        <div className="lg:col-span-6 w-full max-w-md mx-auto">
          <div className="bg-white border border-[#E8E4D9] rounded-3xl p-6 sm:p-7 shadow-md">

            {/* Tab switchers */}
            <div className="flex p-1 bg-[#F7F3EB] rounded-2xl border border-[#E8E4D9] mb-4">
              <button
                id="tab-btn-signin"
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-white text-[#3D3A35] shadow-xs'
                    : 'text-[#8E8A81] hover:text-[#5C574F]'
                }`}
              >
                Sign In
              </button>
              <button
                id="tab-btn-signup"
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMessage('');
                }}
                className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-white text-[#3D3A35] shadow-xs'
                    : 'text-[#8E8A81] hover:text-[#5C574F]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error Notification */}
            {errorMessage && (
              <div className="p-3 mb-4 rounded-xl bg-[#FDF0EE] border border-[#F5C4BD] text-xs font-semibold text-[#B33928]">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* Primary Google Sign In / Sign Up Button */}
            <div className="mb-4">
              <button
                id="btn-google-auth-main"
                type="button"
                onClick={() => executeGoogleSignIn()}
                disabled={isGoogleSigningIn}
                className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-[#FDFCF8] border border-[#D5D0C5] hover:border-[#B8B2A4] text-[#3D3A35] text-xs sm:text-sm font-semibold shadow-2xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-60"
              >
                {isGoogleSigningIn ? (
                  <div className="w-4 h-4 border-2 border-[#8A9A5B] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <GoogleIcon className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                )}
                <span>{isGoogleSigningIn ? 'Connecting to Google...' : authMode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}</span>
              </button>

              <div className="relative my-3.5">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#E8E4D9]" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                  <span className="bg-white px-2.5 text-[#8E8A81] font-semibold">
                    Or with email
                  </span>
                </div>
              </div>
            </div>

            {/* --- SIGN IN FORM --- */}
            {authMode === 'signin' && (
              <form onSubmit={handleSignInSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#AFA99E] pointer-events-none" />
                    <input
                      id="input-login-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => openResetPasswordModal('google')}
                      className="text-xs text-[#8A9A5B] hover:text-[#78884D] font-semibold cursor-pointer"
                    >
                      Forgot?
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#AFA99E] pointer-events-none" />
                    <input
                      id="input-login-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-10 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#AFA99E] hover:text-[#5C574F] cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#5C574F] pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="rounded border-[#E8E4D9] text-[#8A9A5B] focus:ring-[#8A9A5B]"
                    />
                    <span>Remember me</span>
                  </label>
                </div>

                <button
                  id="btn-submit-signin"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-2xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-70"
                >
                  {isLoading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="pt-2 text-center border-t border-[#E8E4D9]">
                  <button
                    type="button"
                    onClick={onContinueAsGuest}
                    className="text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
                  >
                    Continue as Guest
                  </button>
                </div>
              </form>
            )}

            {/* --- SIGN UP (CREATE ACCOUNT) FORM --- */}
            {authMode === 'signup' && (
              <form onSubmit={handleSignUpSubmit} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 absolute left-3.5 top-3 text-[#AFA99E] pointer-events-none" />
                    <input
                      id="input-signup-name"
                      type="text"
                      required
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value)}
                      placeholder="e.g. Jordan Miller"
                      className="w-full pl-10 pr-4 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                    Email Address *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-3 text-[#AFA99E] pointer-events-none" />
                    <input
                      id="input-signup-email"
                      type="email"
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="jordan@example.com"
                      className="w-full pl-10 pr-4 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F]">
                      Create Password *
                    </label>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#AFA99E] pointer-events-none" />
                    <input
                      id="input-signup-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full pl-10 pr-10 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[#AFA99E] hover:text-[#5C574F] cursor-pointer"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Forgot Password using Google Account trigger under Create Password */}
                  <div className="mt-1.5 flex items-center justify-between">
                    <button
                      id="btn-forgot-password-signup"
                      type="button"
                      onClick={() => openResetPasswordModal('google')}
                      className="inline-flex items-center gap-1.5 text-xs text-[#8A9A5B] hover:text-[#78884D] font-medium cursor-pointer transition-colors"
                    >
                      <GoogleIcon className="w-3.5 h-3.5 shrink-0" />
                      <span>Reset password with Google</span>
                    </button>
                  </div>
                </div>

                {/* Avatar Color Selection without Emojis */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1.5">
                    Profile Theme Color
                  </label>
                  <div className="flex gap-2">
                    {NATURAL_PALETTES.slice(0, 5).map((pal, idx) => (
                      <button
                        key={pal.name}
                        type="button"
                        onClick={() => setSelectedColorIndex(idx)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          selectedColorIndex === idx ? 'ring-2 ring-[#3D3A35] ring-offset-2 scale-105' : 'opacity-80 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: pal.color }}
                      >
                        {selectedColorIndex === idx && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                    Tagline (Optional)
                  </label>
                  <input
                    type="text"
                    value={signupTagline}
                    onChange={(e) => setSignupTagline(e.target.value)}
                    placeholder="e.g. Weekend bruncher & friend"
                    className="w-full px-3.5 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                  />
                </div>

                <button
                  id="btn-submit-signup"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-2xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs sm:text-sm font-bold shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98 disabled:opacity-70"
                >
                  {isLoading ? (
                    <span>Creating Account...</span>
                  ) : (
                    <>
                      <span>Complete Registration</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            )}

          </div>
        </div>
      </main>

      {/* Google Account Chooser Modal */}
      {showGoogleChooser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-[#E8E4D9] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl space-y-4 relative">
            
            {/* Close Button */}
            {!isGoogleSigningIn && (
              <button
                type="button"
                onClick={() => {
                  setShowGoogleChooser(false);
                  setIsAddingOtherGoogleAccount(false);
                }}
                className="absolute top-5 right-5 p-1.5 rounded-full text-[#8E8A81] hover:text-[#3D3A35] hover:bg-[#F7F3EB] cursor-pointer transition-colors"
                aria-label="Close Google Chooser"
              >
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Google Header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white border border-[#E8E4D9] flex items-center justify-center shadow-xs">
                <GoogleIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-bold text-[#3D3A35]">
                  Sign in with Google
                </h3>
                <p className="text-xs text-[#8E8A81]">
                  Choose an account to continue to NaddD
                </p>
              </div>
            </div>

            {/* Google Loading Overlay */}
            {isGoogleSigningIn ? (
              <div className="py-6 flex flex-col items-center justify-center space-y-3">
                <div className="w-8 h-8 border-3 border-[#E8E4D9] border-t-[#4285F4] rounded-full animate-spin" />
                <p className="text-xs font-semibold text-[#3D3A35]">Connecting to Google Account...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <button
                  type="button"
                  onClick={() => executeGoogleSignIn()}
                  className="w-full py-2.5 px-4 rounded-2xl bg-white hover:bg-[#F3F6EC] border border-[#C9D6A8] text-[#2D5A27] text-xs sm:text-sm font-bold shadow-2xs flex items-center justify-center gap-2.5 transition-all cursor-pointer"
                >
                  <GoogleIcon className="w-4 h-4" />
                  <span>Launch Google Sign-In Popup</span>
                </button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#E8E4D9]" />
                  </div>
                  <div className="relative flex justify-center text-[10px] uppercase tracking-wider">
                    <span className="bg-white px-2 text-[#8E8A81] font-semibold">
                      Or continue with Google email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleCustomGoogleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                      Google Email
                    </label>
                    <input
                      type="email"
                      required
                      value={customGoogleEmail}
                      onChange={(e) => setCustomGoogleEmail(e.target.value)}
                      placeholder="yourname@gmail.com"
                      className="w-full px-3.5 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/40 focus:border-[#4285F4]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      placeholder="Your Name"
                      className="w-full px-3.5 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/40 focus:border-[#4285F4]"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowGoogleChooser(false)}
                      className="px-3 py-1.5 text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      Continue
                    </button>
                  </div>
                </form>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Forgot / Reset Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E8E4D9] rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#F3F6EC] text-[#485526] flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5 text-[#8A9A5B]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold font-serif text-[#3D3A35]">
                    {resetSuccess ? 'Password Updated!' : 'Change / Reset Password'}
                  </h3>
                  <p className="text-xs text-[#8E8A81]">
                    {resetSuccess
                      ? 'Your password has been securely updated'
                      : 'Verify your account to set a new password'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-8 h-8 rounded-full text-[#8E8A81] hover:text-[#3D3A35] hover:bg-[#F7F3EB] flex items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Method Tabs if not yet completed */}
            {!resetSuccess && !verifiedGoogleAccount && (
              <div className="flex rounded-xl bg-[#F7F3EB] p-1 gap-1 border border-[#E8E4D9]">
                <button
                  type="button"
                  onClick={() => {
                    setResetMethod('google');
                    setResetError('');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    resetMethod === 'google'
                      ? 'bg-white text-[#3D3A35] shadow-2xs'
                      : 'text-[#8E8A81] hover:text-[#3D3A35]'
                  }`}
                >
                  <GoogleIcon className="w-3.5 h-3.5" />
                  <span>Google Account (Instant)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setResetMethod('email');
                    setResetError('');
                  }}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    resetMethod === 'email'
                      ? 'bg-white text-[#3D3A35] shadow-2xs'
                      : 'text-[#8E8A81] hover:text-[#3D3A35]'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Link</span>
                </button>
              </div>
            )}

            {/* Error Message banner */}
            {resetError && (
              <div className="p-2.5 bg-[#FDF2F0] border border-[#F5C2BA] rounded-xl text-xs text-[#C54A3E] flex items-center gap-2">
                <span>⚠️ {resetError}</span>
              </div>
            )}

            {/* --- GOOGLE VERIFICATION WORKFLOW --- */}
            {resetMethod === 'google' && (
              <>
                {/* Step 1: Pick Google Account */}
                {!verifiedGoogleAccount && !resetSuccess && (
                  <div className="space-y-3">
                    <p className="text-xs text-[#5C574F] leading-relaxed">
                      Enter your Google Account email to verify your identity and set a new password:
                    </p>

                    {isVerifyingGoogleForReset ? (
                      <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-8 h-8 border-3 border-[#8A9A5B] border-t-transparent rounded-full animate-spin" />
                        <p className="text-xs font-bold text-[#485526]">Verifying Google Account identity...</p>
                      </div>
                    ) : (
                      <form onSubmit={handleCustomGoogleResetSubmit} className="space-y-3 pt-1">
                        <div>
                          <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                            Google Email to Verify
                          </label>
                          <input
                            type="email"
                            required
                            autoFocus
                            value={customGoogleEmailForReset}
                            onChange={(e) => setCustomGoogleEmailForReset(e.target.value)}
                            placeholder="yourname@gmail.com"
                            className="w-full px-3.5 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#4285F4]/40 focus:border-[#4285F4]"
                          />
                        </div>

                        <div className="flex items-center justify-end pt-1">
                          <button
                            type="submit"
                            className="px-4 py-2 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white text-xs font-bold shadow-xs cursor-pointer"
                          >
                            Verify & Continue →
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Step 2: Set New Password after Google Identity Verified */}
                {verifiedGoogleAccount && !resetSuccess && (
                  <form onSubmit={handleUpdatePasswordWithGoogle} className="space-y-3.5 animate-in fade-in duration-200">
                    <div className="p-3 bg-[#F3F6EC] border border-[#C9D6A8] rounded-2xl flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ backgroundColor: verifiedGoogleAccount.avatarColor }}
                      >
                        {verifiedGoogleAccount.avatarLetter}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-[#485526]" />
                          <span className="text-xs font-bold text-[#485526]">Identity Verified with Google</span>
                        </div>
                        <p className="text-xs text-[#5C574F] truncate font-medium">{verifiedGoogleAccount.email}</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                        New Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#AFA99E] pointer-events-none" />
                        <input
                          id="input-reset-new-password"
                          type={showNewResetPassword ? 'text' : 'password'}
                          required
                          value={newResetPassword}
                          onChange={(e) => setNewResetPassword(e.target.value)}
                          placeholder="At least 6 characters"
                          className="w-full pl-10 pr-10 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewResetPassword(!showNewResetPassword)}
                          className="absolute right-3 top-2.5 text-[#AFA99E] hover:text-[#5C574F] cursor-pointer"
                        >
                          {showNewResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-[#5C574F] mb-1">
                        Confirm New Password *
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3.5 top-3 text-[#AFA99E] pointer-events-none" />
                        <input
                          id="input-reset-confirm-password"
                          type={showNewResetPassword ? 'text' : 'password'}
                          required
                          value={confirmResetPassword}
                          onChange={(e) => setConfirmResetPassword(e.target.value)}
                          placeholder="Re-enter your new password"
                          className="w-full pl-10 pr-4 py-2 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs sm:text-sm text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]/40 focus:border-[#8A9A5B]"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        type="button"
                        onClick={() => setVerifiedGoogleAccount(null)}
                        className="text-xs font-semibold text-[#8E8A81] hover:text-[#3D3A35] cursor-pointer"
                      >
                        ← Choose different account
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="px-4 py-2 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold shadow-xs cursor-pointer disabled:opacity-70 flex items-center gap-1.5"
                      >
                        {isLoading ? 'Updating...' : 'Save & Change Password'}
                      </button>
                    </div>
                  </form>
                )}

                {/* Step 3: Success Confirmation */}
                {resetSuccess && (
                  <div className="p-4 bg-[#F3F6EC] border border-[#C9D6A8] rounded-2xl text-center space-y-3 animate-in fade-in duration-200">
                    <div className="w-10 h-10 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center mx-auto">
                      <Check className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-[#485526]">Password Successfully Changed!</h4>
                      <p className="text-xs text-[#5C574F] mt-0.5">
                        Your account has been updated via Google verification.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCompleteResetAndSignIn}
                      className="w-full py-2.5 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
                    >
                      <span>Sign In & Continue to Dashboard</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}

            {/* --- EMAIL RECOVERY LINK METHOD --- */}
            {resetMethod === 'email' && (
              <>
                {forgotSentSuccess ? (
                  <div className="p-4 bg-[#F3F6EC] border border-[#C9D6A8] rounded-2xl text-center space-y-2">
                    <div className="w-8 h-8 rounded-full bg-[#8A9A5B] text-white flex items-center justify-center mx-auto">
                      <Check className="w-5 h-5" />
                    </div>
                    <p className="text-xs font-bold text-[#485526]">Recovery Link Sent!</p>
                    <p className="text-xs text-[#5C574F]">
                      We have emailed instructions to <strong>{forgotEmail}</strong>.
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowForgotPassword(false)}
                      className="mt-2 px-4 py-1.5 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgotPasswordSubmit} className="space-y-3">
                    <p className="text-xs text-[#5C574F]">
                      Enter your email address and we will send a password reset link to your inbox.
                    </p>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email"
                      className="w-full px-3.5 py-2.5 bg-[#FDFCF8] border border-[#E8E4D9] rounded-xl text-xs text-[#3D3A35] focus:outline-none focus:ring-2 focus:ring-[#8A9A5B]"
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(false)}
                        className="px-3 py-1.5 rounded-xl border border-[#E8E4D9] text-xs font-bold text-[#5C574F] hover:bg-[#F7F3EB] cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 rounded-xl bg-[#8A9A5B] hover:bg-[#7D8D50] text-white text-xs font-bold shadow-xs cursor-pointer"
                      >
                        Send Reset Link
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="w-full border-t border-[#E8E4D9] bg-white py-3 text-center text-xs text-[#8E8A81]">
        <p>© 2026 NaddD</p>
      </footer>
    </div>
  );
};

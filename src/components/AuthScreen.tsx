import React, { useState, useRef, useEffect } from 'react';
import { LogIn, Sparkles, Phone, Mail, ArrowLeft, Loader2, Check, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { ConfirmationResult } from 'firebase/auth';
import Logo from './Logo';

type AuthMode = 'initial' | 'email-login' | 'email-register' | 'phone-login' | 'phone-verify' | 'forgot-password';

export default function AuthScreen() {
  const { loginWithGoogle, loginWithEmail, registerWithEmail, resetPassword, setupPhoneAuth } = useAuth();
  const [mode, setMode] = useState<AuthMode>('initial');
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [confirmResult, setConfirmResult] = useState<ConfirmationResult | null>(null);

  const phoneContainerId = 'recaptcha-container';

  const resetState = () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
  };

  const handleGoogleLogin = async () => {
    resetState();
    setIsLoading(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      console.error("Google Login Error:", err.code, err.message);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup terblokir oleh browser. Silakan izinkan popup untuk login.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('Domain ini belum didaftarkan di Firebase. Silakan tambahkan domain ini di Authorized Domains Firebase Console.');
      } else {
        setError(err.message || 'Gagal login dengan Google.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailAction = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    setIsLoading(true);

    try {
      if (mode === 'email-login') {
        await loginWithEmail(email, password);
      } else if (mode === 'email-register') {
        if (password !== confirmPassword) {
          setError('Password tidak cocok. Silakan periksa kembali.');
          setIsLoading(false);
          return;
        }
        await registerWithEmail(email, password, name);
      } else if (mode === 'forgot-password') {
        await resetPassword(email);
        setSuccessMessage('Email instruksi reset password telah dikirim. Silakan periksa kotak masuk Anda.');
        setIsLoading(false);
        return; // Don't proceed to auto-close or anything, show message
      }
    } catch (err: any) {
      console.error("Auth Error:", err.code, err.message);
      
      switch (err.code) {
        case 'auth/operation-not-allowed':
          setError('Fitur login ini belum diaktifkan di Firebase Console.');
          break;
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          setError('Email atau password salah. Silakan periksa kembali.');
          break;
        case 'auth/email-already-in-use':
          setError('Email ini sudah terdaftar. Silakan gunakan email lain atau masuk.');
          break;
        case 'auth/weak-password':
          setError('Password terlalu lemah. Minimal 6 karakter.');
          break;
        case 'auth/invalid-email':
          setError('Format email tidak valid.');
          break;
        case 'auth/too-many-requests':
          setError('Terlalu banyak percobaan login. Silakan coba lagi nanti atau reset password.');
          break;
        case 'auth/user-disabled':
          setError('Akun ini telah dinonaktifkan.');
          break;
        default:
          setError(err.message || 'Terjadi kesalahan. Silakan coba lagi.');
      }
      setIsLoading(false);
    }
  };

  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    setIsLoading(true);

    try {
      const result = await setupPhoneAuth(phone, phoneContainerId);
      setConfirmResult(result);
      setMode('phone-verify');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Fitur login Telepon belum diaktifkan di Firebase Console.');
      } else {
        setError(err.message || 'Gagal mengirim kode verifikasi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handlePhoneVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    resetState();
    setIsLoading(true);

    try {
      if (confirmResult) {
        await confirmResult.confirm(verificationCode);
      }
    } catch (err: any) {
      setError('Kode verifikasi salah.');
      setIsLoading(false);
    }
  };

  const renderBackBtn = () => (
    <button 
      onClick={() => { setMode('initial'); resetState(); }} 
      className="absolute top-0 left-0 p-2 text-muted hover:text-foreground transition-colors"
    >
      <ArrowLeft size={20} />
    </button>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-start md:justify-center p-6 pt-12 md:pt-6 relative overflow-y-auto transition-colors duration-300">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full" />
      <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/5 blur-[150px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card max-w-md w-full p-8 md:p-12 text-center relative z-10 overflow-hidden border-border bg-card/80 backdrop-blur-2xl shadow-2xl shadow-black/10"
      >
        <AnimatePresence mode="wait">
          {mode === 'initial' && (
            <motion.div
              key="initial"
              initial={{ x: -10, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 10, opacity: 0 }}
              className="space-y-6 md:space-y-8"
            >
              <Logo size={80} variant="dark" className="mx-auto mb-6 md:mb-10" />
              <div>
                <h1 className="text-4xl md:text-5xl font-black font-heading mb-3 tracking-tighter text-foreground decoration-primary flex items-center justify-center gap-2">
                  FLOWCE
                </h1>
                <p className="text-xs md:text-sm text-muted-foreground leading-relaxed max-w-[280px] mx-auto font-medium">
                  Track less. Flow more. Smart personal finance powered by AI.
                </p>
              </div>

              <div className="space-y-4 pt-4">
                {error && <p className="text-destructive text-xs font-bold text-center animate-shake">{error}</p>}
                <button 
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="w-full h-14 flex items-center justify-center gap-3 bg-foreground text-background py-4 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <LogIn size={20} />}
                  Masuk dengan Google
                </button>

                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => setMode('email-login')}
                    className="flex h-14 items-center justify-center gap-2 bg-secondary border border-border py-4 rounded-2xl font-bold text-sm hover:bg-muted transition-all text-foreground"
                  >
                    <Mail size={16} /> Email
                  </button>
                  <button 
                    onClick={() => setMode('phone-login')}
                    className="flex h-14 items-center justify-center gap-2 bg-secondary border border-border py-4 rounded-2xl font-bold text-sm hover:bg-muted transition-all text-foreground"
                  >
                    <Phone size={16} /> SMS
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {(mode === 'email-login' || mode === 'email-register') && (
            <motion.div
              key="email"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              {renderBackBtn()}
              <h2 className="text-2xl font-bold mb-6 text-foreground">
                {mode === 'email-login' ? 'Masuk' : 'Daftar Baru'}
              </h2>
              <form onSubmit={handleEmailAction} className="space-y-4 text-left">
                {mode === 'email-register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-muted ml-2">Nama Lengkap</label>
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
                    />
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-2">Email</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-2">Password</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 pr-12 text-foreground transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>

                {mode === 'email-register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-2">Konfirmasi Password</label>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
                    />
                  </div>
                )}

                {mode === 'email-login' && (
                  <div className="text-right">
                    <button 
                      type="button"
                      onClick={() => { setMode('forgot-password'); resetState(); }}
                      className="text-xs text-muted-foreground hover:text-primary font-bold transition-colors"
                    >
                      Lupa Password?
                    </button>
                  </div>
                )}

                {error && <p className="text-destructive text-xs font-bold text-center animate-shake">{error}</p>}
                <button 
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} />}
                  {mode === 'email-login' ? 'Masuk Sekarang' : 'Daftar Sekarang'}
                </button>
              </form>
              <button 
                onClick={() => setMode(mode === 'email-login' ? 'email-register' : 'email-login')}
                className="text-xs font-black text-muted-foreground hover:text-primary uppercase tracking-widest transition-all"
              >
                {mode === 'email-login' ? 'Belum punya akun? Daftar' : 'Sudah punya akun? Masuk'}
              </button>
            </motion.div>
          )}

          {mode === 'forgot-password' && (
            <motion.div
              key="forgot-password"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              {renderBackBtn()}
              <h2 className="text-2xl font-bold mb-6 text-foreground">Reset Password</h2>
              <p className="text-xs text-muted leading-relaxed">
                Masukkan email Anda untuk menerima instruksi pengaturan ulang password.
              </p>
              <form onSubmit={handleEmailAction} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-2">Email</label>
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
                  />
                </div>
                {error && <p className="text-destructive text-xs font-bold text-center animate-shake">{error}</p>}
                {successMessage && <p className="text-primary text-xs font-bold text-center">{successMessage}</p>}
                <button 
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Kirim Instruksi'}
                </button>
              </form>
            </motion.div>
          )}

          {mode === 'phone-login' && (
            <motion.div
              key="phone"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              {renderBackBtn()}
              <h2 className="text-2xl font-bold mb-6 text-foreground">Masuk via Telepon</h2>
              <p className="text-xs text-muted leading-relaxed">
                Masukkan nomor telepon kamu (dengan kode negara, contoh: +62812...) untuk menerima kode verifikasi.
              </p>
              <form onSubmit={handlePhoneSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-2">Nomor Telepon</label>
                  <input 
                    type="tel" 
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+62 812 3456 7890"
                    className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-all"
                  />
                </div>
                <div id={phoneContainerId}></div>
                {error && <p className="text-destructive text-xs font-bold text-center animate-shake">{error}</p>}
                <button 
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Kirim Kode OTP'}
                </button>
              </form>
            </motion.div>
          )}

          {mode === 'phone-verify' && (
            <motion.div
              key="verify"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -20, opacity: 0 }}
              className="space-y-6"
            >
              {renderBackBtn()}
              <h2 className="text-2xl font-bold mb-6 text-foreground">Verifikasi Kode</h2>
              <p className="text-xs text-muted leading-relaxed">
                Masukkan 6 digit kode yang dikirim ke {phone}.
              </p>
              <form onSubmit={handlePhoneVerify} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest ml-2">Kode OTP</label>
                  <input 
                    type="text" 
                    required
                    value={verificationCode}
                    onChange={e => setVerificationCode(e.target.value)}
                    placeholder="123456"
                    maxLength={6}
                    className="w-full bg-secondary border border-border rounded-2xl px-5 py-4 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/20 text-foreground transition-all font-bold"
                  />
                </div>
                {error && <p className="text-destructive text-xs font-bold text-center animate-shake">{error}</p>}
                <button 
                  disabled={isLoading}
                  className="w-full bg-primary text-primary-foreground py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={20} /> : 'Verifikasi Akun'}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

                <p className="mt-10 text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-black underline underline-offset-4 decoration-primary/20">Secure by Firebase</p>
      </motion.div>
    </div>
  );
}

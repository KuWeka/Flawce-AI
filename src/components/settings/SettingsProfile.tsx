import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { User, Camera, Mail, Save, Loader2, AlertTriangle, Sparkles, Lock } from 'lucide-react';
import { updateProfile, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { useAuth } from '../../lib/AuthContext';
import { cn } from '../../lib/utils';

interface SettingsProfileProps {
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}

export default function SettingsProfile({ onSuccess, onError }: SettingsProfileProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isGoogleProvider = user?.providerData.some(p => p.providerId === 'google.com');

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await updateProfile(user, { displayName, photoURL });
      onSuccess('Profil berhasil diperbarui!');
    } catch (error: any) {
      onError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => setPhotoURL(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || isSubmitting) return;
    if (newPassword !== confirmPassword) {
      onError('Konfirmasi password tidak cocok');
      return;
    }

    setIsSubmitting(true);
    try {
      const credential = EmailAuthProvider.credential(user.email!, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      onSuccess('Password berhasil diubah!');
      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      onError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-8"
    >
      <header>
        <h2 className="text-2xl font-bold text-foreground">Akun</h2>
        <p className="text-sm text-muted-foreground mt-1 font-medium">Atur profil dan preferensi dasar</p>
      </header>

      <div className="glass-card p-6 md:p-8 border-border/50 space-y-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="relative group">
            <div className="w-24 h-24 rounded-3xl overflow-hidden border-2 border-border group-hover:border-primary/50 transition-all shadow-xl">
              <img 
                src={photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            </div>
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute -bottom-2 -right-2 p-2 bg-primary text-primary-foreground rounded-xl shadow-lg hover:scale-110 active:scale-95 transition-all"
            >
              <Camera size={16} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handlePhotoUpload} accept="image/*" className="hidden" />
          </div>

          <div className="flex-1 space-y-4 w-full">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Email</label>
              <div className="flex items-center gap-3 px-4 py-3 bg-secondary/50 border border-border rounded-xl text-muted-foreground">
                <Mail size={16} />
                <span className="text-sm font-medium">{user?.email}</span>
                {isGoogleProvider && (
                  <div className="ml-auto flex items-center gap-1.5 px-2 py-0.5 bg-blue-500/10 text-blue-500 rounded-full ring-1 ring-blue-500/20">
                    <img src="https://www.google.com/favicon.ico" className="w-3 h-3 grayscale opacity-70" alt="Google" />
                    <span className="text-[8px] font-black uppercase">Google</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleProfileUpdate} className="space-y-6 pt-4 border-t border-border/50">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Tampilan</label>
            <input 
              type="text" 
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Masukkan nama lengkap kamu"
              className="w-full bg-secondary border border-border rounded-xl px-4 py-3.5 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 text-foreground text-sm font-bold transition-all"
            />
          </div>

          <button 
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <><Save size={18} /> Simpan Perubahan</>}
          </button>
        </form>
      </div>

      {!isGoogleProvider && (
        <div className="glass-card p-6 md:p-8 border-border/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-secondary border border-border rounded-xl">
                <Lock size={20} className="text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Ganti Password</h3>
                <p className="text-xs text-muted-foreground">Ubah password berkala untuk keamanan</p>
              </div>
            </div>
            <button 
              onClick={() => setIsPasswordModalOpen(true)}
              className="px-4 py-2 bg-secondary border border-border rounded-xl text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all"
            >
              Ubah
            </button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

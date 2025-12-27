import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Lock, Zap, TrendingUp, Shield } from 'lucide-react';

const LoginPage = () => {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Please enter your access code');
      return;
    }
    
    setIsLoading(true);
    try {
      const { role } = await login(code);
      toast.success('Access granted');
      navigate(role === 'owner' ? '/owner' : '/dashboard');
    } catch (error) {
      toast.error('Invalid access code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050505]">
      {/* Background Effects */}
      <div className="absolute inset-0 grid-bg opacity-30" />
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: 'url(https://images.unsplash.com/photo-1538170819641-15b741105cb3?w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#050505]/50 to-[#050505]" />
      
      {/* Floating Elements */}
      <div className="absolute top-20 left-20 w-64 h-64 bg-[#00FF94]/5 rounded-full blur-3xl animate-pulse-slow" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-[#FF0055]/5 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '1.5s' }} />
      
      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="glass border border-[#262626] p-8">
          {/* Logo & Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 mb-4 border border-[#00FF94] bg-[#00FF94]/10 glow-green">
              <Zap className="w-8 h-8 text-[#00FF94]" strokeWidth={1.5} />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tighter text-white mb-2">
              RICHGANG FX
            </h1>
            <p className="font-display text-sm text-[#00FF94] tracking-widest uppercase">
              Indice Killer
            </p>
          </div>
          
          {/* Features */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center p-3 border border-[#262626] bg-[#0A0A0A]/50">
              <TrendingUp className="w-5 h-5 text-[#00FF94] mx-auto mb-2" strokeWidth={1} />
              <span className="font-mono text-xs text-[#A3A3A3]">80-100%</span>
            </div>
            <div className="text-center p-3 border border-[#262626] bg-[#0A0A0A]/50">
              <Shield className="w-5 h-5 text-[#00F0FF] mx-auto mb-2" strokeWidth={1} />
              <span className="font-mono text-xs text-[#A3A3A3]">A+ ONLY</span>
            </div>
            <div className="text-center p-3 border border-[#262626] bg-[#0A0A0A]/50">
              <Lock className="w-5 h-5 text-[#FF0055] mx-auto mb-2" strokeWidth={1} />
              <span className="font-mono text-xs text-[#A3A3A3]">LOCKED</span>
            </div>
          </div>
          
          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-[#A3A3A3] uppercase tracking-widest mb-2">
                Access Code
              </label>
              <Input
                data-testid="access-code-input"
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Enter your access code"
                className="h-12 bg-[#0A0A0A] border-[#262626] text-white font-mono text-center tracking-widest placeholder:text-[#404040] focus:border-[#00FF94] focus:ring-1 focus:ring-[#00FF94] rounded-sm"
              />
            </div>
            
            <Button
              data-testid="login-button"
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#00FF94] text-black font-bold uppercase tracking-wide hover:bg-[#00CC76] rounded-sm transition-all shadow-[0_0_15px_rgba(0,255,148,0.3)] hover:shadow-[0_0_25px_rgba(0,255,148,0.5)] disabled:opacity-50"
            >
              {isLoading ? 'VERIFYING...' : 'ACCESS TERMINAL'}
            </Button>
          </form>
          
          {/* Footer */}
          <div className="mt-8 pt-6 border-t border-[#262626]">
            <p className="text-center text-xs text-[#525252]">
              US30 • US100 • GER30
            </p>
            <p className="text-center text-xs text-[#404040] mt-2">
              Pure Price Action • Liquidity • Structure
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

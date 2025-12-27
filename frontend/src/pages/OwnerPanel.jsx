import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  Zap, ArrowLeft, Plus, Copy, Trash2, Users, Signal,
  RefreshCw, Lock, Unlock, TrendingUp, TrendingDown
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const OwnerPanel = () => {
  const { user, logout, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const [accessCodes, setAccessCodes] = useState([]);
  const [newClientName, setNewClientName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [direction, setDirection] = useState({ current_direction: 'NEUTRAL' });
  const [selectedSymbol, setSelectedSymbol] = useState('US30');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const [codesRes, directionRes] = await Promise.all([
        axios.get(`${API}/access-codes`, headers),
        axios.get(`${API}/direction`, headers),
      ]);
      setAccessCodes(codesRes.data);
      setDirection(directionRes.data);
    } catch (error) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        logout();
        navigate('/login');
      }
    }
  }, [getAuthHeader, logout, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const createAccessCode = async () => {
    if (!newClientName.trim()) {
      toast.error('Please enter a client name');
      return;
    }

    setIsCreating(true);
    try {
      const response = await axios.post(
        `${API}/access-codes`,
        { name: newClientName },
        getAuthHeader()
      );
      setAccessCodes([response.data, ...accessCodes]);
      setNewClientName('');
      setDialogOpen(false);
      toast.success(`Access code created for ${response.data.name}`);
    } catch (error) {
      toast.error('Failed to create access code');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteAccessCode = async (codeId, codeName) => {
    try {
      await axios.delete(`${API}/access-codes/${codeId}`, getAuthHeader());
      setAccessCodes(accessCodes.filter((c) => c.id !== codeId));
      toast.success(`Access revoked for ${codeName}`);
    } catch (error) {
      toast.error('Failed to revoke access');
    }
  };

  const copyCode = async (code) => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      toast.success('Code copied to clipboard');
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  const resetDirection = async () => {
    try {
      await axios.post(`${API}/direction/reset`, {}, getAuthHeader());
      setDirection({ current_direction: 'NEUTRAL' });
      toast.success('Direction reset to NEUTRAL');
    } catch (error) {
      toast.error('Failed to reset direction');
    }
  };

  const generateSignal = async () => {
    setIsGenerating(true);
    try {
      const response = await axios.post(
        `${API}/signals/generate?symbol=${selectedSymbol}`,
        {},
        getAuthHeader()
      );
      if (response.data.message) {
        toast.info(response.data.message);
      } else {
        toast.success(`New ${response.data.direction} signal generated for ${selectedSymbol}`);
      }
      fetchData();
    } catch (error) {
      toast.error('Failed to generate signal');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[#262626]">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              data-testid="back-to-dashboard"
              onClick={() => navigate('/dashboard')}
              variant="ghost"
              size="sm"
              className="text-[#A3A3A3] hover:text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Dashboard
            </Button>
            <div className="h-6 w-px bg-[#262626]" />
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#00FF94]" strokeWidth={1.5} />
              <span className="font-display text-lg font-bold tracking-tighter">
                OWNER PANEL
              </span>
            </div>
          </div>

          <span className="text-sm text-[#00FF94] font-mono">
            {user?.name}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Client Access Codes */}
          <div className="border border-[#262626] bg-[#0A0A0A]/50">
            <div className="flex items-center justify-between p-4 border-b border-[#262626]">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00F0FF]" />
                <h2 className="font-display font-bold">Client Access Codes</h2>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    data-testid="create-code-btn"
                    size="sm"
                    className="bg-[#00FF94] text-black hover:bg-[#00CC76]"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Generate Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[#0A0A0A] border-[#262626]">
                  <DialogHeader>
                    <DialogTitle className="font-display">Generate Access Code</DialogTitle>
                    <DialogDescription className="text-[#A3A3A3]">
                      Create a new access code for a client
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div>
                      <label className="text-xs text-[#A3A3A3] uppercase tracking-widest">
                        Client Name
                      </label>
                      <Input
                        data-testid="client-name-input"
                        value={newClientName}
                        onChange={(e) => setNewClientName(e.target.value)}
                        placeholder="Enter client name"
                        className="mt-2 bg-[#050505] border-[#262626] focus:border-[#00FF94]"
                      />
                    </div>
                    <Button
                      data-testid="confirm-create-code"
                      onClick={createAccessCode}
                      disabled={isCreating}
                      className="w-full bg-[#00FF94] text-black hover:bg-[#00CC76]"
                    >
                      {isCreating ? 'Creating...' : 'Create Access Code'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <ScrollArea className="h-[400px]">
              <div className="p-4 space-y-3">
                {accessCodes.length === 0 ? (
                  <div className="text-center py-12 text-[#525252]">
                    <Users className="w-10 h-10 mx-auto mb-3 opacity-50" />
                    <p>No access codes created</p>
                    <p className="text-xs mt-1">Generate codes to give clients access</p>
                  </div>
                ) : (
                  accessCodes.filter((code) => code.is_active).map((code) => (
                    <div
                      key={code.id}
                      className="p-4 border border-[#262626] bg-[#050505] hover:border-[#404040] transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-white">{code.name}</span>
                        <Badge variant="outline" className="border-[#00FF94] text-[#00FF94]">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <code className="font-mono text-sm text-[#00F0FF] bg-[#00F0FF]/10 px-2 py-1">
                          {code.code}
                        </code>
                        <div className="flex items-center gap-2">
                          <Button
                            data-testid={`copy-code-${code.id}`}
                            size="icon"
                            variant="ghost"
                            onClick={() => copyCode(code.code)}
                            className="h-8 w-8 text-[#A3A3A3] hover:text-white"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          <Button
                            data-testid={`delete-code-${code.id}`}
                            size="icon"
                            variant="ghost"
                            onClick={() => deleteAccessCode(code.id, code.name)}
                            className="h-8 w-8 text-[#A3A3A3] hover:text-[#FF0055]"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {code.last_used && (
                        <p className="text-xs text-[#525252] mt-2">
                          Last used: {new Date(code.last_used).toLocaleString()}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Signal Control */}
          <div className="space-y-6">
            {/* Direction Control */}
            <div className="border border-[#262626] bg-[#0A0A0A]/50 p-6">
              <div className="flex items-center gap-2 mb-6">
                {direction.current_direction === 'NEUTRAL' ? (
                  <Unlock className="w-5 h-5 text-[#A3A3A3]" />
                ) : (
                  <Lock className="w-5 h-5 text-[#00FF94]" />
                )}
                <h2 className="font-display font-bold">Direction Lock</h2>
              </div>

              <div className="flex items-center justify-center gap-4 mb-6">
                <div
                  className={`flex-1 p-4 border text-center ${
                    direction.current_direction === 'BUY'
                      ? 'border-[#00FF94] bg-[#00FF94]/10 glow-green'
                      : 'border-[#262626]'
                  }`}
                >
                  <TrendingUp className={`w-8 h-8 mx-auto mb-2 ${
                    direction.current_direction === 'BUY' ? 'text-[#00FF94]' : 'text-[#525252]'
                  }`} />
                  <span className={`font-mono text-sm ${
                    direction.current_direction === 'BUY' ? 'text-[#00FF94]' : 'text-[#525252]'
                  }`}>
                    BUY
                  </span>
                </div>

                <div
                  className={`flex-1 p-4 border text-center ${
                    direction.current_direction === 'NEUTRAL'
                      ? 'border-[#A3A3A3] bg-[#A3A3A3]/10'
                      : 'border-[#262626]'
                  }`}
                >
                  <div className={`w-8 h-8 mx-auto mb-2 flex items-center justify-center ${
                    direction.current_direction === 'NEUTRAL' ? 'text-[#A3A3A3]' : 'text-[#525252]'
                  }`}>
                    —
                  </div>
                  <span className={`font-mono text-sm ${
                    direction.current_direction === 'NEUTRAL' ? 'text-[#A3A3A3]' : 'text-[#525252]'
                  }`}>
                    NEUTRAL
                  </span>
                </div>

                <div
                  className={`flex-1 p-4 border text-center ${
                    direction.current_direction === 'SELL'
                      ? 'border-[#FF0055] bg-[#FF0055]/10 glow-red'
                      : 'border-[#262626]'
                  }`}
                >
                  <TrendingDown className={`w-8 h-8 mx-auto mb-2 ${
                    direction.current_direction === 'SELL' ? 'text-[#FF0055]' : 'text-[#525252]'
                  }`} />
                  <span className={`font-mono text-sm ${
                    direction.current_direction === 'SELL' ? 'text-[#FF0055]' : 'text-[#525252]'
                  }`}>
                    SELL
                  </span>
                </div>
              </div>

              <Button
                data-testid="reset-direction-btn"
                onClick={resetDirection}
                variant="outline"
                className="w-full border-[#262626] hover:border-[#A3A3A3]"
                disabled={direction.current_direction === 'NEUTRAL'}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset to Neutral
              </Button>
            </div>

            {/* Manual Signal Generation */}
            <div className="border border-[#262626] bg-[#0A0A0A]/50 p-6">
              <div className="flex items-center gap-2 mb-6">
                <Signal className="w-5 h-5 text-[#00F0FF]" />
                <h2 className="font-display font-bold">Signal Generator</h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-[#A3A3A3] uppercase tracking-widest">
                    Symbol
                  </label>
                  <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
                    <SelectTrigger 
                      data-testid="symbol-select"
                      className="mt-2 bg-[#050505] border-[#262626]"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0A0A0A] border-[#262626]">
                      <SelectItem value="US30">US30</SelectItem>
                      <SelectItem value="US100">US100</SelectItem>
                      <SelectItem value="GER30">GER30</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  data-testid="generate-signal-btn"
                  onClick={generateSignal}
                  disabled={isGenerating}
                  className="w-full bg-[#00F0FF] text-black hover:bg-[#00C0CC]"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Signal className="w-4 h-4 mr-2" />
                      Generate Signal
                    </>
                  )}
                </Button>

                <p className="text-xs text-[#525252] text-center">
                  Signal will only generate if confidence ≥80% and session is active
                </p>
              </div>
            </div>

            {/* Info */}
            <div className="border border-[#262626] bg-[#0A0A0A]/50 p-6">
              <h3 className="text-xs text-[#A3A3A3] uppercase tracking-widest mb-4">
                Owner Access Info
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#A3A3A3]">Total Codes</span>
                  <span className="font-mono text-white">{accessCodes.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A3A3A3]">Active Codes</span>
                  <span className="font-mono text-[#00FF94]">
                    {accessCodes.filter((c) => c.is_active).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#A3A3A3]">Current Direction</span>
                  <span className={`font-mono ${
                    direction.current_direction === 'BUY' ? 'text-[#00FF94]' :
                    direction.current_direction === 'SELL' ? 'text-[#FF0055]' : 'text-[#A3A3A3]'
                  }`}>
                    {direction.current_direction}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default OwnerPanel;

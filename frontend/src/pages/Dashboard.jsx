import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  TrendingUp, TrendingDown, Clock, Lock, Unlock,
  Activity, Target, Shield, Zap, LogOut, Settings,
  ChevronUp, ChevronDown, AlertCircle, CheckCircle2, Moon
} from 'lucide-react';
import PriceChart from '@/components/PriceChart';
import SignalCard from '@/components/SignalCard';
import MarketCard from '@/components/MarketCard';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout, getAuthHeader } = useAuth();
  const navigate = useNavigate();
  const [marketData, setMarketData] = useState({});
  const [signals, setSignals] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [direction, setDirection] = useState({ current_direction: 'NEUTRAL' });
  const [sessions, setSessions] = useState({});
  const [selectedSymbol, setSelectedSymbol] = useState('US30');
  const [isLoading, setIsLoading] = useState(true);

  // Check if all markets are closed
  const allMarketsClosed = useMemo(() => {
    const symbols = Object.keys(marketData);
    if (symbols.length === 0) return false;
    return symbols.every(symbol => marketData[symbol]?.is_market_open === false);
  }, [marketData]);

  // Get market status message
  const getMarketStatusMessage = useMemo(() => {
    const firstMarket = Object.values(marketData)[0];
    if (!firstMarket) return '';
    switch (firstMarket.market_status) {
      case 'WEEKEND': return 'Markets are closed for the weekend';
      case 'PRE_MARKET': return 'Markets open soon - Pre-market hours';
      case 'AFTER_HOURS': return 'Markets closed - After hours';
      default: return 'Markets are currently closed';
    }
  }, [marketData]);

  const fetchData = useCallback(async () => {
    try {
      const headers = getAuthHeader();
      const [marketRes, signalsRes, pendingRes, directionRes, sessionsRes] = await Promise.all([
        axios.get(`${API}/market`, headers),
        axios.get(`${API}/signals`, headers),
        axios.get(`${API}/signals/pending`, headers),
        axios.get(`${API}/direction`, headers),
        axios.get(`${API}/sessions`, headers),
      ]);
      
      setMarketData(marketRes.data);
      setSignals(signalsRes.data);
      setPendingOrders(pendingRes.data);
      setDirection(directionRes.data);
      setSessions(sessionsRes.data);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        navigate('/login');
      }
    } finally {
      setIsLoading(false);
    }
  }, [getAuthHeader, logout, navigate]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out successfully');
  };

  const getDirectionColor = () => {
    switch (direction.current_direction) {
      case 'BUY': return 'text-[#00FF94] glow-green';
      case 'SELL': return 'text-[#FF0055] glow-red';
      default: return 'text-[#A3A3A3]';
    }
  };

  const getDirectionIcon = () => {
    switch (direction.current_direction) {
      case 'BUY': return <TrendingUp className="w-6 h-6" />;
      case 'SELL': return <TrendingDown className="w-6 h-6" />;
      default: return <Activity className="w-6 h-6" />;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 text-[#00FF94] mx-auto mb-4 animate-pulse" />
          <p className="font-mono text-[#A3A3A3]">Loading Terminal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] grid-bg">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-[#262626]">
        <div className="px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#00FF94]" strokeWidth={1.5} />
              <span className="font-display text-lg font-bold tracking-tighter hidden sm:inline">
                RICHGANG FX
              </span>
            </div>
            
            {/* Direction Lock Indicator */}
            <div 
              data-testid="direction-indicator"
              className={`flex items-center gap-2 px-4 py-2 border ${
                direction.current_direction !== 'NEUTRAL' 
                  ? 'border-[#404040] bg-[#0A0A0A]' 
                  : 'border-[#262626]'
              } ${getDirectionColor()}`}
            >
              {direction.current_direction !== 'NEUTRAL' ? (
                <Lock className="w-4 h-4" />
              ) : (
                <Unlock className="w-4 h-4" />
              )}
              <span className="font-mono text-sm font-bold">
                {direction.current_direction}
              </span>
              {getDirectionIcon()}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#A3A3A3] hidden md:inline">
              Welcome, <span className="text-white">{user?.name}</span>
            </span>
            {user && user.role === 'owner' ? (
              <Button
                data-testid="owner-panel-btn"
                onClick={() => navigate('/owner')}
                variant="outline"
                size="sm"
                className="border-[#262626] hover:border-[#00FF94] hover:text-[#00FF94]"
              >
                <Settings className="w-4 h-4 mr-2" />
                Owner
              </Button>
            ) : null}
            <Button
              data-testid="logout-btn"
              onClick={handleLogout}
              variant="outline"
              size="sm"
              className="border-[#262626] hover:border-[#FF0055] hover:text-[#FF0055]"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 md:p-6">
        {/* Market Closed Banner */}
        {allMarketsClosed && (
          <div className="mb-6 p-4 border border-[#FF0055]/30 bg-[#FF0055]/5 flex items-center gap-4">
            <div className="w-12 h-12 flex items-center justify-center border border-[#FF0055]/50 bg-[#FF0055]/10">
              <Moon className="w-6 h-6 text-[#FF0055]" />
            </div>
            <div>
              <h3 className="font-display font-bold text-[#FF0055]">MARKETS CLOSED</h3>
              <p className="text-sm text-[#A3A3A3]">{getMarketStatusMessage}</p>
              <p className="text-xs text-[#525252] mt-1">Signals will resume when markets reopen</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Left Column - Market Cards */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-xs text-[#A3A3A3] uppercase tracking-widest mb-3">
              Markets
            </h2>
            {['US30', 'US100', 'GER30'].map((symbol) => (
              <MarketCard
                key={symbol}
                symbol={symbol}
                data={marketData[symbol]}
                session={sessions[symbol]}
                isSelected={selectedSymbol === symbol}
                onClick={() => setSelectedSymbol(symbol)}
              />
            ))}
            
            {/* Session Status */}
            <div className="p-4 border border-[#262626] bg-[#0A0A0A]/50">
              <h3 className="text-xs text-[#A3A3A3] uppercase tracking-widest mb-3">
                Session Status
              </h3>
              {Object.entries(sessions).map(([symbol, info]) => (
                <div key={symbol} className="flex items-center justify-between py-2 border-b border-[#262626] last:border-0">
                  <span className="font-mono text-sm">{symbol}</span>
                  <div className="flex items-center gap-2">
                    {info.active ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#00FF94] animate-pulse" />
                        <span className="text-xs text-[#00FF94]">ACTIVE</span>
                      </>
                    ) : (
                      <>
                        <span className="w-2 h-2 rounded-full bg-[#525252]" />
                        <span className="text-xs text-[#525252]">IDLE</span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Center Column - Chart */}
          <div className="lg:col-span-2">
            <div className="border border-[#262626] bg-[#0A0A0A]/50 h-[400px] md:h-[500px]">
              <div className="flex items-center justify-between p-4 border-b border-[#262626]">
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold">{selectedSymbol}</span>
                  {marketData[selectedSymbol] && (
                    <span className={`font-mono text-lg ${
                      marketData[selectedSymbol].change >= 0 ? 'text-[#00FF94]' : 'text-[#FF0055]'
                    }`}>
                      {marketData[selectedSymbol].price?.toLocaleString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {['1M', '5M', '15M'].map((tf) => (
                    <button
                      key={tf}
                      className="px-3 py-1 text-xs font-mono text-[#A3A3A3] border border-[#262626] hover:border-[#404040] hover:text-white transition-colors"
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>
              <div className="h-[calc(100%-60px)] p-4">
                <PriceChart symbol={selectedSymbol} />
              </div>
            </div>
            
            {/* Active Signals */}
            <div className="mt-4 border border-[#262626] bg-[#0A0A0A]/50">
              <Tabs defaultValue="active" className="w-full">
                <div className="flex items-center justify-between p-4 border-b border-[#262626]">
                  <TabsList className="bg-transparent border border-[#262626]">
                    <TabsTrigger 
                      value="active" 
                      className="data-[state=active]:bg-[#00FF94] data-[state=active]:text-black"
                    >
                      Active Signals
                    </TabsTrigger>
                    <TabsTrigger 
                      value="pending"
                      className="data-[state=active]:bg-[#00F0FF] data-[state=active]:text-black"
                    >
                      Pending Orders
                    </TabsTrigger>
                  </TabsList>
                  <Badge variant="outline" className="border-[#262626] font-mono">
                    {signals.length} Active
                  </Badge>
                </div>
                
                <TabsContent value="active" className="m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-3">
                      {signals.length === 0 ? (
                        <div className="text-center py-12 text-[#525252]">
                          <AlertCircle className="w-10 h-10 mx-auto mb-3" />
                          <p>No active signals</p>
                          <p className="text-xs mt-1">Waiting for A+ setups...</p>
                        </div>
                      ) : (
                        signals.map((signal) => (
                          <SignalCard key={signal.id} signal={signal} />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="pending" className="m-0">
                  <ScrollArea className="h-[300px]">
                    <div className="p-4 space-y-3">
                      {pendingOrders.length === 0 ? (
                        <div className="text-center py-12 text-[#525252]">
                          <Clock className="w-10 h-10 mx-auto mb-3" />
                          <p>No pending orders</p>
                          <p className="text-xs mt-1">90%+ setups will appear here</p>
                        </div>
                      ) : (
                        pendingOrders.map((signal) => (
                          <SignalCard key={signal.id} signal={signal} isPending />
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
          
          {/* Right Column - Stats */}
          <div className="lg:col-span-1 space-y-4">
            {/* Confidence Meter */}
            <div className="p-4 border border-[#262626] bg-[#0A0A0A]/50">
              <h3 className="text-xs text-[#A3A3A3] uppercase tracking-widest mb-4">
                Engine Status
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A3A3A3]">Confidence Gate</span>
                  <span className="font-mono text-[#00FF94]">≥80%</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A3A3A3]">Trade Frequency</span>
                  <span className="font-mono text-[#00F0FF]">LOW</span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-[#A3A3A3]">Mode</span>
                  <span className="font-mono text-white">A+ ONLY</span>
                </div>
              </div>
            </div>
            
            {/* Analysis Components */}
            <div className="p-4 border border-[#262626] bg-[#0A0A0A]/50">
              <h3 className="text-xs text-[#A3A3A3] uppercase tracking-widest mb-4">
                Confidence Components
              </h3>
              
              <div className="space-y-3">
                {[
                  { name: 'HTF Structure', weight: 25, color: '#00FF94' },
                  { name: 'Liquidity Sweep', weight: 20, color: '#00FF94' },
                  { name: 'Displacement', weight: 20, color: '#00F0FF' },
                  { name: 'Pullback', weight: 15, color: '#00F0FF' },
                  { name: 'Session', weight: 10, color: '#A3A3A3' },
                  { name: 'No Counter', weight: 10, color: '#A3A3A3' },
                ].map((item) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[#A3A3A3]">{item.name}</span>
                      <span className="font-mono" style={{ color: item.color }}>
                        {item.weight}%
                      </span>
                    </div>
                    <div className="h-1 bg-[#262626] overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${item.weight * 4}%`,
                          backgroundColor: item.color 
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Rules */}
            <div className="p-4 border border-[#262626] bg-[#0A0A0A]/50">
              <h3 className="text-xs text-[#A3A3A3] uppercase tracking-widest mb-4">
                Engine Rules
              </h3>
              
              <div className="space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#00FF94] mt-0.5 flex-shrink-0" />
                  <span className="text-[#A3A3A3]">One direction lock at a time</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#00FF94] mt-0.5 flex-shrink-0" />
                  <span className="text-[#A3A3A3]">Signal suppression {">"} bad signal</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#00FF94] mt-0.5 flex-shrink-0" />
                  <span className="text-[#A3A3A3]">Continuation after TP2</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-3 h-3 text-[#00FF94] mt-0.5 flex-shrink-0" />
                  <span className="text-[#A3A3A3]">Session-only trading</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;

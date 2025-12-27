import React from 'react';
import { Badge } from '@/components/ui/badge';
import { 
  TrendingUp, TrendingDown, Target, Shield, 
  Clock, Zap, ChevronRight 
} from 'lucide-react';

const SignalCard = ({ signal, isPending = false }) => {
  const isBuy = signal.direction.includes('BUY');
  const isContinuation = signal.direction.includes('CONTINUATION');
  
  const getStatusBadge = () => {
    switch (signal.status) {
      case 'ACTIVE':
        return <Badge className="bg-[#00FF94]/20 text-[#00FF94] border-[#00FF94]">ACTIVE</Badge>;
      case 'TP1_HIT':
        return <Badge className="bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]">TP1 HIT</Badge>;
      case 'TP2_HIT':
        return <Badge className="bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]">TP2 HIT</Badge>;
      case 'PENDING':
        return <Badge className="bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]">PENDING</Badge>;
      default:
        return <Badge variant="outline">{signal.status}</Badge>;
    }
  };

  const getConfidenceColor = () => {
    if (signal.confidence >= 90) return 'text-[#00FF94] glow-green';
    if (signal.confidence >= 80) return 'text-[#00F0FF]';
    return 'text-[#A3A3A3]';
  };

  return (
    <div 
      data-testid={`signal-card-${signal.id}`}
      className={`
        relative p-4 border transition-all duration-300 hover:translate-x-1
        ${isPending 
          ? 'border-[#00F0FF] bg-[#00F0FF]/5 glow-cyan' 
          : isBuy 
            ? 'border-[#00FF94]/50 bg-[#00FF94]/5 hover:border-[#00FF94] hover:glow-green' 
            : 'border-[#FF0055]/50 bg-[#FF0055]/5 hover:border-[#FF0055] hover:glow-red'
        }
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`
            w-10 h-10 flex items-center justify-center border
            ${isBuy 
              ? 'border-[#00FF94] bg-[#00FF94]/10' 
              : 'border-[#FF0055] bg-[#FF0055]/10'
            }
          `}>
            {isBuy ? (
              <TrendingUp className="w-5 h-5 text-[#00FF94]" />
            ) : (
              <TrendingDown className="w-5 h-5 text-[#FF0055]" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-bold text-white">{signal.symbol}</span>
              {isContinuation && (
                <Badge variant="outline" className="text-xs border-[#00F0FF] text-[#00F0FF]">
                  CONT
                </Badge>
              )}
            </div>
            <span className={`font-mono text-sm ${isBuy ? 'text-[#00FF94]' : 'text-[#FF0055]'}`}>
              {signal.direction}
            </span>
          </div>
        </div>
        
        <div className="text-right">
          {getStatusBadge()}
          <div className={`font-mono text-2xl font-bold mt-1 ${getConfidenceColor()}`}>
            {signal.confidence}%
          </div>
        </div>
      </div>
      
      {/* Price Levels */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="p-3 bg-[#050505] border border-[#262626]">
          <div className="flex items-center gap-1 text-xs text-[#A3A3A3] mb-1">
            <ChevronRight className="w-3 h-3" />
            ENTRY
          </div>
          <span className="font-mono text-white">{signal.entry_price?.toLocaleString()}</span>
        </div>
        
        <div className="p-3 bg-[#050505] border border-[#FF0055]/30">
          <div className="flex items-center gap-1 text-xs text-[#FF0055] mb-1">
            <Shield className="w-3 h-3" />
            STOP LOSS
          </div>
          <span className="font-mono text-[#FF0055]">{signal.stop_loss?.toLocaleString()}</span>
        </div>
      </div>
      
      {/* Take Profit Levels */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'TP1', value: signal.tp1, desc: 'Internal' },
          { label: 'TP2', value: signal.tp2, desc: 'External' },
          { label: 'TP3', value: signal.tp3, desc: 'Major' },
        ].map((tp, idx) => (
          <div 
            key={tp.label}
            className={`p-2 text-center border ${
              signal.status === `TP${idx + 1}_HIT` 
                ? 'border-[#00FF94] bg-[#00FF94]/10' 
                : 'border-[#262626] bg-[#050505]'
            }`}
          >
            <div className="flex items-center justify-center gap-1 text-xs text-[#00FF94] mb-1">
              <Target className="w-3 h-3" />
              {tp.label}
            </div>
            <span className="font-mono text-xs text-white block">
              {tp.value?.toLocaleString()}
            </span>
            <span className="text-[8px] text-[#525252] uppercase tracking-widest">
              {tp.desc}
            </span>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-[#262626]">
        <div className="flex items-center gap-2 text-xs text-[#525252]">
          <Clock className="w-3 h-3" />
          {new Date(signal.created_at).toLocaleTimeString()}
        </div>
        
        {signal.confidence >= 90 && (
          <div className="flex items-center gap-1 text-xs text-[#00FF94]">
            <Zap className="w-3 h-3" />
            ELITE SETUP
          </div>
        )}
        
        {signal.session && (
          <span className="text-xs text-[#525252]">{signal.session}</span>
        )}
      </div>
    </div>
  );
};

export default SignalCard;

import React from 'react';
import { TrendingUp, TrendingDown, Clock, Moon } from 'lucide-react';

const MarketCard = ({ symbol, data, session, isSelected, onClick }) => {
  if (!data) {
    return (
      <div 
        onClick={onClick}
        className={`
          p-4 border cursor-pointer transition-all
          ${isSelected ? 'border-[#00FF94] bg-[#00FF94]/5' : 'border-[#262626] hover:border-[#404040]'}
        `}
      >
        <div className="animate-pulse">
          <div className="h-5 bg-[#262626] w-16 mb-2" />
          <div className="h-8 bg-[#262626] w-24" />
        </div>
      </div>
    );
  }

  const isPositive = data.change >= 0;
  const isMarketClosed = data.is_market_open === false;
  const marketStatus = data.market_status || 'OPEN';

  const getMarketStatusLabel = () => {
    switch (marketStatus) {
      case 'WEEKEND': return 'WEEKEND';
      case 'PRE_MARKET': return 'PRE-MARKET';
      case 'AFTER_HOURS': return 'AFTER HOURS';
      default: return 'CLOSED';
    }
  };

  return (
    <div 
      data-testid={`market-card-${symbol}`}
      onClick={onClick}
      className={`
        relative p-4 border cursor-pointer transition-all overflow-hidden group
        ${isMarketClosed 
          ? 'border-[#525252] bg-[#0A0A0A]/30 opacity-70' 
          : isSelected 
            ? `border-[#00FF94] bg-[#00FF94]/5 ${isPositive ? 'glow-green' : 'glow-red'}` 
            : 'border-[#262626] hover:border-[#404040] bg-[#0A0A0A]/50'
        }
      `}
    >
      {/* Market Closed Overlay */}
      {isMarketClosed && (
        <div className="absolute inset-0 bg-[#050505]/60 flex items-center justify-center z-10">
          <div className="text-center">
            <Moon className="w-6 h-6 text-[#525252] mx-auto mb-1" />
            <span className="font-mono text-xs text-[#525252] uppercase tracking-wider">
              {getMarketStatusLabel()}
            </span>
          </div>
        </div>
      )}
      
      {/* Background Glow */}
      {isSelected && !isMarketClosed && (
        <div 
          className={`absolute inset-0 opacity-10 ${
            isPositive ? 'bg-gradient-to-br from-[#00FF94] to-transparent' : 'bg-gradient-to-br from-[#FF0055] to-transparent'
          }`}
        />
      )}
      
      {/* Content */}
      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <span className="font-display font-bold text-white">{symbol}</span>
          <div className={`
            w-8 h-8 flex items-center justify-center
            ${isMarketClosed ? 'text-[#525252]' : isPositive ? 'text-[#00FF94]' : 'text-[#FF0055]'}
          `}>
            {isMarketClosed ? (
              <Clock className="w-5 h-5" />
            ) : isPositive ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
          </div>
        </div>
        
        {/* Price */}
        <div className="mb-2">
          <span className={`font-mono text-2xl font-bold ${
            isMarketClosed ? 'text-[#525252]' : isPositive ? 'text-[#00FF94]' : 'text-[#FF0055]'
          }`}>
            {data.price?.toLocaleString()}
          </span>
        </div>
        
        {/* Change */}
        <div className="flex items-center gap-3">
          <span className={`font-mono text-sm ${
            isMarketClosed ? 'text-[#525252]' : isPositive ? 'text-[#00FF94]' : 'text-[#FF0055]'
          }`}>
            {isPositive ? '+' : ''}{data.change?.toFixed(2)}
          </span>
          <span className={`font-mono text-sm px-2 py-0.5 ${
            isMarketClosed 
              ? 'bg-[#262626] text-[#525252]'
              : isPositive 
                ? 'bg-[#00FF94]/10 text-[#00FF94]' 
                : 'bg-[#FF0055]/10 text-[#FF0055]'
          }`}>
            {isPositive ? '+' : ''}{data.change_percent?.toFixed(2)}%
          </span>
        </div>
        
        {/* Session Indicator */}
        <div className="mt-3 pt-3 border-t border-[#262626]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[#525252]">
              {isMarketClosed ? getMarketStatusLabel() : session?.name || 'Session'}
            </span>
            <div className="flex items-center gap-1">
              {isMarketClosed ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF0055]" />
                  <span className="text-xs text-[#FF0055]">CLOSED</span>
                </>
              ) : session?.active ? (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00FF94] animate-pulse" />
                  <span className="text-xs text-[#00FF94]">LIVE</span>
                </>
              ) : (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#525252]" />
                  <span className="text-xs text-[#525252]">IDLE</span>
                </>
              )}
            </div>
          </div>
        </div>
        
        {/* High/Low - only show when market open */}
        {!isMarketClosed && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#525252]">H</span>
              <span className="font-mono text-[#00FF94]">{data.high?.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#525252]">L</span>
              <span className="font-mono text-[#FF0055]">{data.low?.toLocaleString()}</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Selection Indicator */}
      {isSelected && !isMarketClosed && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00FF94]" />
      )}
    </div>
  );
};

export default MarketCard;

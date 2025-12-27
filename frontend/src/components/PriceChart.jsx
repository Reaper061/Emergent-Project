import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '@/context/AuthContext';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="glass border border-[#262626] p-3">
        <p className="font-mono text-xs text-[#A3A3A3] mb-2">
          {new Date(data.time).toLocaleTimeString()}
        </p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <span className="text-[#A3A3A3]">Open</span>
          <span className="font-mono text-white">{data.open?.toLocaleString()}</span>
          <span className="text-[#A3A3A3]">High</span>
          <span className="font-mono text-[#00FF94]">{data.high?.toLocaleString()}</span>
          <span className="text-[#A3A3A3]">Low</span>
          <span className="font-mono text-[#FF0055]">{data.low?.toLocaleString()}</span>
          <span className="text-[#A3A3A3]">Close</span>
          <span className="font-mono text-white">{data.close?.toLocaleString()}</span>
        </div>
      </div>
    );
  }
  return null;
};

const PriceChart = ({ symbol }) => {
  const { getAuthHeader } = useAuth();
  const [data, setData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const response = await axios.get(`${API}/history/${symbol}`, getAuthHeader());
        setData(response.data);
      } catch (error) {
        console.error('Failed to fetch price history:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchHistory();
    const interval = setInterval(fetchHistory, 30000);
    return () => clearInterval(interval);
  }, [symbol, getAuthHeader]);

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-[#00FF94] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-[#525252]">Loading chart...</p>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-[#525252]">
        No data available
      </div>
    );
  }

  const minPrice = Math.min(...data.map((d) => d.low));
  const maxPrice = Math.max(...data.map((d) => d.high));
  const currentPrice = data[data.length - 1]?.close;
  const firstPrice = data[0]?.close;
  const isPositive = currentPrice >= firstPrice;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={data}
        margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
      >
        <defs>
          <linearGradient id="colorPositive" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#00FF94" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#00FF94" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="colorNegative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#FF0055" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#FF0055" stopOpacity={0} />
          </linearGradient>
        </defs>
        
        <XAxis
          dataKey="time"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#525252', fontSize: 10 }}
          tickFormatter={(value) => new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          interval="preserveStartEnd"
          minTickGap={50}
        />
        
        <YAxis
          domain={[minPrice * 0.999, maxPrice * 1.001]}
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#525252', fontSize: 10 }}
          tickFormatter={(value) => value.toLocaleString()}
          orientation="right"
          width={70}
        />
        
        <Tooltip content={<CustomTooltip />} />
        
        <ReferenceLine
          y={currentPrice}
          stroke={isPositive ? '#00FF94' : '#FF0055'}
          strokeDasharray="3 3"
          strokeOpacity={0.5}
        />
        
        <Area
          type="monotone"
          dataKey="close"
          stroke={isPositive ? '#00FF94' : '#FF0055'}
          strokeWidth={2}
          fillOpacity={1}
          fill={isPositive ? 'url(#colorPositive)' : 'url(#colorNegative)'}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default PriceChart;

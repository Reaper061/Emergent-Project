# Richgang FX Indice Killer - Product Requirements Document

## Overview
**App Name:** Richgang FX Indice Killer  
**Type:** Trading Signal Provider Application  
**Stack:** FastAPI (Python) + React + MongoDB  
**Created:** December 27, 2024

---

## Problem Statement
Build a high-precision signal provider app targeting 80-100% win rate through:
- LOW trade frequency (only A+ setups)
- Markets: US30, US100, GER30
- Pure price action + liquidity + structure analysis
- One direction lock at a time
- Continuation signals after TP2

---

## User Personas

### 1. Owner
- Master access code: `RICHGANG2024`
- Can generate unlimited client access codes
- Can manually trigger signal generation
- Can reset direction lock to neutral
- Full access to all dashboard features

### 2. Client (Trader)
- Receives unique access code from owner
- View-only access to signals dashboard
- Can see market data, active signals, pending orders
- Cannot generate signals or manage codes

---

## Core Requirements (Static)

### Signal Engine Rules
- **Confidence Gate:** Signals only at ≥80%
- **Elite Setup:** 90-100% confidence
- **Direction Lock:** One direction at a time (BUY or SELL)
- **Session Filter:** Signals only during active sessions
  - GER30: 09:00-10:30 SAST (Frankfurt)
  - US30/US100: NY Open window

### Confidence Scoring Components
| Component | Weight |
|-----------|--------|
| HTF Structure | 25% |
| Liquidity Sweep | 20% |
| Displacement | 20% |
| Pullback | 15% |
| Session | 10% |
| No Counter | 10% |

### Multi-TP Structure
- TP1: Internal reaction (nearest weak liquidity)
- TP2: External target (Asia/London High/Low)
- TP3: Major objective (Previous Day High/Low)

---

## What's Been Implemented ✅

### Backend (100% Complete)
- [x] JWT authentication with owner/client roles
- [x] Access code generation and management
- [x] Market data service with 8 provider fallback
- [x] Signal engine with confidence scoring
- [x] Direction state management (lock/unlock)
- [x] Session status tracking
- [x] Price history for charts
- [x] WebSocket support for real-time updates
- [x] MongoDB integration for persistence

### Frontend (100% Complete)
- [x] Login page with neon terminal aesthetic
- [x] Main dashboard with:
  - Market cards (US30, US100, GER30)
  - Price charts (Recharts with area fill)
  - Active signals section
  - Pending orders section (90%+ setups)
  - Direction lock indicator
  - Session status display
  - Engine status panel
  - Confidence components visualization
- [x] Owner panel with:
  - Client access code generator
  - Direction lock controls
  - Manual signal generator
  - Client management

### Design System
- [x] Dark terminal aesthetic (#050505 base)
- [x] Neon accent colors (Green: #00FF94, Red: #FF0055, Cyan: #00F0FF)
- [x] Custom fonts (Unbounded, Manrope, JetBrains Mono)
- [x] Glass morphism effects
- [x] Glow effects for active states
- [x] Grid background texture

---

## Prioritized Backlog

### P0 (MVP - Completed ✅)
- [x] Authentication system
- [x] Market data display
- [x] Signal display with TP levels
- [x] Owner code generation

### P1 (Next Phase)
- [ ] Real API integration (Alpha Vantage, Twelve Data)
- [ ] WebSocket real-time price streaming
- [ ] Push notifications for new signals
- [ ] Signal history/performance tracking

### P2 (Future)
- [ ] Telegram bot integration
- [ ] Email notifications via SendGrid
- [ ] Signal performance analytics
- [ ] Mobile responsive improvements
- [ ] Advanced chart indicators

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/login | Login with access code |
| POST | /api/auth/verify | Verify JWT token |
| GET | /api/access-codes | Get all codes (owner) |
| POST | /api/access-codes | Create code (owner) |
| DELETE | /api/access-codes/{id} | Revoke code (owner) |
| GET | /api/market | Get all market data |
| GET | /api/market/{symbol} | Get symbol data |
| GET | /api/signals | Get active signals |
| GET | /api/signals/pending | Get pending orders |
| POST | /api/signals/generate | Generate signal (owner) |
| GET | /api/direction | Get direction state |
| POST | /api/direction/reset | Reset direction (owner) |
| GET | /api/sessions | Get session status |
| GET | /api/history/{symbol} | Get price history |

---

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
JWT_SECRET=richgang-fx-indice-killer-secret-2024
OWNER_MASTER_CODE=RICHGANG2024
```

### Optional API Keys
```
ALPHA_VANTAGE_KEY=
TWELVE_DATA_KEY=
FINNHUB_KEY=
```

---

## Next Action Items
1. Add real market data API keys for live prices
2. Implement WebSocket streaming for real-time updates
3. Add signal performance tracking dashboard
4. Consider Telegram bot for mobile alerts

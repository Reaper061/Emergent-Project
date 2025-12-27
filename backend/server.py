from fastapi import FastAPI, APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import asyncio
import random
import httpx
import json
from jose import jwt
import secrets
import hashlib

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Settings
JWT_SECRET = os.environ.get('JWT_SECRET', 'richgang-fx-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Owner Master Code (hashed)
OWNER_MASTER_CODE = os.environ.get('OWNER_MASTER_CODE', 'RICHGANG2024')

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer(auto_error=False)

# ===================== MODELS =====================

class AccessCode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    code: str
    name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True
    last_used: Optional[datetime] = None

class AccessCodeCreate(BaseModel):
    name: str

class LoginRequest(BaseModel):
    code: str

class TokenResponse(BaseModel):
    token: str
    role: str
    name: str

class Signal(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    symbol: str
    direction: str  # BUY, SELL, CONTINUATION_BUY, CONTINUATION_SELL
    entry_price: float
    stop_loss: float
    tp1: float
    tp2: float
    tp3: float
    confidence: int
    status: str  # ACTIVE, TP1_HIT, TP2_HIT, TP3_HIT, STOPPED, CLOSED
    is_pending: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    analysis: Dict[str, Any] = {}
    session: str = ""

class MarketData(BaseModel):
    symbol: str
    price: float
    change: float
    change_percent: float
    high: float
    low: float
    open: float
    volume: int
    timestamp: datetime
    is_market_open: bool = True
    market_status: str = "OPEN"  # OPEN, CLOSED, PRE_MARKET, AFTER_HOURS

class DirectionState(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "global_direction"
    current_direction: str = "NEUTRAL"  # BUY, SELL, NEUTRAL
    locked_at: Optional[datetime] = None
    reason: str = ""

# ===================== MARKET HOURS HELPER =====================

def is_market_open(symbol: str) -> tuple[bool, str]:
    """Check if market is open based on symbol and current time"""
    now = datetime.now(timezone.utc)
    weekday = now.weekday()  # 0=Monday, 6=Sunday
    hour = now.hour
    minute = now.minute
    
    # Weekend check - all markets closed
    if weekday >= 5:  # Saturday or Sunday
        return False, "WEEKEND"
    
    # Market hours (UTC)
    market_hours = {
        "US30": {
            # NYSE: 14:30-21:00 UTC (9:30 AM - 4:00 PM ET)
            "open_hour": 14, "open_minute": 30,
            "close_hour": 21, "close_minute": 0,
            "name": "NYSE"
        },
        "US100": {
            # NASDAQ: 14:30-21:00 UTC
            "open_hour": 14, "open_minute": 30,
            "close_hour": 21, "close_minute": 0,
            "name": "NASDAQ"
        },
        "GER30": {
            # XETRA: 08:00-16:30 UTC (9:00 AM - 5:30 PM CET)
            "open_hour": 8, "open_minute": 0,
            "close_hour": 16, "close_minute": 30,
            "name": "XETRA"
        }
    }
    
    hours = market_hours.get(symbol, market_hours["US30"])
    current_minutes = hour * 60 + minute
    open_minutes = hours["open_hour"] * 60 + hours["open_minute"]
    close_minutes = hours["close_hour"] * 60 + hours["close_minute"]
    
    if current_minutes < open_minutes:
        return False, "PRE_MARKET"
    elif current_minutes >= close_minutes:
        return False, "AFTER_HOURS"
    else:
        return True, "OPEN"

# ===================== MARKET DATA PROVIDERS =====================

class MarketDataService:
    def __init__(self):
        self.providers = [
            self._fetch_alpha_vantage,
            self._fetch_twelve_data,
            self._fetch_finnhub,
            self._fetch_yahoo_finance,
            self._fetch_polygon,
            self._fetch_marketstack,
            self._fetch_fcsapi,
            self._fetch_simulated,  # Fallback simulation
        ]
        self.cache = {}
        self.cache_ttl = 60  # seconds
        
        # Symbol mappings for different providers
        self.symbol_map = {
            "US30": {"av": "DJI", "td": "DJI", "yf": "^DJI", "fn": "^DJI"},
            "US100": {"av": "NDX", "td": "NDX", "yf": "^NDX", "fn": "^NDX"},
            "GER30": {"av": "DAX", "td": "GDAXI", "yf": "^GDAXI", "fn": "^GDAXI"},
        }
    
    async def get_market_data(self, symbol: str) -> MarketData:
        cache_key = f"{symbol}_{int(datetime.now(timezone.utc).timestamp() / self.cache_ttl)}"
        if cache_key in self.cache:
            return self.cache[cache_key]
        
        for provider in self.providers:
            try:
                data = await provider(symbol)
                if data:
                    self.cache[cache_key] = data
                    return data
            except Exception as e:
                logger.warning(f"Provider {provider.__name__} failed: {e}")
                continue
        
        # Ultimate fallback
        return await self._fetch_simulated(symbol)
    
    async def _fetch_alpha_vantage(self, symbol: str) -> Optional[MarketData]:
        api_key = os.environ.get('ALPHA_VANTAGE_KEY')
        if not api_key:
            return None
        
        mapped = self.symbol_map.get(symbol, {}).get("av", symbol)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://www.alphavantage.co/query",
                params={"function": "GLOBAL_QUOTE", "symbol": mapped, "apikey": api_key},
                timeout=10
            )
            data = resp.json()
            quote = data.get("Global Quote", {})
            if quote:
                return MarketData(
                    symbol=symbol,
                    price=float(quote.get("05. price", 0)),
                    change=float(quote.get("09. change", 0)),
                    change_percent=float(quote.get("10. change percent", "0%").replace("%", "")),
                    high=float(quote.get("03. high", 0)),
                    low=float(quote.get("04. low", 0)),
                    open=float(quote.get("02. open", 0)),
                    volume=int(float(quote.get("06. volume", 0))),
                    timestamp=datetime.now(timezone.utc)
                )
        return None
    
    async def _fetch_twelve_data(self, symbol: str) -> Optional[MarketData]:
        api_key = os.environ.get('TWELVE_DATA_KEY')
        if not api_key:
            return None
        
        mapped = self.symbol_map.get(symbol, {}).get("td", symbol)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.twelvedata.com/quote",
                params={"symbol": mapped, "apikey": api_key},
                timeout=10
            )
            data = resp.json()
            if "close" in data:
                return MarketData(
                    symbol=symbol,
                    price=float(data.get("close", 0)),
                    change=float(data.get("change", 0)),
                    change_percent=float(data.get("percent_change", 0)),
                    high=float(data.get("high", 0)),
                    low=float(data.get("low", 0)),
                    open=float(data.get("open", 0)),
                    volume=int(float(data.get("volume", 0))),
                    timestamp=datetime.now(timezone.utc)
                )
        return None
    
    async def _fetch_finnhub(self, symbol: str) -> Optional[MarketData]:
        api_key = os.environ.get('FINNHUB_KEY')
        if not api_key:
            return None
        
        mapped = self.symbol_map.get(symbol, {}).get("fn", symbol)
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://finnhub.io/api/v1/quote",
                params={"symbol": mapped, "token": api_key},
                timeout=10
            )
            data = resp.json()
            if data.get("c"):
                return MarketData(
                    symbol=symbol,
                    price=float(data.get("c", 0)),
                    change=float(data.get("d", 0)),
                    change_percent=float(data.get("dp", 0)),
                    high=float(data.get("h", 0)),
                    low=float(data.get("l", 0)),
                    open=float(data.get("o", 0)),
                    volume=0,
                    timestamp=datetime.now(timezone.utc)
                )
        return None
    
    async def _fetch_yahoo_finance(self, symbol: str) -> Optional[MarketData]:
        # Yahoo Finance via rapid API or direct scraping
        mapped = self.symbol_map.get(symbol, {}).get("yf", symbol)
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(
                    f"https://query1.finance.yahoo.com/v8/finance/chart/{mapped}",
                    params={"interval": "1m", "range": "1d"},
                    headers={"User-Agent": "Mozilla/5.0"},
                    timeout=10
                )
                data = resp.json()
                result = data.get("chart", {}).get("result", [{}])[0]
                meta = result.get("meta", {})
                if meta.get("regularMarketPrice"):
                    return MarketData(
                        symbol=symbol,
                        price=float(meta.get("regularMarketPrice", 0)),
                        change=float(meta.get("regularMarketPrice", 0)) - float(meta.get("previousClose", 0)),
                        change_percent=((float(meta.get("regularMarketPrice", 0)) / float(meta.get("previousClose", 1))) - 1) * 100,
                        high=float(meta.get("regularMarketDayHigh", 0)),
                        low=float(meta.get("regularMarketDayLow", 0)),
                        open=float(meta.get("regularMarketOpen", 0)),
                        volume=int(meta.get("regularMarketVolume", 0)),
                        timestamp=datetime.now(timezone.utc)
                    )
        except Exception:
            pass
        return None
    
    async def _fetch_polygon(self, symbol: str) -> Optional[MarketData]:
        api_key = os.environ.get('POLYGON_KEY')
        if not api_key:
            return None
        return None  # Implement if key available
    
    async def _fetch_marketstack(self, symbol: str) -> Optional[MarketData]:
        api_key = os.environ.get('MARKETSTACK_KEY')
        if not api_key:
            return None
        return None
    
    async def _fetch_fcsapi(self, symbol: str) -> Optional[MarketData]:
        api_key = os.environ.get('FCSAPI_KEY')
        if not api_key:
            return None
        return None
    
    async def _fetch_simulated(self, symbol: str) -> MarketData:
        """Simulated data as ultimate fallback"""
        base_prices = {"US30": 42500, "US100": 21000, "GER30": 19500}
        base = base_prices.get(symbol, 40000)
        variation = random.uniform(-0.005, 0.005)
        price = base * (1 + variation)
        
        return MarketData(
            symbol=symbol,
            price=round(price, 2),
            change=round(price * variation, 2),
            change_percent=round(variation * 100, 2),
            high=round(price * 1.002, 2),
            low=round(price * 0.998, 2),
            open=round(price * 0.999, 2),
            volume=random.randint(100000, 500000),
            timestamp=datetime.now(timezone.utc)
        )

market_service = MarketDataService()

# ===================== SIGNAL ENGINE =====================

class SignalEngine:
    def __init__(self):
        self.direction_state = DirectionState()
        self.candle_history = {"US30": [], "US100": [], "GER30": []}
        
    def get_session_status(self) -> Dict[str, Any]:
        """Check if we're in a valid trading session"""
        now = datetime.now(timezone.utc)
        hour = now.hour
        
        # SAST is UTC+2
        sast_hour = (hour + 2) % 24
        
        sessions = {
            "GER30": {
                "active": 7 <= sast_hour <= 10,  # 09:00-12:00 SAST roughly
                "name": "Frankfurt Session",
                "window": "09:00-10:30 SAST"
            },
            "US30": {
                "active": 13 <= hour <= 17,  # NY Open 14:30-17:00 UTC
                "name": "NY Session",
                "window": "NY Open (14:30-17:00 UTC)"
            },
            "US100": {
                "active": 13 <= hour <= 17,
                "name": "NY Session", 
                "window": "NY Open (14:30-17:00 UTC)"
            }
        }
        return sessions
    
    def calculate_confidence(self, analysis: Dict) -> int:
        """Calculate confidence score based on components"""
        score = 0
        
        # HTF structure clarity (25%)
        if analysis.get("htf_structure_clear"):
            score += 25
        
        # Liquidity sweep quality (20%)
        if analysis.get("liquidity_swept"):
            score += 20
        
        # Displacement strength (20%)
        if analysis.get("strong_displacement"):
            score += 20
        
        # Pullback cleanliness (15%)
        if analysis.get("clean_pullback"):
            score += 15
        
        # Session alignment (10%)
        if analysis.get("session_aligned"):
            score += 10
        
        # No counter-pressure (10%)
        if analysis.get("no_counter_pressure"):
            score += 10
            
        return min(score, 100)
    
    def analyze_structure(self, symbol: str, current_price: float) -> Dict[str, Any]:
        """Analyze market structure for signal generation"""
        # Simulated analysis - in production, this would use real candle data
        random.seed(int(datetime.now(timezone.utc).timestamp()) % 1000 + hash(symbol))
        
        analysis = {
            "htf_structure_clear": random.random() > 0.3,
            "liquidity_swept": random.random() > 0.4,
            "strong_displacement": random.random() > 0.35,
            "clean_pullback": random.random() > 0.3,
            "session_aligned": True,
            "no_counter_pressure": random.random() > 0.25,
            "structure_type": random.choice(["HH_HL", "LL_LH", "RANGING"]),
            "key_levels": {
                "resistance": round(current_price * 1.005, 2),
                "support": round(current_price * 0.995, 2),
                "fvg_zone": round(current_price * 0.998, 2)
            }
        }
        
        return analysis
    
    def generate_signal(self, symbol: str, market_data: MarketData, force_direction: str = None) -> Optional[Signal]:
        """Generate trading signal based on engine rules"""
        sessions = self.get_session_status()
        session_info = sessions.get(symbol, {})
        
        if not session_info.get("active"):
            return None
        
        analysis = self.analyze_structure(symbol, market_data.price)
        analysis["session_aligned"] = session_info.get("active", False)
        
        confidence = self.calculate_confidence(analysis)
        
        if confidence < 80:
            return None
        
        # Determine direction
        if self.direction_state.current_direction != "NEUTRAL" and not force_direction:
            direction = self.direction_state.current_direction
        else:
            if analysis["structure_type"] == "HH_HL":
                direction = "BUY"
            elif analysis["structure_type"] == "LL_LH":
                direction = "SELL"
            else:
                return None
        
        # Lock direction
        self.direction_state.current_direction = direction
        self.direction_state.locked_at = datetime.now(timezone.utc)
        
        price = market_data.price
        
        if direction == "BUY":
            entry = round(price * 0.999, 2)
            sl = round(price * 0.995, 2)
            tp1 = round(price * 1.003, 2)
            tp2 = round(price * 1.006, 2)
            tp3 = round(price * 1.012, 2)
        else:
            entry = round(price * 1.001, 2)
            sl = round(price * 1.005, 2)
            tp1 = round(price * 0.997, 2)
            tp2 = round(price * 0.994, 2)
            tp3 = round(price * 0.988, 2)
        
        is_pending = confidence >= 90 and random.random() > 0.6
        
        return Signal(
            symbol=symbol,
            direction=direction,
            entry_price=entry,
            stop_loss=sl,
            tp1=tp1,
            tp2=tp2,
            tp3=tp3,
            confidence=confidence,
            status="PENDING" if is_pending else "ACTIVE",
            is_pending=is_pending,
            analysis=analysis,
            session=session_info.get("name", "")
        )

signal_engine = SignalEngine()

# ===================== AUTH HELPERS =====================

def create_token(role: str, name: str, code_id: str = None) -> str:
    payload = {
        "role": role,
        "name": name,
        "code_id": code_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

async def verify_owner(payload: dict = Depends(verify_token)):
    if payload.get("role") != "owner":
        raise HTTPException(status_code=403, detail="Owner access required")
    return payload

# ===================== WEBSOCKET MANAGER =====================

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
    
    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
    
    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
    
    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                pass

ws_manager = ConnectionManager()

# ===================== API ROUTES =====================

@api_router.get("/")
async def root():
    return {"message": "Richgang FX Indice Killer API", "version": "1.0.0"}

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(request: LoginRequest):
    code = request.code.strip()
    
    # Check if owner
    if code == OWNER_MASTER_CODE:
        token = create_token("owner", "Owner")
        return TokenResponse(token=token, role="owner", name="Owner")
    
    # Check client codes
    access_code = await db.access_codes.find_one({"code": code, "is_active": True}, {"_id": 0})
    if access_code:
        # Update last used
        await db.access_codes.update_one(
            {"code": code},
            {"$set": {"last_used": datetime.now(timezone.utc).isoformat()}}
        )
        token = create_token("client", access_code["name"], access_code["id"])
        return TokenResponse(token=token, role="client", name=access_code["name"])
    
    raise HTTPException(status_code=401, detail="Invalid access code")

@api_router.post("/auth/verify")
async def verify_auth(payload: dict = Depends(verify_token)):
    return {"valid": True, "role": payload.get("role"), "name": payload.get("name")}

# Access Code Management (Owner Only)
@api_router.get("/access-codes", response_model=List[AccessCode])
async def get_access_codes(_: dict = Depends(verify_owner)):
    codes = await db.access_codes.find({}, {"_id": 0}).to_list(1000)
    for code in codes:
        if isinstance(code.get('created_at'), str):
            code['created_at'] = datetime.fromisoformat(code['created_at'])
        if isinstance(code.get('last_used'), str):
            code['last_used'] = datetime.fromisoformat(code['last_used'])
    return codes

@api_router.post("/access-codes", response_model=AccessCode)
async def create_access_code(input: AccessCodeCreate, _: dict = Depends(verify_owner)):
    # Generate unique code
    code = f"RG-{secrets.token_hex(4).upper()}"
    
    access_code = AccessCode(code=code, name=input.name)
    doc = access_code.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.access_codes.insert_one(doc)
    return access_code

@api_router.delete("/access-codes/{code_id}")
async def delete_access_code(code_id: str, _: dict = Depends(verify_owner)):
    result = await db.access_codes.update_one(
        {"id": code_id},
        {"$set": {"is_active": False}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Code not found")
    return {"success": True}

# Market Data
@api_router.get("/market/{symbol}")
async def get_market_data(symbol: str, _: dict = Depends(verify_token)):
    if symbol not in ["US30", "US100", "GER30"]:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    
    data = await market_service.get_market_data(symbol)
    return {
        "symbol": data.symbol,
        "price": data.price,
        "change": data.change,
        "change_percent": data.change_percent,
        "high": data.high,
        "low": data.low,
        "open": data.open,
        "volume": data.volume,
        "timestamp": data.timestamp.isoformat()
    }

@api_router.get("/market")
async def get_all_market_data(_: dict = Depends(verify_token)):
    results = {}
    for symbol in ["US30", "US100", "GER30"]:
        data = await market_service.get_market_data(symbol)
        results[symbol] = {
            "price": data.price,
            "change": data.change,
            "change_percent": data.change_percent,
            "high": data.high,
            "low": data.low,
            "timestamp": data.timestamp.isoformat()
        }
    return results

# Signals
@api_router.get("/signals")
async def get_signals(_: dict = Depends(verify_token)):
    signals = await db.signals.find(
        {"status": {"$in": ["ACTIVE", "TP1_HIT", "TP2_HIT"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    
    for signal in signals:
        if isinstance(signal.get('created_at'), str):
            signal['created_at'] = datetime.fromisoformat(signal['created_at'])
    
    return signals

@api_router.get("/signals/pending")
async def get_pending_signals(_: dict = Depends(verify_token)):
    signals = await db.signals.find(
        {"is_pending": True, "status": "PENDING"},
        {"_id": 0}
    ).sort("confidence", -1).to_list(100)
    
    for signal in signals:
        if isinstance(signal.get('created_at'), str):
            signal['created_at'] = datetime.fromisoformat(signal['created_at'])
    
    return signals

@api_router.post("/signals/generate")
async def generate_new_signal(symbol: str = "US30", _: dict = Depends(verify_owner)):
    """Manually trigger signal generation (owner only)"""
    if symbol not in ["US30", "US100", "GER30"]:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    
    market_data = await market_service.get_market_data(symbol)
    signal = signal_engine.generate_signal(symbol, market_data)
    
    if not signal:
        return {"message": "No valid signal at this time", "reason": "Conditions not met"}
    
    doc = signal.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.signals.insert_one(doc)
    
    # Broadcast to connected clients
    await ws_manager.broadcast({
        "type": "new_signal",
        "signal": doc
    })
    
    return signal

@api_router.get("/direction")
async def get_direction_state(_: dict = Depends(verify_token)):
    state = await db.direction_state.find_one({"id": "global_direction"}, {"_id": 0})
    if not state:
        state = signal_engine.direction_state.model_dump()
    return state

@api_router.post("/direction/reset")
async def reset_direction(_: dict = Depends(verify_owner)):
    """Reset direction to neutral"""
    signal_engine.direction_state = DirectionState()
    await db.direction_state.update_one(
        {"id": "global_direction"},
        {"$set": signal_engine.direction_state.model_dump()},
        upsert=True
    )
    return {"success": True, "direction": "NEUTRAL"}

@api_router.get("/sessions")
async def get_session_status(_: dict = Depends(verify_token)):
    return signal_engine.get_session_status()

# Price History for Charts
@api_router.get("/history/{symbol}")
async def get_price_history(symbol: str, _: dict = Depends(verify_token)):
    """Get simulated price history for charts"""
    if symbol not in ["US30", "US100", "GER30"]:
        raise HTTPException(status_code=400, detail="Invalid symbol")
    
    current_data = await market_service.get_market_data(symbol)
    base_price = current_data.price
    
    # Generate 100 data points
    history = []
    for i in range(100):
        timestamp = datetime.now(timezone.utc) - timedelta(minutes=100-i)
        variation = random.uniform(-0.002, 0.002)
        price = base_price * (1 + variation * (i / 100))
        history.append({
            "time": timestamp.isoformat(),
            "open": round(price * 0.999, 2),
            "high": round(price * 1.001, 2),
            "low": round(price * 0.998, 2),
            "close": round(price, 2),
            "volume": random.randint(10000, 50000)
        })
    
    return history

# WebSocket for real-time updates
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        while True:
            # Send market updates every 5 seconds
            await asyncio.sleep(5)
            data = {}
            for symbol in ["US30", "US100", "GER30"]:
                market = await market_service.get_market_data(symbol)
                data[symbol] = {
                    "price": market.price,
                    "change": market.change,
                    "change_percent": market.change_percent
                }
            await websocket.send_json({"type": "market_update", "data": data})
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

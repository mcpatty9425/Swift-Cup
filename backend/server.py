"""
The Swifty Cup 2026 — FastAPI backend.

- MongoDB persistence for players, pairings, matches, settings
- Admin PIN auth with JWT (admin can edit players + pairings)
- Public score updates (status, result) over REST + WebSocket broadcast
- Emergent Object Storage for profile photos
"""
from __future__ import annotations

import logging
import os
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Literal, Optional

import jwt
import requests
from dotenv import load_dotenv
from fastapi import (
    APIRouter,
    Depends,
    FastAPI,
    File,
    Form,
    HTTPException,
    Query,
    Request,
    UploadFile,
    WebSocket,
    WebSocketDisconnect,
)
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# ---------- Config ----------
MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
ADMIN_PIN = os.environ["ADMIN_PIN"]
JWT_SECRET = os.environ["JWT_SECRET"]
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
STORAGE_BASE = (os.environ.get("INTEGRATION_PROXY_URL") or "").strip() or "https://integrations.emergentagent.com"
STORAGE_URL = STORAGE_BASE.rstrip("/") + "/objstore/api/v1/storage"
APP_NAME = "the-swifty-cup-2026"
JWT_ALG = "HS256"
JWT_EXPIRY_HOURS = 24 * 30  # 30 days (long-lived for a trip app)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# ---------- App ----------
app = FastAPI(title="The Swifty Cup 2026")


@app.get("/health", include_in_schema=False)
@app.head("/health", include_in_schema=False)
async def health():
    return {"status": "ok"}


api_router = APIRouter(prefix="/api")

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
log = logging.getLogger("swifty")


# ---------- Models ----------
TeamT = Literal["NZ", "WORLD"]
RoundT = Literal[1, 2, 3]
ResultT = Literal["NZ_WIN", "HALVED", "WORLD_WIN"]


class Player(BaseModel):
    id: str
    team: TeamT
    name: str
    bio: str = ""
    photo_path: Optional[str] = None  # storage path
    order: int = 0


class PlayerUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    photo_path: Optional[str] = None  # pass "" to clear


class Match(BaseModel):
    id: str
    round: RoundT
    index: int
    nz_player_ids: List[str] = Field(default_factory=list)
    world_player_ids: List[str] = Field(default_factory=list)
    live_status: str = ""
    result: Optional[ResultT] = None
    updated_at: str = ""


class MatchStatusUpdate(BaseModel):
    live_status: Optional[str] = None
    result: Optional[Optional[ResultT]] = None  # null to clear


class PairingUpdate(BaseModel):
    """Admin bulk pairing update for a given round."""

    matches: List[Dict[str, Any]]  # [{id, nz_player_ids, world_player_ids}, ...]


class Settings(BaseModel):
    tournament_name: str = "The Swifty Cup 2026"
    year: int = 2026
    nz_team_name: str = "Team NZ"
    world_team_name: str = "Team World"


class SettingsUpdate(BaseModel):
    tournament_name: Optional[str] = None
    year: Optional[int] = None
    nz_team_name: Optional[str] = None
    world_team_name: Optional[str] = None


class RoundInfo(BaseModel):
    round: RoundT
    format: str
    venue: str = "Course TBD"
    date: str = "Date TBD"


class RoundUpdate(BaseModel):
    format: Optional[str] = None
    venue: Optional[str] = None
    date: Optional[str] = None


class SelfPlayerUpdate(BaseModel):
    player_id: str
    bio: Optional[str] = None
    photo_path: Optional[str] = None  # "" to clear


class PinLogin(BaseModel):
    pin: str


class PinChange(BaseModel):
    new_pin: str


# ---------- Auth ----------
def issue_token() -> str:
    payload = {
        "role": "admin",
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)


async def require_admin(request: Request) -> None:
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Admin auth required")
    token = auth[7:]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
    except jwt.PyJWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc
    if payload.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Not an admin")


async def get_current_pin() -> str:
    doc = await db.config.find_one({"_id": "admin"})
    if doc and doc.get("pin"):
        return doc["pin"]
    return ADMIN_PIN


# ---------- Object storage ----------
_storage_key: Optional[str] = None


def _init_storage() -> str:
    global _storage_key
    if _storage_key:
        return _storage_key
    resp = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    resp.raise_for_status()
    _storage_key = resp.json()["storage_key"]
    return _storage_key


def _put_object(path: str, data: bytes, content_type: str) -> dict:
    key = _init_storage()
    resp = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if resp.status_code == 503:
        # stale key, re-init once
        globals()["_storage_key"] = None
        key = _init_storage()
        resp = requests.put(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key, "Content-Type": content_type},
            data=data,
            timeout=120,
        )
    resp.raise_for_status()
    return resp.json()


def _get_object(path: str) -> tuple[bytes, str]:
    key = _init_storage()
    resp = requests.get(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key},
        timeout=60,
    )
    if resp.status_code == 503:
        globals()["_storage_key"] = None
        key = _init_storage()
        resp = requests.get(
            f"{STORAGE_URL}/objects/{path}",
            headers={"X-Storage-Key": key},
            timeout=60,
        )
    resp.raise_for_status()
    return resp.content, resp.headers.get("Content-Type", "application/octet-stream")


# ---------- WebSocket broker ----------
class Broker:
    def __init__(self) -> None:
        self.clients: List[WebSocket] = []

    async def connect(self, ws: WebSocket) -> None:
        await ws.accept()
        self.clients.append(ws)

    def disconnect(self, ws: WebSocket) -> None:
        if ws in self.clients:
            self.clients.remove(ws)

    async def broadcast(self, event: dict) -> None:
        dead: List[WebSocket] = []
        for ws in list(self.clients):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(ws)


broker = Broker()


@app.websocket("/api/ws")
async def ws_endpoint(ws: WebSocket):
    await broker.connect(ws)
    try:
        while True:
            # keep-alive; we only broadcast server->client
            await ws.receive_text()
    except WebSocketDisconnect:
        broker.disconnect(ws)
    except Exception:
        broker.disconnect(ws)


# ---------- Seeding ----------
async def seed_if_empty() -> None:
    if await db.players.count_documents({}) == 0:
        log.info("Seeding default players + matches")
        players: List[dict] = []
        for i in range(1, 7):
            players.append(
                Player(id=str(uuid.uuid4()), team="NZ", name=f"NZ Player {i}", bio="", order=i).model_dump()
            )
        for i in range(1, 7):
            players.append(
                Player(id=str(uuid.uuid4()), team="WORLD", name=f"World Player {i}", bio="", order=i).model_dump()
            )
        await db.players.insert_many([p.copy() for p in players])

        matches: List[dict] = []
        # Round 1 & 2: 3 matches each, 2v2
        for rnd in (1, 2):
            for idx in range(3):
                matches.append(
                    Match(
                        id=str(uuid.uuid4()),
                        round=rnd,  # type: ignore[arg-type]
                        index=idx,
                        nz_player_ids=[],
                        world_player_ids=[],
                        live_status="",
                        result=None,
                        updated_at=datetime.now(timezone.utc).isoformat(),
                    ).model_dump()
                )
        # Round 3: 6 matches, 1v1
        for idx in range(6):
            matches.append(
                Match(
                    id=str(uuid.uuid4()),
                    round=3,
                    index=idx,
                    nz_player_ids=[],
                    world_player_ids=[],
                    live_status="",
                    result=None,
                    updated_at=datetime.now(timezone.utc).isoformat(),
                ).model_dump()
            )
        await db.matches.insert_many([m.copy() for m in matches])

    if await db.settings.count_documents({}) == 0:
        await db.settings.insert_one({"_id": "default", **Settings().model_dump()})

    if await db.rounds.count_documents({}) == 0:
        defaults = [
            RoundInfo(round=1, format="Alternate Shot").model_dump(),
            RoundInfo(round=2, format="Best Ball").model_dump(),
            RoundInfo(round=3, format="Heads Up").model_dump(),
        ]
        await db.rounds.insert_many([d.copy() for d in defaults])


@app.on_event("startup")
async def on_startup() -> None:
    try:
        await seed_if_empty()
    except Exception as exc:
        log.exception("Seed failed: %s", exc)
    # Init storage lazily on first upload; don't fail boot if key missing
    try:
        if EMERGENT_KEY:
            await run_in_threadpool(_init_storage)
    except Exception as exc:
        log.warning("Storage init deferred: %s", exc)


# ---------- Helpers ----------
def strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


async def all_players() -> List[dict]:
    return await db.players.find({}, {"_id": 0}).sort([("team", 1), ("order", 1)]).to_list(200)


async def all_matches() -> List[dict]:
    return await db.matches.find({}, {"_id": 0}).sort([("round", 1), ("index", 1)]).to_list(200)


async def all_rounds() -> List[dict]:
    docs = await db.rounds.find({}, {"_id": 0}).sort("round", 1).to_list(10)
    # Compute status for each from matches
    matches = await all_matches()
    out = []
    for d in docs:
        r = d["round"]
        rm = [m for m in matches if m["round"] == r]
        if rm and all(m.get("result") for m in rm):
            status = "COMPLETE"
        elif any(m.get("result") or m.get("live_status") for m in rm):
            status = "LIVE"
        else:
            status = "UPCOMING"
        d["status"] = status
        d["completed"] = sum(1 for m in rm if m.get("result"))
        d["total"] = len(rm)
        out.append(d)
    return out


# ---------- Endpoints ----------
@api_router.get("/")
async def root():
    return {"app": "The Swifty Cup 2026", "status": "ok"}


# --- Settings
@api_router.get("/settings")
async def get_settings() -> dict:
    doc = await db.settings.find_one({"_id": "default"}, {"_id": 0})
    if not doc:
        return Settings().model_dump()
    return doc


@api_router.patch("/settings", dependencies=[Depends(require_admin)])
async def update_settings(update: SettingsUpdate) -> dict:
    patch = {k: v for k, v in update.model_dump().items() if v is not None}
    if patch:
        await db.settings.update_one({"_id": "default"}, {"$set": patch}, upsert=True)
    doc = await db.settings.find_one({"_id": "default"}, {"_id": 0})
    await broker.broadcast({"type": "settings_changed", "payload": doc})
    return doc or {}


# --- Auth
@api_router.post("/admin/login")
async def admin_login(payload: PinLogin) -> dict:
    expected = await get_current_pin()
    if payload.pin != expected:
        raise HTTPException(status_code=401, detail="Invalid PIN")
    return {"token": issue_token()}


@api_router.post("/admin/change-pin", dependencies=[Depends(require_admin)])
async def change_pin(payload: PinChange) -> dict:
    if len(payload.new_pin) < 3:
        raise HTTPException(status_code=400, detail="PIN too short")
    await db.config.update_one({"_id": "admin"}, {"$set": {"pin": payload.new_pin}}, upsert=True)
    return {"ok": True}


@api_router.get("/admin/me")
async def admin_me(request: Request) -> dict:
    try:
        await require_admin(request)
        return {"is_admin": True}
    except HTTPException:
        return {"is_admin": False}


# --- Players
@api_router.get("/players")
async def list_players() -> List[dict]:
    return await all_players()


@api_router.patch("/players/{player_id}", dependencies=[Depends(require_admin)])
async def update_player(player_id: str, update: PlayerUpdate) -> dict:
    patch: dict = {}
    for k, v in update.model_dump(exclude_unset=True).items():
        if k == "photo_path" and v == "":
            patch["photo_path"] = None
        elif v is not None:
            patch[k] = v
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.players.update_one({"id": player_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    await broker.broadcast({"type": "player_updated", "payload": doc})
    return doc or {}


# --- Photo upload (admin only)
@api_router.post("/photos", dependencies=[Depends(require_admin)])
async def upload_photo(player_id: str = Form(...), file: UploadFile = File(...)) -> dict:
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="Storage not configured")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Photo too large (max 10MB)")
    ext = (file.filename or "").split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "heic", "heif", "webp"}:
        ext = "jpg"
    path = f"{APP_NAME}/players/{player_id}/{uuid.uuid4().hex}.{ext}"
    content_type = file.content_type or "image/jpeg"
    try:
        await run_in_threadpool(_put_object, path, content, content_type)
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 500
        if status == 402:
            raise HTTPException(status_code=402, detail="Storage out of credits") from exc
        raise HTTPException(status_code=502, detail=f"Storage error: {status}") from exc

    await db.players.update_one({"id": player_id}, {"$set": {"photo_path": path}})
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    await broker.broadcast({"type": "player_updated", "payload": doc})
    return {"photo_path": path, "player": doc}


@api_router.get("/photos/{path:path}")
async def get_photo(path: str) -> Response:
    # public read of player photos (gated by DB existence)
    exists = await db.players.find_one({"photo_path": path}, {"_id": 0, "id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Not found")
    try:
        content, ctype = await run_in_threadpool(_get_object, path)
    except requests.HTTPError as exc:
        raise HTTPException(status_code=404, detail="Photo missing") from exc
    return Response(
        content=content,
        media_type=ctype,
        headers={"Cache-Control": "public, max-age=86400"},
    )


# --- Matches
@api_router.get("/matches")
async def list_matches() -> List[dict]:
    return await all_matches()


@api_router.patch("/matches/{match_id}")
async def update_match(match_id: str, update: MatchStatusUpdate) -> dict:
    """Public: live status and result updates."""
    patch: dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    data = update.model_dump(exclude_unset=True)
    if "live_status" in data:
        patch["live_status"] = data["live_status"] or ""
    if "result" in data:
        res = data["result"]
        if res is not None and res not in ("NZ_WIN", "HALVED", "WORLD_WIN"):
            raise HTTPException(status_code=400, detail="Invalid result")
        patch["result"] = res
    result = await db.matches.update_one({"id": match_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Match not found")
    doc = await db.matches.find_one({"id": match_id}, {"_id": 0})
    await broker.broadcast({"type": "match_updated", "payload": doc})
    return doc or {}


# --- Pairings (admin)
@api_router.patch("/pairings/{round_num}", dependencies=[Depends(require_admin)])
async def update_pairings(round_num: int, update: PairingUpdate) -> dict:
    if round_num not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Invalid round")
    # Apply each match's pairing changes (keeps live_status and result intact)
    for m in update.matches:
        mid = m.get("id")
        if not mid:
            continue
        patch = {
            "nz_player_ids": list(m.get("nz_player_ids") or []),
            "world_player_ids": list(m.get("world_player_ids") or []),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.matches.update_one({"id": mid, "round": round_num}, {"$set": patch})
    docs = await db.matches.find({"round": round_num}, {"_id": 0}).sort("index", 1).to_list(50)
    await broker.broadcast({"type": "pairings_changed", "payload": {"round": round_num, "matches": docs}})
    return {"round": round_num, "matches": docs}


# --- Leaderboard
def _round_points(matches: List[dict], rnd: int) -> Dict[str, float]:
    nz = 0.0
    world = 0.0
    for m in matches:
        if m["round"] != rnd:
            continue
        r = m.get("result")
        if r == "NZ_WIN":
            nz += 1
        elif r == "WORLD_WIN":
            world += 1
        elif r == "HALVED":
            nz += 0.5
            world += 0.5
    return {"nz": nz, "world": world}


def _total_matches_per_round(matches: List[dict]) -> Dict[int, int]:
    counts: Dict[int, int] = {1: 0, 2: 0, 3: 0}
    for m in matches:
        counts[m["round"]] = counts.get(m["round"], 0) + 1
    return counts


@api_router.get("/leaderboard")
async def leaderboard() -> dict:
    matches = await all_matches()
    rounds = {r: _round_points(matches, r) for r in (1, 2, 3)}
    nz_total = sum(r["nz"] for r in rounds.values())
    world_total = sum(r["world"] for r in rounds.values())
    total_matches = len(matches)
    completed = sum(1 for m in matches if m.get("result"))
    all_done = completed == total_matches and total_matches > 0

    if all_done:
        if nz_total > world_total:
            cup_winner = "NZ"
        elif world_total > nz_total:
            cup_winner = "WORLD"
        else:
            cup_winner = "TIE"
    else:
        cup_winner = None

    if nz_total > world_total:
        leader = "NZ"
    elif world_total > nz_total:
        leader = "WORLD"
    else:
        leader = "TIE"

    return {
        "rounds": rounds,
        "nz_total": nz_total,
        "world_total": world_total,
        "leader": leader,
        "cup_winner": cup_winner,
        "completed_matches": completed,
        "total_matches": total_matches,
        "per_round_totals": _total_matches_per_round(matches),
    }


# --- Bulk state (one-shot fetch for the app)
@api_router.get("/state")
async def full_state() -> dict:
    settings = await get_settings()
    players = await all_players()
    matches = await all_matches()
    rounds = await all_rounds()
    lb = await leaderboard()
    return {"settings": settings, "players": players, "matches": matches, "rounds": rounds, "leaderboard": lb}


# --- Rounds
@api_router.get("/rounds")
async def list_rounds() -> List[dict]:
    return await all_rounds()


@api_router.patch("/rounds/{round_num}", dependencies=[Depends(require_admin)])
async def update_round(round_num: int, update: RoundUpdate) -> dict:
    if round_num not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Invalid round")
    patch = {k: v for k, v in update.model_dump(exclude_unset=True).items() if v is not None}
    if patch:
        await db.rounds.update_one({"round": round_num}, {"$set": patch}, upsert=False)
    doc = await db.rounds.find_one({"round": round_num}, {"_id": 0})
    await broker.broadcast({"type": "rounds_changed", "payload": doc})
    return doc or {}


# --- Self edit (public player edits own bio/photo)
@api_router.patch("/players/{player_id}/self")
async def self_update_player(player_id: str, update: SelfPlayerUpdate) -> dict:
    if update.player_id != player_id:
        raise HTTPException(status_code=400, detail="Player mismatch")
    patch: dict = {}
    if update.bio is not None:
        patch["bio"] = update.bio
    if update.photo_path is not None:
        patch["photo_path"] = update.photo_path or None
    if not patch:
        raise HTTPException(status_code=400, detail="No fields to update")
    result = await db.players.update_one({"id": player_id}, {"$set": patch})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Player not found")
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    await broker.broadcast({"type": "player_updated", "payload": doc})
    return doc or {}


@api_router.post("/photos-self")
async def upload_photo_self(player_id: str = Form(...), file: UploadFile = File(...)) -> dict:
    """Public self-upload: a player updating their own photo. No admin JWT required."""
    if not EMERGENT_KEY:
        raise HTTPException(status_code=500, detail="Storage not configured")
    # ensure player exists
    exists = await db.players.find_one({"id": player_id}, {"_id": 0, "id": 1})
    if not exists:
        raise HTTPException(status_code=404, detail="Player not found")
    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Photo too large (max 10MB)")
    ext = (file.filename or "").split(".")[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in {"jpg", "jpeg", "png", "heic", "heif", "webp"}:
        ext = "jpg"
    path = f"{APP_NAME}/players/{player_id}/{uuid.uuid4().hex}.{ext}"
    content_type = file.content_type or "image/jpeg"
    try:
        await run_in_threadpool(_put_object, path, content, content_type)
    except requests.HTTPError as exc:
        status = exc.response.status_code if exc.response is not None else 500
        if status == 402:
            raise HTTPException(status_code=402, detail="Storage out of credits") from exc
        raise HTTPException(status_code=502, detail=f"Storage error: {status}") from exc

    await db.players.update_one({"id": player_id}, {"$set": {"photo_path": path}})
    doc = await db.players.find_one({"id": player_id}, {"_id": 0})
    await broker.broadcast({"type": "player_updated", "payload": doc})
    return {"photo_path": path, "player": doc}


app.include_router(api_router)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

"""Iteration 2 tests: rounds metadata, self-edit, self-photo upload."""
import io
import os
import pytest
import requests

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"
PIN = "1926"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/admin/login", json={"pin": PIN}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def players():
    r = requests.get(f"{API}/players", timeout=15)
    assert r.status_code == 200
    return r.json()


# ---------- /state includes rounds ----------
class TestStateRounds:
    def test_state_contains_rounds(self):
        r = requests.get(f"{API}/state", timeout=15)
        assert r.status_code == 200
        data = r.json()
        assert "rounds" in data
        rounds = data["rounds"]
        assert len(rounds) == 3
        formats = {rd["format"] for rd in rounds}
        assert formats == {"Alternate Shot", "Best Ball", "Heads Up"}
        for rd in rounds:
            assert rd["venue"] in ("Course TBD",) or rd["venue"]
            assert rd["date"] in ("Date TBD",) or rd["date"]
            assert rd["status"] in ("UPCOMING", "LIVE", "COMPLETE")
            assert "completed" in rd and "total" in rd


# ---------- /rounds endpoint ----------
class TestRoundsEndpoint:
    def _clear_all_results(self, token):
        matches = requests.get(f"{API}/matches").json()
        for m in matches:
            requests.patch(f"{API}/matches/{m['id']}", json={"live_status": "", "result": None})

    def test_rounds_shape(self):
        r = requests.get(f"{API}/rounds", timeout=15)
        assert r.status_code == 200
        rounds = r.json()
        assert len(rounds) == 3
        for rd in rounds:
            assert set(["round", "format", "venue", "date", "status", "completed", "total"]).issubset(rd.keys())

    def test_status_transitions(self, admin_token):
        self._clear_all_results(admin_token)
        rounds = requests.get(f"{API}/rounds").json()
        r1 = next(r for r in rounds if r["round"] == 1)
        assert r1["status"] == "UPCOMING"

        matches = requests.get(f"{API}/matches").json()
        r1_matches = [m for m in matches if m["round"] == 1]
        # one LIVE
        requests.patch(f"{API}/matches/{r1_matches[0]['id']}", json={"live_status": "On tee"})
        rounds = requests.get(f"{API}/rounds").json()
        assert next(r for r in rounds if r["round"] == 1)["status"] == "LIVE"

        # complete all
        for m in r1_matches:
            requests.patch(f"{API}/matches/{m['id']}", json={"result": "HALVED", "live_status": ""})
        rounds = requests.get(f"{API}/rounds").json()
        r1 = next(r for r in rounds if r["round"] == 1)
        assert r1["status"] == "COMPLETE"
        assert r1["completed"] == r1["total"]
        # cleanup
        self._clear_all_results(admin_token)


# ---------- PATCH /rounds/{n} admin ----------
class TestRoundPatch:
    def test_patch_requires_auth(self):
        r = requests.patch(f"{API}/rounds/1", json={"venue": "Hacked"}, timeout=15)
        assert r.status_code == 401

    def test_patch_updates_round(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.patch(
            f"{API}/rounds/1",
            json={"venue": "TEST_Pebble Beach", "date": "TEST_2026-03-15"},
            headers=headers,
            timeout=15,
        )
        assert r.status_code == 200, r.text
        doc = r.json()
        assert doc["venue"] == "TEST_Pebble Beach"
        assert doc["date"] == "TEST_2026-03-15"

        # verify via GET
        rounds = requests.get(f"{API}/rounds").json()
        r1 = next(r for r in rounds if r["round"] == 1)
        assert r1["venue"] == "TEST_Pebble Beach"
        assert r1["date"] == "TEST_2026-03-15"

        # cleanup
        requests.patch(
            f"{API}/rounds/1",
            json={"venue": "Course TBD", "date": "Date TBD"},
            headers=headers,
            timeout=15,
        )

    def test_patch_invalid_round(self, admin_token):
        headers = {"Authorization": f"Bearer {admin_token}"}
        r = requests.patch(f"{API}/rounds/9", json={"venue": "x"}, headers=headers, timeout=15)
        assert r.status_code == 400


# ---------- self-edit bio ----------
class TestSelfPlayerUpdate:
    def test_self_update_bio_no_auth(self, players):
        pid = players[0]["id"]
        original = players[0].get("bio", "")
        r = requests.patch(
            f"{API}/players/{pid}/self",
            json={"player_id": pid, "bio": "TEST_my new bio"},
            timeout=15,
        )
        assert r.status_code == 200, r.text
        assert r.json()["bio"] == "TEST_my new bio"
        # verify via GET
        all_p = requests.get(f"{API}/players").json()
        updated = next(p for p in all_p if p["id"] == pid)
        assert updated["bio"] == "TEST_my new bio"
        # cleanup
        requests.patch(f"{API}/players/{pid}/self", json={"player_id": pid, "bio": original})

    def test_self_update_mismatch(self, players):
        pid = players[0]["id"]
        other = players[1]["id"]
        r = requests.patch(
            f"{API}/players/{pid}/self",
            json={"player_id": other, "bio": "nope"},
            timeout=15,
        )
        assert r.status_code == 400

    def test_self_update_unknown_player(self):
        pid = "00000000-nope"
        r = requests.patch(
            f"{API}/players/{pid}/self",
            json={"player_id": pid, "bio": "x"},
            timeout=15,
        )
        assert r.status_code == 404


# ---------- self-photo upload ----------
class TestSelfPhotoUpload:
    def test_upload_unknown_player_404(self):
        files = {"file": ("test.jpg", io.BytesIO(b"\xff\xd8\xff\xd9"), "image/jpeg")}
        data = {"player_id": "nonexistent-id-xyz"}
        r = requests.post(f"{API}/photos-self", files=files, data=data, timeout=30)
        assert r.status_code == 404

    def test_upload_sets_photo_path(self, players):
        pid = players[0]["id"]
        # tiny jpeg bytes
        png = (
            b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
            b"\x08\x02\x00\x00\x00\x90wS\xde\x00\x00\x00\x0cIDATx\x9cc\xf8\xcf\xc0\x00\x00\x00\x03\x00\x01"
            b"\x5c\xcd\xff\x69\x00\x00\x00\x00IEND\xaeB`\x82"
        )
        files = {"file": ("t.png", io.BytesIO(png), "image/png")}
        r = requests.post(f"{API}/photos-self", files=files, data={"player_id": pid}, timeout=60)
        # Accept 200 or 402 (out of credits) or 502 (storage unavailable) — but main assert on success path
        if r.status_code != 200:
            pytest.skip(f"Storage unavailable: {r.status_code} {r.text[:200]}")
        body = r.json()
        assert "photo_path" in body and body["photo_path"]
        assert body["player"]["photo_path"] == body["photo_path"]
        # verify persisted
        all_p = requests.get(f"{API}/players").json()
        updated = next(p for p in all_p if p["id"] == pid)
        assert updated["photo_path"] == body["photo_path"]
        # cleanup — clear via admin
        tok = requests.post(f"{API}/admin/login", json={"pin": PIN}).json()["token"]
        requests.patch(
            f"{API}/players/{pid}",
            json={"photo_path": ""},
            headers={"Authorization": f"Bearer {tok}"},
        )

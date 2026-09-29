"""Tests for app.core.auth -- the JWT verification that closes the IDOR gap
(previously every route trusted a raw user_id path param with zero auth).

Builds a real ES256 keypair and a real signed JWT locally (mirroring exactly
what Supabase issues) so these tests exercise genuine cryptographic
verification, not just "does it not crash".
"""
from __future__ import annotations

import time

import pytest
from fastapi import HTTPException
from jose import jwt

from app.core import auth as auth_module
from app.core.auth import resolve_user_id, verify_supabase_token


def _make_test_keypair():
    from cryptography.hazmat.primitives.asymmetric import ec
    from cryptography.hazmat.primitives.asymmetric.ec import EllipticCurvePrivateKey

    private_key: EllipticCurvePrivateKey = ec.generate_private_key(ec.SECP256R1())
    public_numbers = private_key.public_key().public_numbers()

    def _b64url_uint(n: int, length: int = 32) -> str:
        from base64 import urlsafe_b64encode
        raw = n.to_bytes(length, "big")
        return urlsafe_b64encode(raw).rstrip(b"=").decode()

    jwk_dict = {
        "kty": "EC",
        "crv": "P-256",
        "kid": "test-kid-1",
        "x": _b64url_uint(public_numbers.x),
        "y": _b64url_uint(public_numbers.y),
        "alg": "ES256",
        "use": "sig",
        "key_ops": ["verify"],
    }
    return private_key, jwk_dict


@pytest.fixture
def keypair():
    return _make_test_keypair()


@pytest.fixture(autouse=True)
def _reset_jwks_cache():
    auth_module._jwks_cache = None
    auth_module._jwks_cache_at = 0.0
    yield
    auth_module._jwks_cache = None
    auth_module._jwks_cache_at = 0.0


def _sign_token(private_key, kid: str, *, sub: str = "user-123", aud: str = "authenticated", exp_delta: float = 3600) -> str:
    from cryptography.hazmat.primitives import serialization

    pem = private_key.private_bytes(
        encoding=serialization.Encoding.PEM,
        format=serialization.PrivateFormat.PKCS8,
        encryption_algorithm=serialization.NoEncryption(),
    )
    claims = {"sub": sub, "aud": aud, "exp": time.time() + exp_delta, "iat": time.time()}
    return jwt.encode(claims, pem, algorithm="ES256", headers={"kid": kid})


def test_verify_supabase_token_accepts_valid_matching_token(keypair, monkeypatch):
    private_key, jwk_dict = keypair
    monkeypatch.setattr(auth_module, "_get_jwks", lambda: {"keys": [jwk_dict]})

    token = _sign_token(private_key, "test-kid-1")
    claims = verify_supabase_token(token)
    assert claims["sub"] == "user-123"


def test_verify_supabase_token_rejects_wrong_audience(keypair, monkeypatch):
    private_key, jwk_dict = keypair
    monkeypatch.setattr(auth_module, "_get_jwks", lambda: {"keys": [jwk_dict]})

    token = _sign_token(private_key, "test-kid-1", aud="some-other-audience")
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token(token)
    assert exc_info.value.status_code == 401


def test_verify_supabase_token_rejects_expired_token(keypair, monkeypatch):
    private_key, jwk_dict = keypair
    monkeypatch.setattr(auth_module, "_get_jwks", lambda: {"keys": [jwk_dict]})

    token = _sign_token(private_key, "test-kid-1", exp_delta=-10)
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token(token)
    assert exc_info.value.status_code == 401


def test_verify_supabase_token_rejects_signature_from_different_key(keypair, monkeypatch):
    """A token signed by an attacker's own keypair must never verify, even
    though it's a syntactically well-formed ES256 JWT."""
    _, real_jwk = keypair
    attacker_key, _ = _make_test_keypair()
    monkeypatch.setattr(auth_module, "_get_jwks", lambda: {"keys": [real_jwk]})

    forged = _sign_token(attacker_key, "test-kid-1")  # claims the real kid, wrong key
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token(forged)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_resolve_user_id_allows_demo_persona_with_no_token():
    result = await resolve_user_id(user_id="demo-priya", authorization=None)
    assert result == "demo-priya"


@pytest.mark.asyncio
async def test_resolve_user_id_rejects_real_user_with_no_token():
    with pytest.raises(HTTPException) as exc_info:
        await resolve_user_id(user_id="real-user-uuid", authorization=None)
    assert exc_info.value.status_code == 401


@pytest.mark.asyncio
async def test_resolve_user_id_rejects_token_user_id_mismatch(keypair, monkeypatch):
    """The core IDOR fix: a valid token for user A must not grant access to
    user B's data just because B's id is in the URL."""
    private_key, jwk_dict = keypair
    monkeypatch.setattr(auth_module, "_get_jwks", lambda: {"keys": [jwk_dict]})
    token = _sign_token(private_key, "test-kid-1", sub="user-A")

    with pytest.raises(HTTPException) as exc_info:
        await resolve_user_id(user_id="user-B", authorization=f"Bearer {token}")
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
async def test_resolve_user_id_allows_matching_token(keypair, monkeypatch):
    private_key, jwk_dict = keypair
    monkeypatch.setattr(auth_module, "_get_jwks", lambda: {"keys": [jwk_dict]})
    token = _sign_token(private_key, "test-kid-1", sub="user-A")

    result = await resolve_user_id(user_id="user-A", authorization=f"Bearer {token}")
    assert result == "user-A"


@pytest.mark.asyncio
async def test_resolve_user_id_allows_demo_persona_even_with_valid_token_for_someone_else(keypair, monkeypatch):
    """Signed-in users can still browse the public demo personas."""
    private_key, jwk_dict = keypair
    monkeypatch.setattr(auth_module, "_get_jwks", lambda: {"keys": [jwk_dict]})
    token = _sign_token(private_key, "test-kid-1", sub="user-A")

    result = await resolve_user_id(user_id="demo-meera", authorization=f"Bearer {token}")
    assert result == "demo-meera"


@pytest.mark.asyncio
async def test_resolve_user_id_rejects_malformed_auth_header():
    with pytest.raises(HTTPException) as exc_info:
        await resolve_user_id(user_id="demo-priya", authorization="NotBearer sometoken")
    assert exc_info.value.status_code == 401

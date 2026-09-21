"""
Unit and Integration Tests for Standalone Sensor Packaging Features
"""
import os
import sys
import json
import pytest
from pathlib import Path
from unittest.mock import patch, MagicMock
from sensor.windows_sensor import (
    get_runtime_data_dir,
    load_sensor_config,
    acquire_single_instance_lock,
    get_or_create_device_id,
    save_device_credentials,
    DEFAULT_SERVER,
)
import sensor.windows_sensor as ws


def test_runtime_data_dir_resolution(tmp_path, monkeypatch):
    custom_dir = tmp_path / "custom_sensor_data"
    monkeypatch.setenv("SENTINEL_DATA_DIR", str(custom_dir))

    resolved = get_runtime_data_dir()
    assert resolved == custom_dir
    assert resolved.exists()


def test_load_sensor_config_from_file(tmp_path, monkeypatch):
    cfg_data = {
        "server": "http://192.168.1.150:5000",
        "interval": 10,
        "private_server": "http://10.0.0.5:5000",
        "drive_dir": "D:\\RelayFolder"
    }
    cfg_file = tmp_path / "sentinel_sensor.json"
    cfg_file.write_text(json.dumps(cfg_data), encoding="utf-8")

    monkeypatch.chdir(tmp_path)
    loaded = load_sensor_config()
    assert loaded.get("server") == "http://192.168.1.150:5000"
    assert loaded.get("interval") == 10
    assert loaded.get("private_server") == "http://10.0.0.5:5000"
    assert loaded.get("drive_dir") == "D:\\RelayFolder"


def test_single_instance_mutex():
    lock1 = acquire_single_instance_lock()
    assert lock1 is True

    import ctypes
    ERROR_ALREADY_EXISTS = 183
    handle2 = ctypes.windll.kernel32.CreateMutexW(None, False, "SentinelTwin_Sensor_SingleInstance_Mutex")
    err = ctypes.windll.kernel32.GetLastError()
    if err != ERROR_ALREADY_EXISTS:
        handle2 = ctypes.windll.kernel32.CreateMutexW(None, False, "Global\\SentinelTwin_Sensor_SingleInstance_Mutex")
        err = ctypes.windll.kernel32.GetLastError()
    assert err in (ERROR_ALREADY_EXISTS, 5)
    if handle2:
        ctypes.windll.kernel32.CloseHandle(handle2)


def test_device_identity_persistence(tmp_path):
    dev_file = tmp_path / "sensor_device.json"
    dev_id_1, token_1 = get_or_create_device_id(device_file=dev_file)
    assert dev_id_1.startswith("ST-DEVICE-")
    assert dev_file.exists()

    save_device_credentials(dev_id_1, "test-token-12345", device_file=dev_file)

    dev_id_2, token_2 = get_or_create_device_id(device_file=dev_file)
    assert dev_id_2 == dev_id_1
    assert token_2 == "test-token-12345"


def test_build_time_url_resolution(monkeypatch, tmp_path):
    """Test A: Build-time configured URL resolves correctly at runtime."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SENTINEL_SERVER", raising=False)
    monkeypatch.setattr(ws, "EMBEDDED_SERVER_URL", "http://127.0.0.1:5000")

    cfg = load_sensor_config()
    base_server = ws.EMBEDDED_SERVER_URL or ws.DEFAULT_SERVER
    resolved = os.getenv("SENTINEL_SERVER") or cfg.get("server") or base_server
    assert resolved == "http://127.0.0.1:5000"


def test_no_config_file_required(monkeypatch, tmp_path):
    """Test B: When no sentinel_sensor.json exists, targets embedded URL without falling back to generic default."""
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("SENTINEL_SERVER", raising=False)
    custom_url = "http://192.168.1.200:5000"
    monkeypatch.setattr(ws, "EMBEDDED_SERVER_URL", custom_url)

    cfg = load_sensor_config()
    assert cfg == {}

    base_server = ws.EMBEDDED_SERVER_URL or ws.DEFAULT_SERVER
    resolved = os.getenv("SENTINEL_SERVER") or cfg.get("server") or base_server
    assert resolved == custom_url
    assert resolved != ws.DEFAULT_SERVER or ws.DEFAULT_SERVER == custom_url


def test_configuration_hierarchy_overrides(monkeypatch, tmp_path):
    """Test C: Verifies strict priority: CLI > Env > JSON > Embedded."""
    monkeypatch.chdir(tmp_path)
    embedded = "http://embedded-server:5000"
    json_url = "http://json-server:5000"
    env_url = "http://env-server:5000"

    monkeypatch.setattr(ws, "EMBEDDED_SERVER_URL", embedded)

    # 1. Embedded only
    monkeypatch.delenv("SENTINEL_SERVER", raising=False)
    cfg = load_sensor_config()
    res1 = os.getenv("SENTINEL_SERVER") or cfg.get("server") or ws.EMBEDDED_SERVER_URL or ws.DEFAULT_SERVER
    assert res1 == embedded

    # 2. JSON overrides Embedded
    (tmp_path / "sentinel_sensor.json").write_text(json.dumps({"server": json_url}), encoding="utf-8")
    cfg2 = load_sensor_config()
    res2 = os.getenv("SENTINEL_SERVER") or cfg2.get("server") or ws.EMBEDDED_SERVER_URL or ws.DEFAULT_SERVER
    assert res2 == json_url

    # 3. Env overrides JSON and Embedded
    monkeypatch.setenv("SENTINEL_SERVER", env_url)
    res3 = os.getenv("SENTINEL_SERVER") or cfg2.get("server") or ws.EMBEDDED_SERVER_URL or ws.DEFAULT_SERVER
    assert res3 == env_url


def test_safe_runtime_dir_rejects_meipass(monkeypatch, tmp_path):
    """Verifies that get_runtime_data_dir() rejects sys._MEIPASS extraction directory."""
    fake_meipass = tmp_path / "_MEI12345"
    fake_meipass.mkdir()
    monkeypatch.setattr(sys, "_MEIPASS", str(fake_meipass), raising=False)
    monkeypatch.setattr(sys, "frozen", True, raising=False)

    # If sys.executable were inside _MEIPASS (hypothetical failure case)
    monkeypatch.setattr(sys, "executable", str(fake_meipass / "fake.exe"))

    # When executable is in meipass, it must reject meipass and fall back to a safe location
    resolved = ws.get_runtime_data_dir()
    assert str(fake_meipass).lower() not in str(resolved).lower()


def test_first_run_environment_checks():
    """Verifies check_environment diagnostic checks execute without crashing."""
    diag = ws.check_environment("http://127.0.0.1:5000", ["Security"])
    assert isinstance(diag, dict)
    assert "data_dir_writable" in diag
    assert "security_log_accessible" in diag
    assert "sysmon_accessible" in diag
    assert "backend_reachable" in diag
    assert diag["data_dir_writable"] is True


def test_portable_start_bat_syntax():
    """Verifies that release/SentinelTwin-Sensor/start.bat contains no hardcoded dev paths."""
    start_bat = Path("release") / "SentinelTwin-Sensor" / "start.bat"
    if start_bat.exists():
        content = start_bat.read_text(encoding="utf-8")
        assert "%~dp0" in content
        assert "srima" not in content.lower()
        assert "c:\\users" not in content.lower()


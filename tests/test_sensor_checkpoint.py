"""
Test Suite for Windows Sensor Event Tracking & Checkpointing
"""
import pytest
from unittest.mock import MagicMock, patch
from sensor.windows_sensor import (
    read_channel_events,
    send_event,
    _classify_event_id,
    _normalize_record,
    load_checkpoints,
    save_checkpoints,
    CHECKPOINT_FILE
)

class MockRecord:
    def __init__(self, record_number, event_id, time_generated=None, string_inserts=None):
        self.RecordNumber = record_number
        self.EventID = event_id
        self.TimeGenerated = time_generated
        self.StringInserts = string_inserts or []

def test_checkpoint_load_save(tmp_path, monkeypatch):
    test_cp_file = tmp_path / "sensor_checkpoint.json"
    monkeypatch.setattr("sensor.windows_sensor.CHECKPOINT_FILE", test_cp_file)

    assert load_checkpoints() == {}

    data = {"Security": 100, "Microsoft-Windows-Sysmon/Operational": 200}
    save_checkpoints(data)
    loaded = load_checkpoints()
    assert loaded == data

def test_chronological_ordering_and_filtering(monkeypatch):
    """Verifies that events are filtered by WATCHED_EVENT_IDS and returned in ascending record_id order."""
    records = [
        MockRecord(105, 9999),  # not watched
        MockRecord(104, 1),     # Sysmon process creation
        MockRecord(103, 9999),  # not watched
        MockRecord(102, 4624),  # Security logon
        MockRecord(101, 3),     # Sysmon network connection
        MockRecord(100, 1),     # At checkpoint
    ]

    mock_win32 = MagicMock()
    mock_win32.EVENTLOG_BACKWARDS_READ = 0x0008
    mock_win32.EVENTLOG_SEQUENTIAL_READ = 0x0001
    mock_win32.OpenEventLog.return_value = 123
    mock_win32.ReadEventLog.side_effect = [records, []]

    with patch.dict("sys.modules", {"win32evtlog": mock_win32}):
        events, newest = read_channel_events("Microsoft-Windows-Sysmon/Operational", last_checkpoint=100)
        
        assert newest == 105
        # Only 101, 102, 104 are watched and > 100
        assert len(events) == 3
        # Chronological order
        assert [ev["record_id"] for ev in events] == [101, 102, 104]

def test_no_duplicate_events_on_subsequent_poll(monkeypatch):
    """Verifies that if no new events occurred (newest <= checkpoint), nothing is returned."""
    records = [
        MockRecord(100, 1),
        MockRecord(99, 1),
    ]

    mock_win32 = MagicMock()
    mock_win32.EVENTLOG_BACKWARDS_READ = 0x0008
    mock_win32.EVENTLOG_SEQUENTIAL_READ = 0x0001
    mock_win32.OpenEventLog.return_value = 123
    mock_win32.ReadEventLog.return_value = records

    with patch.dict("sys.modules", {"win32evtlog": mock_win32}):
        events, newest = read_channel_events("Microsoft-Windows-Sysmon/Operational", last_checkpoint=100)
        assert len(events) == 0
        assert newest == 100

def test_backend_failure_checkpoint_retention():
    """Verifies that send_event classifies 200/201 as sent, 409 as duplicate, and network error as failed."""
    with patch("requests.post") as mock_post:
        # Success
        mock_post.return_value.status_code = 201
        assert send_event("http://localhost:5000", {"record_id": 1}) == "sent"

        # Duplicate
        mock_post.return_value.status_code = 409
        assert send_event("http://localhost:5000", {"record_id": 2}) == "duplicate"

        # Server error
        mock_post.return_value.status_code = 500
        mock_post.return_value.text = "Internal error"
        assert send_event("http://localhost:5000", {"record_id": 3}) == "failed"

        # Network exception
        mock_post.side_effect = Exception("Connection refused")
        assert send_event("http://localhost:5000", {"record_id": 4}) == "failed"

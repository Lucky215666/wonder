import json
import pytest
import tempfile
import os
from backend.core.history import HistoryManager

def test_save_and_list():
    with tempfile.TemporaryDirectory() as tmpdir:
        mgr = HistoryManager(tmpdir)
        record_id = mgr.save(
            file_name="test.pdf",
            model="MiniMax-M2.7",
            reading_card="# Test",
            relation_analysis="# Relation",
            writing_materials="# Writing",
            todo_list="# Todo",
            full_report="# Full Report",
        )
        items = mgr.list_items()
        assert len(items) == 1
        assert items[0]["id"] == record_id
        assert items[0]["file_name"] == "test.pdf"

def test_get_item():
    with tempfile.TemporaryDirectory() as tmpdir:
        mgr = HistoryManager(tmpdir)
        record_id = mgr.save(
            file_name="test.pdf",
            model="MiniMax-M2.7",
            reading_card="# Test",
            relation_analysis="# Relation",
            writing_materials="# Writing",
            todo_list="# Todo",
            full_report="# Full Report",
        )
        item = mgr.get_item(record_id)
        assert item is not None
        assert item["file_name"] == "test.pdf"

def test_delete_item():
    with tempfile.TemporaryDirectory() as tmpdir:
        mgr = HistoryManager(tmpdir)
        record_id = mgr.save(
            file_name="test.pdf",
            model="MiniMax-M2.7",
            reading_card="# Test",
            relation_analysis="# Relation",
            writing_materials="# Writing",
            todo_list="# Todo",
            full_report="# Full Report",
        )
        mgr.delete_item(record_id)
        items = mgr.list_items()
        assert len(items) == 0

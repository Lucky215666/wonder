import json
import pytest
import tempfile
import os
from backend.core.config import ConfigManager


def test_default_config():
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = os.path.join(tmpdir, "config.json")
        mgr = ConfigManager(config_path)
        config = mgr.load()
        assert "model" in config
        assert "research" in config
        assert config["model"]["provider"] == "MiniMax"


def test_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = os.path.join(tmpdir, "config.json")
        mgr = ConfigManager(config_path)
        config = mgr.load()
        config["model"]["provider"] = "OpenAI"
        mgr.save(config)

        mgr2 = ConfigManager(config_path)
        loaded = mgr2.load()
        assert loaded["model"]["provider"] == "OpenAI"


def test_update_config():
    with tempfile.TemporaryDirectory() as tmpdir:
        config_path = os.path.join(tmpdir, "config.json")
        mgr = ConfigManager(config_path)
        mgr.load()
        result = mgr.update({"model": {"provider": "DeepSeek"}})
        config = mgr.load()
        assert config["model"]["provider"] == "DeepSeek"
        assert config["model"]["model_name"] == "MiniMax-M2.7"  # preserved
        assert result["model"]["provider"] == "DeepSeek"  # return value

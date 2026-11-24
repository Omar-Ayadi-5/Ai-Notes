import importlib.util
from pathlib import Path

from app import database


async def test_mongo_diagnostic_uses_the_live_handle(db, monkeypatch, capsys):
    script_path = Path(__file__).resolve().parents[1] / "scripts" / "test_mongo.py"
    spec = importlib.util.spec_from_file_location("diagnostic_script", script_path)
    script = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(script)
    monkeypatch.setattr(database, "db", None)

    async def connect():
        database.db = db

    async def close():
        database.db = None

    monkeypatch.setattr(database, "connect_db", connect)
    monkeypatch.setattr(database, "close_db", close)
    assert await script.main() == 0
    output = capsys.readouterr().out
    assert "OK" in output
    assert "mongodb://" not in output


def test_env_setup_generates_a_secret_without_overwriting_existing_config(tmp_path):
    import runpy

    source = Path(__file__).resolve().parents[1] / "scripts" / "init_env.py"
    scripts = tmp_path / "scripts"
    scripts.mkdir()
    copied = scripts / "init_env.py"
    copied.write_text(source.read_text(encoding="utf-8"), encoding="utf-8")
    (tmp_path / ".env.example").write_text("SECRET_KEY=\n", encoding="utf-8")
    runpy.run_path(str(copied))
    original = (tmp_path / ".env").read_text(encoding="utf-8")
    assert len(original.split("=", 1)[1].strip()) >= 64
    runpy.run_path(str(copied))
    assert (tmp_path / ".env").read_text(encoding="utf-8") == original

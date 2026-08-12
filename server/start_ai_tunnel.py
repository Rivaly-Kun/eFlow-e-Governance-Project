"""Manual compatibility publisher; normal startup is owned by AI server/start.py.

Do not run this beside the AI launcher's automatic tunnel supervisor.
"""

import argparse
from datetime import datetime, timezone
import os
from pathlib import Path
import queue
import re
import shutil
import signal
import subprocess
import sys
import threading
import time
from urllib.error import URLError
from urllib.request import urlopen

from gateway_dependencies import supabase_admin


GATEWAY_ORIGIN = "http://127.0.0.1:8322"
GATEWAY_HEALTH_URL = f"{GATEWAY_ORIGIN}/controlpanelEflow/api/health"
PUBLIC_API_SUFFIX = "/controlpanelEflow/api"
TUNNEL_URL_PATTERN = re.compile(r"https://[a-z0-9-]+\.trycloudflare\.com")


def _timestamp() -> str:
    return datetime.now(timezone.utc).isoformat()


def _upsert_config(values: dict[str, str]) -> None:
    updated_at = _timestamp()
    rows = [
        {"key": key, "value": value, "updated_at": updated_at}
        for key, value in values.items()
    ]
    supabase_admin.table("system_config").upsert(
        rows,
        on_conflict="key",
    ).execute()


def _mark_offline_if_owner(public_api_endpoint: str) -> None:
    try:
        result = (
            supabase_admin.table("system_config")
            .select("value")
            .eq("key", "ai_endpoint")
            .maybe_single()
            .execute()
        )
        current_endpoint = (result.data or {}).get("value")
        if current_endpoint == public_api_endpoint:
            _upsert_config({"ai_endpoint_status": "offline"})
    except Exception as exc:
        print(f"[WARN] Could not publish offline status: {exc}", file=sys.stderr)


def _wait_for_gateway(timeout_seconds: float = 30.0) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_error: Exception | None = None
    while time.monotonic() < deadline:
        try:
            with urlopen(GATEWAY_HEALTH_URL, timeout=2) as response:
                if response.status == 200:
                    return
        except (URLError, OSError) as exc:
            last_error = exc
        time.sleep(1)
    raise RuntimeError(
        "eFlow gateway is not responding on port 8322. "
        "Start `python server/main.py` before the tunnel."
    ) from last_error


def _find_cloudflared(explicit_path: str | None) -> str:
    if explicit_path:
        path = Path(explicit_path).expanduser().resolve()
        if path.is_file():
            return str(path)
        raise FileNotFoundError(f"cloudflared was not found at {path}")

    executable = shutil.which("cloudflared")
    if executable:
        return executable
    raise FileNotFoundError(
        "cloudflared is not installed or is not on PATH. "
        "Install it with `winget install Cloudflare.cloudflared`."
    )


def _read_output(process: subprocess.Popen[str], output: queue.Queue[str | None]) -> None:
    assert process.stdout is not None
    for line in process.stdout:
        output.put(line.rstrip())
    output.put(None)


def _start_tunnel(cloudflared: str, timeout_seconds: float = 45.0) -> tuple[subprocess.Popen[str], str]:
    process = subprocess.Popen(
        [
            cloudflared,
            "tunnel",
            "--url",
            GATEWAY_ORIGIN,
            "--no-autoupdate",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
    )

    output: queue.Queue[str | None] = queue.Queue()
    threading.Thread(
        target=_read_output,
        args=(process, output),
        daemon=True,
    ).start()

    deadline = time.monotonic() + timeout_seconds
    while time.monotonic() < deadline:
        if process.poll() is not None and output.empty():
            raise RuntimeError(f"cloudflared exited with code {process.returncode}")
        try:
            line = output.get(timeout=0.5)
        except queue.Empty:
            continue
        if line is None:
            break
        print(f"[cloudflared] {line}")
        match = TUNNEL_URL_PATTERN.search(line)
        if match:
            return process, match.group(0).rstrip("/")

    process.terminate()
    raise RuntimeError("Timed out waiting for a trycloudflare.com URL")


def _stop_process(process: subprocess.Popen[str]) -> None:
    if process.poll() is not None:
        return
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cloudflared", help="Explicit path to cloudflared executable")
    parser.add_argument(
        "--skip-health-check",
        action="store_true",
        help="Start the tunnel without first checking the local gateway",
    )
    args = parser.parse_args()

    if not args.skip_health_check:
        print(f"[CHECK] Waiting for eFlow gateway at {GATEWAY_HEALTH_URL}")
        _wait_for_gateway()

    cloudflared = _find_cloudflared(args.cloudflared)
    _upsert_config({"ai_endpoint_status": "starting"})
    print(f"[START] Tunneling {GATEWAY_ORIGIN} with {cloudflared}")

    process: subprocess.Popen[str] | None = None
    public_api_endpoint = ""

    def request_shutdown(_signum=None, _frame=None):
        if process:
            _stop_process(process)

    signal.signal(signal.SIGINT, request_shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, request_shutdown)

    try:
        process, tunnel_origin = _start_tunnel(cloudflared)
        public_api_endpoint = f"{tunnel_origin}{PUBLIC_API_SUFFIX}"
        _upsert_config(
            {
                "ai_endpoint": public_api_endpoint,
                "ai_endpoint_status": "online",
            }
        )
        print("[ONLINE] eFlow AI gateway is available at:")
        print(f"         {public_api_endpoint}")
        print("[INFO] Supabase system_config was updated. Press Ctrl+C to stop.")

        return_code = process.wait()
        if return_code != 0:
            print(f"[ERROR] cloudflared exited with code {return_code}", file=sys.stderr)
            return return_code
        return 0
    except KeyboardInterrupt:
        return 0
    except Exception as exc:
        print(f"[ERROR] {exc}", file=sys.stderr)
        return 1
    finally:
        if process:
            _stop_process(process)
        if public_api_endpoint:
            _mark_offline_if_owner(public_api_endpoint)
            print("[OFFLINE] Published ai_endpoint_status=offline")
        else:
            try:
                _upsert_config({"ai_endpoint_status": "offline"})
            except Exception:
                pass


if __name__ == "__main__":
    raise SystemExit(main())

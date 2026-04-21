#!/usr/bin/env python3
from __future__ import annotations

import os
import shutil
import signal
import subprocess
import sys
import time
from pathlib import Path
from urllib.error import URLError
from urllib.request import urlopen


ROOT_DIR = Path(__file__).resolve().parent
SHUTDOWN_REQUESTED = False


def format_cmd(cmd: list[str]) -> str:
    return " ".join(cmd)


def has_uvicorn(py_cmd: list[str]) -> bool:
    try:
        result = subprocess.run(
            [*py_cmd, "-c", "import uvicorn"],
            cwd=ROOT_DIR / "backend",
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            check=False,
        )
    except OSError:
        return False

    return result.returncode == 0


def resolve_backend_python() -> list[str]:
    candidates: list[list[str]] = []

    override = os.environ.get("BACKEND_PYTHON", "").strip()
    if override:
        candidates.append([override])

    candidates.append([sys.executable])

    python_on_path = shutil.which("python")
    if python_on_path:
        candidates.append([python_on_path])

    if os.name == "nt" and shutil.which("py"):
        candidates.append(["py", "-3"])

    seen: set[str] = set()
    unique_candidates: list[list[str]] = []
    for cmd in candidates:
        key = format_cmd(cmd)
        if key not in seen:
            seen.add(key)
            unique_candidates.append(cmd)

    for cmd in unique_candidates:
        if has_uvicorn(cmd):
            return cmd

    attempted = "\n".join(f"  - {format_cmd(cmd)}" for cmd in unique_candidates)
    raise RuntimeError(
        "Could not find a Python interpreter with uvicorn installed.\n"
        "Set BACKEND_PYTHON to the correct Python executable or install backend deps first.\n"
        "Attempted:\n"
        f"{attempted}"
    )


def request_shutdown(_signum: int, _frame: object) -> None:
    global SHUTDOWN_REQUESTED
    SHUTDOWN_REQUESTED = True


def stop_process(proc: subprocess.Popen[bytes] | None, name: str) -> None:
    if proc is None or proc.poll() is not None:
        return

    print(f"Stopping {name}...")
    proc.terminate()

    try:
        proc.wait(timeout=8)
    except subprocess.TimeoutExpired:
        print(f"{name} did not stop in time; force-killing.")
        proc.kill()
        proc.wait(timeout=3)


def wait_for_backend(
    backend_proc: subprocess.Popen[bytes],
    url: str = "http://127.0.0.1:8000/",
    timeout_seconds: float = 45.0,
) -> None:
    start = time.time()
    while True:
        if SHUTDOWN_REQUESTED:
            raise RuntimeError("Shutdown requested while waiting for backend startup")

        exit_code = backend_proc.poll()
        if exit_code is not None:
            raise RuntimeError(f"Backend exited early with code {exit_code}")

        try:
            with urlopen(url, timeout=2.0) as response:
                if 200 <= response.status < 500:
                    return
        except URLError:
            pass

        if time.time() - start > timeout_seconds:
            raise TimeoutError(
                f"Backend did not become ready within {timeout_seconds:.0f}s"
            )

        time.sleep(0.5)


def main() -> int:
    signal.signal(signal.SIGINT, request_shutdown)
    signal.signal(signal.SIGTERM, request_shutdown)

    backend_python = resolve_backend_python()
    print(f"Using backend Python: {format_cmd(backend_python)}")

    backend_cmd = [
        *backend_python,
        "-m",
        "uvicorn",
        "app.main:app",
        "--reload",
        "--port",
        "8000",
    ]
    if os.name == "nt":
        frontend_cmd = [os.environ.get("ComSpec", "cmd.exe"), "/c", "npm", "run", "dev"]
    else:
        frontend_cmd = ["npm", "run", "dev"]

    backend_proc: subprocess.Popen[bytes] | None = None
    frontend_proc: subprocess.Popen[bytes] | None = None

    try:
        print("Starting backend on http://localhost:8000 ...")
        backend_proc = subprocess.Popen(backend_cmd, cwd=ROOT_DIR / "backend")

        print("Waiting for backend to become ready...")
        wait_for_backend(backend_proc)
        print("Backend is ready.")

        print("Starting frontend on http://localhost:5173 ...")
        try:
            frontend_proc = subprocess.Popen(frontend_cmd, cwd=ROOT_DIR / "frontend")
        except FileNotFoundError as exc:
            print(
                "Could not start frontend process. Make sure Node.js and npm are installed and on PATH."
            )
            print(f"Command attempted: {' '.join(frontend_cmd)}")
            raise RuntimeError("Frontend launch failed") from exc

        print("Both services started. Press Ctrl+C to stop both.")

        while True:
            if SHUTDOWN_REQUESTED:
                print("Shutdown requested. Stopping services...")
                break

            backend_exit = backend_proc.poll()
            frontend_exit = frontend_proc.poll()

            if backend_exit is not None:
                print(f"Backend exited with code {backend_exit}.")
                break

            if frontend_exit is not None:
                print(f"Frontend exited with code {frontend_exit}.")
                break

            time.sleep(0.4)
    finally:
        stop_process(frontend_proc, "frontend")
        stop_process(backend_proc, "backend")

    if backend_proc and backend_proc.returncode not in (None, 0):
        return int(backend_proc.returncode)
    if frontend_proc and frontend_proc.returncode not in (None, 0):
        return int(frontend_proc.returncode)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

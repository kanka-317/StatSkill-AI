import os
import sys

port = os.environ.get("PORT", "8000")
app_dir = "backend" if os.path.exists(os.path.join("backend", "app", "main.py")) else "."

# Add app_dir to sys.path
backend_abs = os.path.abspath(app_dir)
if backend_abs not in sys.path:
    sys.path.insert(0, backend_abs)

if __name__ == "__main__":
    import uvicorn
    from app.main import app
    print(f"[*] Starting StatSkill AI backend on port {port} (app_dir={app_dir})...")
    uvicorn.run(app, host="0.0.0.0", port=int(port))

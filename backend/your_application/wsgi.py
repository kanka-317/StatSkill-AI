# Fallback wrapper for Render's default start command in backend/
import os
import sys

backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

port = os.environ.get("PORT", "8000")

try:
    print(f"[*] your_application.wsgi invoked: redirecting to uvicorn on port {port}...")
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port)])
except Exception as e:
    from app.main import app as application

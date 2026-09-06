# Fallback wrapper for Render's default start command (gunicorn your_application.wsgi)
import os
import sys

# Ensure backend directory is in python path
backend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)
root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

port = os.environ.get("PORT", "8000")

# If invoked directly via gunicorn on Render, seamlessly replace process with uvicorn
try:
    print(f"[*] your_application.wsgi invoked: redirecting to uvicorn on port {port}...")
    os.execvp("uvicorn", ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", str(port)])
except Exception as e:
    # In case execvp fails on certain platforms, import the FastAPI app
    from app.main import app as application

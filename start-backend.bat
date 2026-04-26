@echo off
cd /d %~dp0/backend
python -m uvicorn main:app --reload --port 8000
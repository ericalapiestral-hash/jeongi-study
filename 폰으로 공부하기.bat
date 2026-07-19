@echo off
chcp 65001 >nul
title 전기산업기사 스터디 - 폰 접속 서버
cd /d "%~dp0"
python serve.py
if errorlevel 1 pause

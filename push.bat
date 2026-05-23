@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ===== 推送中... =====
git push
if %errorlevel% equ 0 (
    echo ===== 推送成功！GitHub Actions 会自动部署 =====
) else (
    echo ===== 推送失败！请检查代理/VPN 是否开启 =====
)
pause

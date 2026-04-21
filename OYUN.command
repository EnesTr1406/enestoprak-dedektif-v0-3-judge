#!/bin/bash
# ============================================
# 🔍 DEDEKTİF - OYUN BAŞLATICI
# Çift tıklayarak oyunu başlatın.
# ============================================
cd "$(dirname "$0")"

# Terminal sekmesinde ikonlu başlık göster
printf "\033]0;🔍 DEDEKTİF\007"

echo ""
echo "╔══════════════════════════════════╗"
echo "║        🔍  DEDEKTİF  🔍         ║"
echo "║     Oyun başlatılıyor...        ║"
echo "╚══════════════════════════════════╝"
echo ""

is_terminal_mode_enabled() {
	case "${DEDEKTIF_ENABLE_TERMINAL:-}" in
		1|true|TRUE|yes|YES|on|ON)
			return 0
			;;
	esac
	[[ -f ".dedektif_terminal_enabled" ]]
}

print_terminal_mode_disabled() {
	echo "Terminal modu varsayilan olarak kapali."
	echo "Gecici acmak icin: DEDEKTIF_ENABLE_TERMINAL=1 ./OYUN.command terminal"
	echo "Kalici acmak icin: touch .dedektif_terminal_enabled"
}

MODE="$1"
if [[ "$MODE" == "terminal" || "$MODE" == "cli" ]]; then
	if ! is_terminal_mode_enabled; then
		print_terminal_mode_disabled
		exit 1
	fi
	shift
	python3 GAME/terminal_oyun.py --mode interactive "$@"
elif [[ "$MODE" == "auto" || "$MODE" == "oto" ]]; then
	if ! is_terminal_mode_enabled; then
		print_terminal_mode_disabled
		exit 1
	fi
	shift
	python3 GAME/terminal_oyun.py --mode auto "$@"
else
	python3 GAME/baslat.py
fi

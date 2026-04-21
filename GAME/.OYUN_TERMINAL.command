#!/bin/bash
cd "$(dirname "$0")/.."

is_terminal_mode_enabled() {
	case "${DEDEKTIF_ENABLE_TERMINAL:-}" in
		1|true|TRUE|yes|YES|on|ON)
			return 0
			;;
	esac
	[[ -f ".dedektif_terminal_enabled" ]]
}

if ! is_terminal_mode_enabled; then
	echo "Terminal modu varsayilan olarak kapali."
	echo "Gecici acmak icin: DEDEKTIF_ENABLE_TERMINAL=1 ./GAME/.OYUN_TERMINAL.command"
	echo "Kalici acmak icin: touch .dedektif_terminal_enabled"
	exit 1
fi

printf "\033]0;🔍 DEDEKTİF TERMİNAL\007"
python3 GAME/terminal_oyun.py --mode interactive "$@"
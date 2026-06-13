# xano-apollo-webflow-engine
# Run `make help` to see available commands

.PHONY: help check verify-apollo verify-sheet open-sheet open-apollo

help:
	@echo ""
	@echo "  xano-apollo-webflow-engine — available commands"
	@echo ""
	@echo "  make check          Run all connection checks"
	@echo "  make verify-apollo  Open Apollo visitor tracking settings"
	@echo "  make verify-sheet   Remind you how to verify the Google Sheet"
	@echo "  make open-sheet     Open the XYZ leads sheet in browser"
	@echo "  make open-apollo    Open Apollo website visitors in browser"
	@echo ""

check: verify-apollo verify-sheet
	@echo "✓ Check complete — confirm Active status in Apollo and rows in Sheet"

verify-apollo:
	@echo "→ Apollo: go to Website Visitors → Settings → Test Connection"
	@open "https://app.apollo.io/#/settings/website-visitors" 2>/dev/null || \
	echo "  Open: https://app.apollo.io/#/settings/website-visitors"

verify-sheet:
	@echo "→ Google Sheet: confirm Xano is writing rows to the leads tab"
	@echo "  Sheet ID should be set in Xano env vars as GOOGLE_SHEET_ID"

open-apollo:
	@open "https://app.apollo.io/#/settings/website-visitors" 2>/dev/null || \
	echo "Open: https://app.apollo.io/#/settings/website-visitors"

open-sheet:
	@echo "Set your sheet URL in this Makefile under open-sheet to enable this"

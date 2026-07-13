# AGENT.md

Diese Datei richtet sich an Coding-Agenten und Agenten-Tools, die nicht automatisch `CLAUDE.md` lesen.

**Die vollständige Referenz steht in [CLAUDE.md](CLAUDE.md)** – Architektur, Kommandos, das Portal-Adapter-Muster und die verbindlichen Agent-Regeln. Vor jeder Änderung in diesem Repo dort Abschnitt 5 („Agent-Regeln“) lesen; die Regeln sind bindend (u. a.: niemals ohne wörtliches „JA SENDEN“ absenden, kein Captcha-/Login-Bypass, keinen Wert `REQUEST_DELAY_MS` unter 2000).

## Quickstart

```bash
npm install && npx playwright install chromium   # einmalig
npm run setup       # interaktiver Assistent: schreibt .env, legt cv/ an
npm run scrape      # Stepstone durchsuchen, bewerten, speichern
npm run web         # Web-Hub: http://localhost:4317
npm run typecheck && npm test   # vor und nach jeder Änderung grün halten
```

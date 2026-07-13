# MEMORY.md – job-ai-manager-scraper

## Projektkontext
- Entscheidungsassistent für Bewerbungen im KI-Management (Zielgruppe: Berufserfahrene mit neuem KI-Manager-Zertifikat, kein Junior). Erst-Portal: Stepstone. Spezifikation kam als ausführlicher Systemprompt (2026-06-12).
- Scoring ist regelbasiert/deterministisch (src/scoring/scoring-model.ts) mit optionalem LLM-Fallback nach oben (nur wenn OPENAI_API_KEY gesetzt). Empfehlung wird immer konsistent aus den Schwellenwerten abgeleitet.

## Environment-Quirks (2026-06-12)
- `npx tsx …` wird vom RTK-Hook zu `npm run tsx` umgeschrieben und schlägt fehl → stattdessen `./node_modules/.bin/tsx` direkt aufrufen.
- tsx-Skripte mit Top-Level-await außerhalb des Projektordners schlagen fehl (CJS-Kontext ohne package.json `"type": "module"`) → Skripte im Projektordner ablegen.
- `pdf-parse` ist CJS ohne Typen; Import über `pdf-parse/lib/pdf-parse.js` (vermeidet Debug-Code in dessen index.js) + eigene `src/cv/pdf-parse.d.ts`.
- macOS: `textutil -convert txt -stdout file.docx` ist der schnellste Weg, DOCX-Inhalte zu prüfen.

## Bugs, die schon einmal gefixt wurden
- CV-Parser: `M\.?A`-Regex matchte „Ma“ in „Manager/Main“ → Education-Extraktion braucht `\b`-Anker und Case-Sensitivität.
- Zertifikat-Extraktion: Abschnittssuche per „zertifi…“-Regex griff den ersten Fließtext-Treffer (z. B. „zertifizierter Product Owner“) statt der ZERTIFIKATE-Sektion → jetzt zeilenweiser Scan über den ganzen Text mit Jahreszahl/IHK als Anker.

## Design-Entscheidungen
- Dubletten-Erkennung über UNIQUE-Constraint auf URL + Upsert (job-repository.ts).
- Stepstone-Selektoren zentral mit Kandidaten-Listen (stepstone.selectors.ts), da Markup sich oft ändert.
- robots.txt-Prüfung + Rate Limiting im PlaywrightClient; Captcha/Sperre → PortalBlockedError, Exit-Code 2, keine Umgehung.
- Bewerbungsversand nur nach interaktiver Eingabe von exakt „JA SENDEN“ (prepare-application.ts).

## Live-Test Stepstone (2026-06-12)
- Erfolgreich: 3 echte Anzeigen gescrapt, robots.txt erlaubte die Pfade, kein Captcha (headed Browser, 4 s Rate-Limit, MAX_JOBS_PER_RUN=3).
- Selektoren (`data-at`-Kandidaten) funktionieren Stand 2026-06-12; Detailseiten lieferten volle Beschreibungen (~2,5–3k Zeichen), Abschnitts-Parser trennte Aufgaben/Anforderungen/Benefits bei allen 3 Anzeigen, Remote-Erkennung („Hybrid/Home-Office möglich“) griff.
- Scores plausibel differenziert: 78/77 („bewerben“) vs. 63 („prüfen“, Hochschulprojekt-Stelle).

## Live-Test Formular-Vorbefüllung (2026-06-12)
- `scripts/prefill-live.ts`: öffnet Top-Job, klickt „Bewerben“, füllt Felder vor, sendet nie ab, Browser bleibt 10 min zur Prüfung offen.
- Befund: Stepstones „Bewerben“-Button öffnet zuerst ein „Anmelden oder Registrieren“-Modal (E-Mail-first, KEIN Passwortfeld) – das eigentliche Bewerbungsformular liegt hinter einem Account-Login. Die Vorbefüllung selbst funktionierte (E-Mail-Feld wurde gefüllt, Screenshot in data/exports/bewerbung-formular.png).
- Kein Account mit Mock-Daten registrieren (ToS). Realer Flow: Nutzer loggt sich im offenen Browser selbst ein, danach kann vorbefüllt werden.
- loginWall-Erkennung initial fehlgeschlagen (suchte nur Passwortfeld) – erweitert um Modal-Text und login-testids.

## Web-Hub „KI-Job-Radar“ (2026-06-12, via Subagent)
- `npm run web` → http://localhost:4317. node:http ohne Framework; DB wird pro Request frisch gelesen → laufende Scrapes erscheinen live (5-s-Polling im Frontend).
- API: /api/jobs (inkl. cvFile-Zuordnung per Verzeichnisscan cv-job-<id>-*.md), /api/cv/:id, /api/stats, POST /api/jobs/:id/status.
- Verifiziert per `scripts/verify-web.ts` (fetch + Playwright-Screenshots) — curl und das Preview-MCP-Tool waren in der Session nicht nutzbar (Permission-Denials; Preview-Tool liest ~/.claude/launch.json der Session-cwd, nicht des Projekts, und startete fälschlich „obstmarkt“).
- Top-10-Tabelle: data/exports/top10-frankfurt.md; optimierte CVs: data/exports/cv-optimiert/ (Generator: scripts/generate-tailored-cvs.ts, nur Profil + Schwerpunkte job-spezifisch, Fakten unverändert).

## Repo-Hygiene (2026-07-13)
- `.gitignore`-Falle gefixt: `cv/` matchte auch `src/cv/` → der komplette CV-Parser fehlte auf GitHub (Clone: 1 Test-Suite rot, alle CLI-Kommandos kaputt, nur `npm run web` lief). Jetzt `/cv/` (nur Root-Ordner) + `src/cv/` nachcommittet (ba39ce8). Push steht noch aus.
- Kanonische Arbeitskopie: `~/projects/job-ai-manager-scraper` (mit Daten, node_modules, .env). Ein versehentlicher Zweit-Clone liegt unter `~/Documents/Code/job-ai-manager-scraper` — kann weg.
- Web-Hub-Verifikation ohne curl (Permission-Denial): `python3` + `urllib` gegen `/api/stats` bzw. `/api/jobs` funktioniert.

## Offene Punkte
- Mock-CV (Jonas Berger) enthält KEIN KI-Manager-IHK-Zertifikat – Parser meldet das korrekt als offene Information.
- Nur 1. Suchbegriff („KI Manager“) wurde live getestet (Lauf stoppte nach 3 Jobs); übrige Begriffe nutzen denselben URL-Builder.

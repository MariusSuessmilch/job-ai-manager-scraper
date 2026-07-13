# job-ai-manager-scraper

Findet, bewertet und priorisiert Stellenanzeigen für den Einstieg ins **KI-Management** – gedacht für Berufserfahrene mit frischem KI-Manager-Zertifikat (z. B. IHK). Das Werkzeug ist ein **Entscheidungsassistent**, kein Auto-Bewerber: Es schlägt vor, welche Stellen sich lohnen und warum, und bewirbt sich nie von selbst.

Ziel-Arbeitsmarkt ist Deutschland; Start-Portal ist **Stepstone** (stepstone.de). Was die Automatisierung genau tut und bewusst nicht tut: siehe [AUTOMATION.md](AUTOMATION.md).

## Schnellstart

Voraussetzung: Node.js ≥ 20.

```bash
git clone <repo-url>
cd job-ai-manager-scraper
npm install
npx playwright install chromium   # Browser fürs Scraping
npm run setup                     # interaktiver Einrichtungs-Assistent, schreibt .env
```

`npm run setup` fragt die wichtigsten Einstellungen ab, schreibt daraus eine `.env` und legt den Ordner `cv/` an. Danach:

```bash
# eigenen Lebenslauf nach cv/ legen (PDF, DOCX, MD oder TXT)
npm run scrape   # Stepstone durchsuchen, Stellen bewerten und speichern
npm run web      # Web-Hub öffnen: http://localhost:4317
```

## Auf die eigene Situation anpassen

`npm run setup` fragt die folgenden Werte interaktiv ab und schreibt sie in die `.env`. Du kannst sie dort auch jederzeit von Hand ändern.

| Variable | Wirkung |
|---|---|
| `CV_FILE_PATH` | Pfad zum eigenen Lebenslauf (PDF/DOCX/MD/TXT). Grundlage für den CV-Abgleich beim Scoring. |
| `DEFAULT_LOCATION` | Wunsch-Standort (z. B. `Frankfurt am Main`). Leer = Standort wird neutral bewertet. |
| `DEFAULT_RADIUS_KM` | Suchradius um den Standort in Kilometern (Standard `50`). |
| `REMOTE_PREFERENCE` | `remote`, `hybrid` oder `onsite`. Leer = keine Präferenz, Arbeitsmodell neutral bewertet. |
| `SEARCH_TERMS` | Eigene Suchbegriffe, kommasepariert. Leer = eingebaute Standardliste (KI Manager, AI Transformation Manager, KI Governance u. a.). |
| `APPLICANT_FIRST_NAME` / `APPLICANT_LAST_NAME` / `APPLICANT_EMAIL` / `APPLICANT_PHONE` | Eigene Bewerberdaten. Werden **nur lokal** zum Vorbefüllen von Formularen genutzt, nie automatisch versendet. Fehlen sie, nutzt das Vorbefüllen Demodaten (Jonas Berger). |
| `OPENAI_API_KEY` | Optional. Aktiviert das semantische LLM-Scoring. Ohne Key läuft das regelbasierte, deterministische Scoring. |

Weitere Feineinstellungen (`REQUEST_DELAY_MS`, `MAX_JOBS_PER_RUN`, `ENABLE_HEADLESS`, `LLM_MODEL` u. a.) stehen kommentiert in der `.env` bzw. in [.env.example](.env.example).

## Nutzung

```bash
npm run setup    # interaktiver Einrichtungs-Assistent (schreibt .env, legt cv/ an)
npm run cv       # Lebenslauf einlesen und strukturiertes Profil anzeigen
npm run scrape   # Stepstone durchsuchen, Stellen bewerten und speichern
npm run score    # gespeicherte Stellen (erneut) bewerten, z. B. nach CV-Update
npm run report   # Markdown-Report + CSV aus der Datenbank erzeugen
npm run web      # Web-Hub mit Live-Tabelle, KPIs und Status-Verwaltung (localhost:4317)
npm run prefill  # Bewerbungsformular der bestbewerteten Stelle vorbefüllen (sendet nichts)
```

`npm run prefill` öffnet standardmäßig die höchstbewertete Stelle. Eine bestimmte Stelle wählst du über ihre ID:

```bash
npm run prefill -- --job 36
```

Die ID einer Stelle zeigen der Report `data/exports/report.md` (Spalte „ID“), der Web-Hub (`npm run web`, Spalte „#“) und die CSV `data/exports/jobs.csv`. Das Vorbefüllen öffnet einen sichtbaren Browser, füllt erkennbare Felder mit deinen Daten aus der `.env` vor, macht einen Screenshot nach `data/exports/` und **sendet nichts ab**. Details siehe [docs/bewerben-mit-agent.md](docs/bewerben-mit-agent.md).

Ergebnisse:

- `data/jobs.sqlite` – alle Stellen mit Score, Begründung, Status, Muss-/Kann-Kriterien
- `data/exports/report.md` – Übersichtstabelle (mit Job-ID) + Top-Empfehlungen mit Begründung
- `data/exports/jobs.csv` – tabellarischer Export (mit Job-ID)

## Bewerbungsformulare mit einem Coding-Agenten ausfüllen

Du kannst die Bewerbungsvorbereitung von Hand starten (`npm run prefill`) oder einem Coding-Agenten wie Claude Code überlassen. Der Agent öffnet den Browser, klickt „Bewerben“ und füllt die Felder mit deinen Daten vor – abgeschickt wird nie automatisch. Die Schritt-für-Schritt-Anleitung mit kopierbaren Beispiel-Prompts steht in [docs/bewerben-mit-agent.md](docs/bewerben-mit-agent.md).

## Grenzen & Regeln

- **Stepstone-Markup ändert sich.** Alle Selektoren liegen zentral in `src/portals/stepstone/stepstone.selectors.ts` (mehrere Kandidaten pro Element). Wenn die Suche keine Treffer-Elemente findet, zuerst dort nachjustieren.
- **Blockaden werden nicht umgangen.** Bei Captcha oder robots.txt-Sperre bricht der Lauf mit Exit-Code 2 ab; Alternativen stehen in [AUTOMATION.md](AUTOMATION.md).
- **Bewerbungen werden nie automatisch versendet** – Versand nur nach wörtlicher Bestätigung („JA SENDEN“).
- **Keine Umgehung von Login oder Captcha.** Verlangt Stepstone einen Login, meldet das Werkzeug das ehrlich; einloggen tust du selbst im geöffneten Browser.
- **Keine Konto-Registrierung.** Das Werkzeug legt nie ein Nutzerkonto bei einem Portal an.
- Das regelbasierte Scoring ist bewusst transparent statt perfekt; für feinere semantische Bewertung einen LLM-Key konfigurieren.
- Standort- und Remote-Angaben ohne Nutzerpräferenz werden neutral (5/10) bewertet; ohne erkennbares KI-Zertifikat im CV wird dies als offene Information markiert.

## Tests & Typecheck

```bash
npm test            # Vitest: Scoring, CV-Parser, Stepstone-Parser, Config, Setup (32 Tests)
npm run typecheck   # tsc --noEmit
```

## Projektstruktur

```text
src/
  index.ts                 CLI (scrape | score | report | cv)
  config/config.ts         .env-Konfiguration (Zod-validiert)
  types.ts                 Datenmodelle (Jobs, CV-Profil, Score, Status)
  browser/                 Playwright-Wrapper (Rate Limiting, robots.txt)
  portals/stepstone/       Adapter, Selektoren, Parser
  cv/                      Lebenslauf einlesen (PDF/DOCX/MD/TXT) + strukturieren
  scoring/                 Regelbasiertes Modell + optionaler LLM-Scorer
  storage/                 SQLite + Repository (Dubletten-sicher per URL)
  application/             Bewerbungs-Dossier + Formular-Vorbereitung
  web/                     Lokaler Web-Hub (localhost:4317)
  utils/                   Logger, CSV-/Markdown-Export
scripts/
  setup.ts                 interaktiver Einrichtungs-Assistent
  prefill-live.ts          Bewerbungsformular vorbefüllen (sendet nichts)
docs/
  bewerben-mit-agent.md    Anleitung: Formulare mit einem Coding-Agenten ausfüllen
tests/                     Vitest-Tests (Scoring, CV, Parser, Config, Setup)
```

Für Coding-Agenten (Claude Code u. a.) liegt in [CLAUDE.md](CLAUDE.md) eine kompakte Projekt- und Regel-Referenz; [AGENT.md](AGENT.md) verweist andere Agenten-Tools dorthin.

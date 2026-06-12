# job-ai-manager-scraper

Findet, analysiert und bewertet Stellenanzeigen für den Einstieg ins **KI-Management** – gedacht für Berufserfahrene mit neuem KI-Manager-Zertifikat (z. B. IHK), die ihre erste dedizierte KI-Rolle suchen. Start-Portal: **Stepstone**.

Was die Automatisierung tut (und was bewusst nicht): siehe [AUTOMATION.md](AUTOMATION.md).

## Setup

Voraussetzungen: Node.js ≥ 20.

```bash
npm install
npx playwright install chromium   # Browser für das Scraping
cp .env.example .env
```

In der `.env` mindestens den Lebenslauf angeben:

```env
CV_FILE_PATH=/pfad/zu/lebenslauf.docx   # PDF, DOCX, MD oder TXT
DEFAULT_LOCATION=Frankfurt am Main      # optional, leer = neutral bewertet
REMOTE_PREFERENCE=hybrid                # optional: remote | hybrid | onsite
```

Optional für semantisches LLM-Scoring (`OPENAI_API_KEY`, `LLM_MODEL`) – ohne Key wird das regelbasierte, deterministische Scoring genutzt.

## Nutzung

```bash
npm run cv       # Lebenslauf einlesen und strukturiertes Profil anzeigen
npm run scrape   # Stepstone durchsuchen, Stellen bewerten und speichern
npm run score    # Gespeicherte Stellen (erneut) bewerten, z. B. nach CV-Update
npm run report   # Markdown-Report + CSV aus der Datenbank erzeugen
```

Ergebnisse:

- `data/jobs.sqlite` – alle Stellen mit Score, Begründung, Status, Muss-/Kann-Kriterien
- `data/exports/report.md` – Übersichtstabelle + Top-Empfehlungen mit Begründung
- `data/exports/jobs.csv` – tabellarischer Export

## Tests & Typecheck

```bash
npm test            # Vitest: Scoring, CV-Parser, Stepstone-Parser (21 Tests)
npm run typecheck
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
  utils/                   Logger, CSV-/Markdown-Export
tests/                     Vitest-Tests (Scoring, CV, Parser)
```

## Grenzen & Annahmen

- **Stepstone-Markup ändert sich.** Alle Selektoren liegen zentral in `src/portals/stepstone/stepstone.selectors.ts` (mehrere Kandidaten pro Element). Wenn die Suche keine Treffer-Elemente findet, zuerst dort nachjustieren.
- **Blockaden werden nicht umgangen.** Bei Captcha/robots.txt-Sperre bricht der Lauf mit Exit-Code 2 ab; Alternativen stehen in [AUTOMATION.md](AUTOMATION.md).
- **Bewerbungen werden nie automatisch versendet** – Versand nur nach wörtlicher Bestätigung („JA SENDEN").
- Das regelbasierte Scoring ist bewusst transparent statt perfekt; für feinere semantische Bewertung LLM-Key konfigurieren.
- Standort-/Remote-Angaben ohne Nutzerpräferenz werden neutral (5/10) bewertet; ohne erkennbares KI-Zertifikat im CV wird dies als offene Information markiert.

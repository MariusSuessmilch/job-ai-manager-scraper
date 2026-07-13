# CLAUDE.md – Leitfaden für Coding-Agenten (job-ai-manager-scraper)

Diese Datei gibt Coding-Agenten den nötigen Kontext, um das Projekt zu verstehen, auszuführen, zu erweitern und zu debuggen. Prosa für Endnutzer steht in [README.md](README.md); die verbindlichen Sicherheitsregeln in Abschnitt 5 gelten für jeden Agenten, der in diesem Repo arbeitet.

## 1. Projektüberblick

Deterministischer (optional LLM-gestützter) Job-Scraper und Scoring-Assistent für Berufserfahrene, die ins KI-Management wechseln. Das Werkzeug durchsucht Job-Portale, vergleicht Anzeigen mit dem Lebenslauf und vergibt einen Score (0–100) aus Rollenpassung, Erfahrungslevel-Fit, CV-Match und weiteren Kriterien. Es ist ein Entscheidungsassistent und bewirbt sich nie von selbst.

**Tech-Stack:** TypeScript, Node.js ≥ 20, Playwright, Zod, better-sqlite3, Vitest. Ausführung über `tsx` (siehe npm-Scripts).

## 2. Architektur

Der Code ist streng nach Verantwortung modularisiert:

- `src/index.ts` – CLI-Einstieg (`scrape`, `score`, `report`, `cv`).
- `src/config/config.ts` – `.env`-Konfiguration, Zod-validiert. Einzige Quelle für Konfigurationswerte.
- `src/types.ts` – Datenmodelle (Jobs, CV-Profil, Score, Status).
- `src/browser/` – Playwright-Wrapper mit eingebautem Rate Limiting und robots.txt-Prüfung.
- `src/portals/` – Portal-Adapter (aktuell `stepstone`). Jeder implementiert `JobPortalAdapter`.
- `src/cv/` – Parser für PDF, DOCX, MD, TXT; erzeugt strukturierte Profile.
- `src/scoring/` – regelbasierter Scorer (`score-job.ts`) + optionaler LLM-Scorer (`llm-scorer.ts`).
- `src/storage/` – SQLite-Repository, Dubletten-sicher per URL.
- `src/application/` – Bewerbungs-Dossier und Formular-Vorbereitung (`prepare-application.ts`).
- `src/web/` – lokaler Web-Hub auf `http://localhost:4317` zur Ansicht und Status-Verwaltung.
- `src/utils/` – Logger, CSV-/Markdown-Export.
- `scripts/setup.ts` – interaktiver Einrichtungs-Assistent (schreibt `.env`, legt `cv/` an).
- `scripts/prefill-live.ts` – öffnet den Browser und befüllt ein Bewerbungsformular vor; sendet nichts.

## 3. Kommandos & Dev-Workflow

```bash
npm install && npx playwright install chromium   # einmalig
npm run setup       # interaktiver Assistent: schreibt .env, legt cv/ an
npm run cv          # Lebenslauf einlesen, strukturiertes Profil anzeigen
npm run scrape      # Stepstone durchsuchen, bewerten, in SQLite speichern
npm run score       # gespeicherte Stellen neu bewerten (z. B. nach CV-Update)
npm run report      # Markdown-Report + CSV nach data/exports/ schreiben
npm run web         # Web-Hub starten (http://localhost:4317)
npm run prefill     # Formular der bestbewerteten Stelle vorbefüllen; --job <id> für konkrete Stelle
npm run typecheck   # tsc --noEmit
npm test            # Vitest
```

**Workflow-Regel:** Vor und nach jeder Änderung `npm run typecheck` und `npm test` ausführen. Beide müssen grün bleiben. Für neue Parsing- oder Scoring-Logik immer Tests ergänzen oder anpassen.

## 4. Neues Job-Portal hinzufügen

Wenn ein neues Portal (z. B. LinkedIn, Indeed) gewünscht ist, exakt diesem Muster folgen:

1. Neues Verzeichnis anlegen: `src/portals/<portal-name>/`.
2. Drei Dateien hinzufügen:
   - `<portal-name>.adapter.ts` – implementiert das Interface `JobPortalAdapter`.
   - `<portal-name>.selectors.ts` – CSS-Selektoren des Portals (mehrere Kandidaten pro Element für Robustheit).
   - `<portal-name>.parser.ts` – Funktion, die `JobDetails` aus dem rohen Seiten-DOM extrahiert.
3. Adapter in `src/index.ts` (bzw. der Portal-Factory) registrieren.
4. Portal-spezifische Tests unter `tests/portals/<portal-name>.parser.test.ts` ergänzen.
5. **Kritisch:** `REQUEST_DELAY_MS` respektieren, um IP-Sperren zu vermeiden. Keine Captchas umgehen – bei Blockade mit klarer Fehlermeldung und Exit-Code 2 sauber abbrechen.

Alle Adapter teilen dieselbe Schnittstelle:

```typescript
interface JobPortalAdapter {
  name: string;
  searchJobs(query: JobSearchQuery): Promise<JobListing[]>;
  fetchJobDetails(url: string): Promise<JobDetails>;
}
```

Scoring, Speicherung und Reports laufen ohne Änderung weiter.

## 5. Agent-Regeln (VERBINDLICH)

Diese Regeln gelten ausnahmslos. Sie schützen den Nutzer und die Portale und sind nicht verhandelbar.

- **Niemals automatisch absenden.** Ein Bewerbungsformular wird nur abgeschickt, wenn der Mensch es wörtlich mit „JA SENDEN" bestätigt. Ohne diese wörtliche Bestätigung wird niemals gesendet – auch nicht „zur Sicherheit" oder „als Test".
- **Keine Captcha- oder Login-Umgehung.** Verlangt das Portal einen Login oder zeigt ein Captcha, wird das ehrlich gemeldet und der Lauf bricht ab. Der Mensch loggt sich selbst im geöffneten Browser ein.
- **Keine Konto-Registrierung.** Der Agent legt keine Nutzerkonten bei Portalen an und registriert sich nirgends.
- **`REQUEST_DELAY_MS` nie unter 2000 senken.** Der Standard ist 4000. Niedrigere Werte nur nach ausdrücklicher Nutzerfreigabe und niemals unter 2000.
- **Bewerberdaten nur aus der `.env` lesen.** Vor- und Nachname, E-Mail, Telefon kommen ausschließlich aus `APPLICANT_*` über `src/config/config.ts`. Niemals im Code hartkodieren.
- **Keine echten Personendaten in Commits oder Logs.** Lebenslauf-Volltext, echte Bewerberdaten und API-Keys gehören nicht in Commits, Logs oder Testfixtures. Der `cv/`-Ordner ist per `.gitignore` ausgeschlossen.
- **Keine erfundenen CV-Inhalte.** CV-Optimierungsvorschläge gewichten nur vorhandene Erfahrung um; sie erfinden keine Stationen oder Skills.

## 6. Weitere Best Practices

- **Deterministisch zuerst.** Regelbasiertes Scoring hat Vorrang; der LLM-Scorer ist eine optionale Ergänzung.
- **Typsicherheit.** Neue Datenstrukturen in `src/types.ts` definieren und mit Zod validieren.
- **Datenbank.** Das bestehende Repository-Muster in `src/storage/` nutzen; kein rohes SQL inline, außer es ist unumgänglich.
- **Konfiguration.** Alle Werte über `src/config/config.ts` (Zod). Keine Secrets im Code.

## 7. Umgebungsvariablen (`.env`)

Vollständig kommentiert in [.env.example](.env.example). Die wichtigsten:

| Variable | Bedeutung |
|---|---|
| `CV_FILE_PATH` | Pfad zum Lebenslauf (PDF/DOCX/MD/TXT). Grundlage fürs Scoring. |
| `DEFAULT_LOCATION` | Wunsch-Standort. Leer = Standort neutral bewertet. |
| `DEFAULT_RADIUS_KM` | Suchradius in km (Standard 50). |
| `REMOTE_PREFERENCE` | `remote` \| `hybrid` \| `onsite` \| leer (neutral). |
| `SEARCH_TERMS` | Suchbegriffe, kommasepariert. Leer → `DEFAULT_SEARCH_TERMS` aus `config.ts`. |
| `APPLICANT_FIRST_NAME` / `APPLICANT_LAST_NAME` / `APPLICANT_EMAIL` / `APPLICANT_PHONE` | Bewerberdaten, nur lokal fürs Vorbefüllen. Fehlen Vorname oder E-Mail, nutzt `prefill` Demodaten (Jonas Berger). |
| `OPENAI_API_KEY` / `OPENAI_BASE_URL` / `LLM_MODEL` | Optional; aktiviert semantisches LLM-Scoring. |
| `ENABLE_HEADLESS` | `false` = sichtbarer Browser (zum Debuggen). Standard `false`. |
| `REQUEST_DELAY_MS` | Wartezeit zwischen Seitenaufrufen (Standard 4000). Nie unter 2000 – siehe Abschnitt 5. |
| `MAX_JOBS_PER_RUN` | Obergrenze verarbeiteter Stellen pro Lauf (Standard 50). |
| `DATABASE_URL` | Pfad zur SQLite-Datei (Standard `./data/jobs.sqlite`). |
| `STEPSTONE_BASE_URL` | Basis-URL des Portals (Standard `https://www.stepstone.de`). |

## 8. Troubleshooting

- **„Keine Elemente gefunden" auf Stepstone** – Selektor-Drift. `src/portals/stepstone/stepstone.selectors.ts` prüfen und die Kandidaten-Arrays aktualisieren.
- **Captcha oder Blockade** – der Lauf beendet mit Exit-Code 2. Captchas nicht programmatisch lösen. Dem Nutzer raten, mit `ENABLE_HEADLESS=false` manuell zu prüfen oder auf manuelle Dateneingabe + `npm run score` zu wechseln.
- **SQLite-Locks** – sicherstellen, dass kein zweiter Prozess (z. B. der Web-Hub) einen Schreib-Lock hält, während CLI-Befehle laufen. Web-Hub und schreibende CLI-Befehle nicht gleichzeitig ausführen.

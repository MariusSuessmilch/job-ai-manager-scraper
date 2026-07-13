# Job-Automatisierung für KI-Manager-Stellen

## Zweck der Automatisierung

Diese Anwendung sucht passende Stellenanzeigen für Menschen, die **bereits Berufserfahrung haben** (z. B. in Projektmanagement, Beratung, IT oder Führung) und **neu in den Bereich KI-Management einsteigen** wollen – typischerweise nach einem frisch erworbenen KI-Manager-Zertifikat (z. B. IHK).

Wichtig: Diese Zielgruppe ist **kein Junior-Profil**. Die Software sucht deshalb gezielt Stellen, die vorhandene Berufserfahrung anerkennen – und sortiert sowohl echte Einsteigerjobs als auch hochspezialisierte Technik- oder Senior-KI-Rollen aus.

Die Anwendung ist kein reiner Job-Scraper, sondern ein **Entscheidungsassistent für Bewerbungen**: Der wichtigste Output ist eine nachvollziehbare Priorisierung – welche Stellen lohnen sich, warum, und wo gibt es Lücken.

## Was geprüft wird

Jede gefundene Stelle bekommt einen Score von 0 bis 100, zusammengesetzt aus sechs Kriterien:

| Kriterium | Punkte | Frage dahinter |
|---|---:|---|
| Rollenpassung | 0–25 | Passt die Rolle zu KI-Management (Einführung, Strategie, Governance, Change)? |
| Erfahrungslevel-Fit | 0–20 | Wird vorhandene Berufserfahrung anerkannt? Nicht zu juniorig, nicht zu seniorig? |
| CV-Match | 0–25 | Passt der Lebenslauf zur Ausschreibung (Erfahrung, Branchen, Skills)? |
| Technischer Fit | 0–10 | Sind die technischen Anforderungen realistisch (KI-Verständnis statt ML-Engineering)? |
| Bewerbungswahrscheinlichkeit | 0–10 | Wie realistisch ist eine erfolgreiche Bewerbung? |
| Standort-/Arbeitsmodell-Fit | 0–10 | Passt Standort, Remote oder Hybrid zu den eigenen Vorgaben? |

Die Bewertung erfolgt **nicht nur über Keywords**: Signale werden über Titel und Volltext ausgewertet, positive wie negative, und jede Teilnote wird im Ergebnis einzeln begründet. Eine Stelle kann gut abschneiden, auch wenn „KI-Manager" nicht im Titel steht, solange Aufgaben und Anforderungen passen. Optional kann eine LLM-Schnittstelle (OpenAI-kompatibel) für eine noch feinere semantische Bewertung konfiguriert werden.

Empfehlungs-Schwellenwerte:

- **85–100**: Sehr gute Passung, Bewerbung klar empfohlen
- **70–84**: Gute Passung, Bewerbung empfohlen
- **55–69**: Möglich, aber genauer prüfen
- **40–54**: Schwache Passung, nur bei besonderem Interesse
- **0–39**: Nicht empfohlen

## Welche Portale genutzt werden

Aktuell unterstützt:

- **Stepstone** (stepstone.de)

Weitere Portale können später als eigene Adapter ergänzt werden, zum Beispiel:

- LinkedIn Jobs
- Indeed
- XING Jobs
- Bundesagentur für Arbeit
- JOIN
- Firmenkarriereseiten

## Wie die Automatisierung funktioniert

1. Der Nutzer gibt einen Lebenslauf an (PDF, DOCX, Markdown oder Text).
2. Die Software öffnet mit Playwright einen Browser.
3. Die Software sucht auf Stepstone nach passenden Begriffen („KI Manager", „AI Transformation Manager", „KI Governance" u. a.). Diese Begriffe sind über `SEARCH_TERMS` in der `.env` konfigurierbar (kommasepariert; leer = eingebaute Standardliste).
4. Die Software liest Stellenanzeigen aus (Titel, Unternehmen, Standort, Aufgaben, Anforderungen, Benefits).
5. Die Software vergleicht jede Stelle mit dem Lebenslauf.
6. Die Software berechnet einen Score von 0 bis 100 – mit Begründung pro Kriterium.
7. Die Software speichert die Ergebnisse in einer lokalen Datenbank (SQLite).
8. Der Nutzer sieht in einem Markdown-Report und einer CSV-Datei, welche Stellen sich lohnen.
9. Optional kann die Software Bewerbungsunterlagen vorbereiten (Dossier mit Stärken, Lücken, CV-Hinweisen).
10. Eine Bewerbung wird **nur nach ausdrücklicher Bestätigung** durch den Nutzer abgeschickt.

## Was die Automatisierung nicht tut

- Sie **bewirbt sich nicht ohne Freigabe**. Formulare werden höchstens vorbereitet; der Versand verlangt eine wörtliche, interaktive Bestätigung („JA SENDEN").
- Sie **erfindet keine Lebenslaufinhalte**. CV-Optimierungsvorschläge gewichten nur vorhandene Erfahrungen anders.
- Sie **umgeht keine Sicherheitsmechanismen**. Erkennt sie Captchas oder Zugriffssperren, bricht sie sauber ab.
- Sie **garantiert keine Einladung** zum Gespräch.
- Sie **ersetzt keine menschliche Prüfung** – jede Empfehlung ist eine begründete Vorauswahl, keine Entscheidung.
- Sie **ignoriert keine Nutzungsbedingungen der Portale**: robots.txt wird vor jedem Aufruf geprüft, zwischen Seitenaufrufen wird gewartet (Rate Limiting), und es werden nur Daten gespeichert, die für den Bewerbungsprozess nötig sind.

## Wenn Stepstone blockiert

Sollte Stepstone den automatisierten Zugriff technisch (Captcha, Zugriffssperre) oder per robots.txt verhindern, schlägt die Anwendung **sauber fehl** (Exit-Code 2) und umgeht die Blockade nicht. Alternativen:

- **Manuelle Nutzung**: Stellen im Browser suchen, interessante Anzeigen als Text/PDF speichern und später nur die Bewertung (`npm run score`) nutzen.
- **Browser-gestützte Nutzung**: Suche von Hand durchführen, die Software nur für Bewertung und Verwaltung verwenden.
- **Spätere API-/Partner-Integrationen**: Offizielle Schnittstellen (z. B. Bundesagentur für Arbeit) als zusätzliche Adapter anbinden.

## Erweiterbarkeit

Jedes Portal ist ein eigener Adapter unter `src/portals/`:

```text
src/portals/stepstone/
src/portals/linkedin/
src/portals/indeed/
```

Jeder Adapter implementiert dieselbe Schnittstelle:

```typescript
interface JobPortalAdapter {
  name: string;
  searchJobs(query: JobSearchQuery): Promise<JobListing[]>;
  fetchJobDetails(url: string): Promise<JobDetails>;
}
```

Ein neues Portal hinzufügen heißt: einen Ordner mit Adapter, Selektoren und Parser anlegen, die Schnittstelle implementieren und den Adapter in `src/index.ts` registrieren. Scoring, Speicherung und Reports funktionieren ohne Änderung weiter.

## Datenhaltung und Datenschutz

- Alle Daten bleiben **lokal** in `data/jobs.sqlite` – nichts wird hochgeladen (Ausnahme: optionales LLM-Scoring, dann gehen Stellen- und CV-*Profil*-Daten an die konfigurierte API).
- Der Lebenslauf wird nie im Volltext geloggt.
- Keine Passwörter im Code; Konfiguration über `.env`.
- Jede Stelle trägt einen Bewerbungsstatus (gefunden → geprüft → … → beworben → Angebot/Absage), Notizen und den letzten Prüfzeitpunkt.

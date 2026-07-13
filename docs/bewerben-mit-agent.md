# Bewerbungsformulare von einem Coding-Agenten ausfüllen lassen

Diese Anleitung zeigt, wie du ein Bewerbungsformular vorbefüllen lässt – von Hand oder mit einem Coding-Agenten wie Claude Code. Du brauchst dafür keine Programmierkenntnisse. Abgeschickt wird nie etwas automatisch; die letzte Kontrolle bleibt immer bei dir.

## Was hier passiert

Das Werkzeug öffnet einen sichtbaren Browser, ruft die Stellenanzeige auf und klickt auf „Bewerben“. Dann füllt es die erkennbaren Formularfelder mit deinen Daten aus der `.env` vor (Vorname, Nachname, E-Mail, Telefon). Danach hält es an: Der Browser bleibt offen, damit du alles in Ruhe prüfst und die Bewerbung – wenn du willst – selbst abschickst. Das Werkzeug sendet nichts.

## Sicherheitsregeln zuerst

> - **Es wird nie automatisch gesendet.** Das Werkzeug füllt nur vor. Der Klick auf „Absenden“ liegt bei dir.
> - **Den Stepstone-Login machst du selbst.** Verlangt Stepstone eine Anmeldung, meldet das Werkzeug das und wartet. Du loggst dich im geöffneten Browser selbst ein.
> - **Keine Konto-Registrierung durch den Agenten.** Der Agent legt kein Nutzerkonto für dich an.
> - **Bei einem Captcha bricht alles sauber ab.** Sicherheitsabfragen werden nicht umgangen.
> - **robots.txt und Rate-Limiting werden respektiert.** Blockiert robots.txt die Anzeige, bricht das Werkzeug sauber ab (Exit-Code 2) – nichts wird umgangen. Zwischen Seitenaufrufen wird gewartet.

## Weg A: ohne Agent, direkt über die Kommandozeile

Öffne ein Terminal im Projektordner und führe aus:

```bash
npm run prefill
```

Das öffnet die höchstbewertete Stelle aus deiner Datenbank. Möchtest du eine bestimmte Stelle vorbefüllen, gib ihre ID an:

```bash
npm run prefill -- --job 42
```

Die ID einer Stelle findest du im Report `data/exports/report.md` (Spalte „ID“), im Web-Hub (`npm run web`, Spalte „#“) und in der CSV `data/exports/jobs.csv`.

Was danach passiert:

- Ein sichtbarer Browser öffnet die Anzeige und klickt „Bewerben“.
- Erkennbare Felder werden mit deinen Daten aus der `.env` vorbefüllt.
- Ein Screenshot wird unter `data/exports/bewerbung-formular.png` gespeichert.
- Der Browser bleibt **10 Minuten** offen, damit du prüfen und selbst absenden kannst. Es wird nichts abgeschickt.

## Weg B: mit einem Coding-Agenten (z. B. Claude Code)

Ein Coding-Agent kann dieselben Schritte für dich ausführen und dir dabei erklären, was er sieht. Claude Code installierst du so:

```bash
npm install -g @anthropic-ai/claude-code   # Claude Code installieren
cd job-ai-manager-scraper                  # in den Projektordner wechseln
claude                                      # Agent im Projektordner starten
```

Die offizielle Installations- und Einrichtungsanleitung steht unter https://docs.anthropic.com/claude-code.

Starte den Agenten immer **im Projektordner**. Dann liest er automatisch die Datei `CLAUDE.md` und kennt damit die Sicherheitsregeln dieses Projekts.

Beispiel-Prompts zum Kopieren:

```text
Führe npm run prefill für Job 42 aus und beschreibe mir den Screenshot.
```

```text
Scrape neu und zeig mir die Top 5 Stellen.
```

```text
Bereite ein Bewerbungs-Dossier für Job 42 vor.
```

Du kannst frei formulieren. Der Agent hält sich an die Regeln aus `CLAUDE.md`, auch wenn du es nicht ausdrücklich verlangst.

## Was der Agent NICHT tun wird

Der Agent schickt keine Bewerbung ab, solange du ihn nicht wörtlich mit **„JA SENDEN“** dazu aufforderst. Das ist Absicht: Eine Bewerbung ist eine Entscheidung, die du treffen sollst – nach einem Blick auf das ausgefüllte Formular, nicht auf gut Glück. Der Agent bereitet vor, du entscheidest.

Ebenso wird der Agent kein Captcha umgehen, keinen Login für dich fälschen und kein Konto registrieren.

## FAQ

**Stepstone zeigt eine Login-Wand („Anmelden oder Registrieren“, „Weiter mit E-Mail“). Was tun?**
Lass den Agenten diese Buttons nicht anklicken. Logge dich selbst im geöffneten Browser mit deinem eigenen Stepstone-Konto ein. Danach ist das Bewerbungsformular erreichbar und kann vorbefüllt werden.

**Woher kommen die Job-IDs?**
Aus dem Report `data/exports/report.md` (Spalte „ID“), dem Web-Hub (`npm run web`, Spalte „#“) oder der CSV `data/exports/jobs.csv`. Report und CSV erzeugen `npm run scrape` und `npm run report`. Ohne `--job` nimmt `npm run prefill` automatisch die bestbewertete Stelle – dann brauchst du keine ID.

**Demodaten oder meine eigenen Daten?**
Sind in der `.env` `APPLICANT_FIRST_NAME` und `APPLICANT_EMAIL` gesetzt, werden deine eigenen Daten eingetragen. Fehlt eines davon, nutzt das Vorbefüllen Demodaten (Jonas Berger) und weist im Log darauf hin. Deine Daten setzt du am einfachsten mit `npm run setup` oder direkt in der `.env`.

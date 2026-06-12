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

## Offene Punkte
- Live-Lauf gegen Stepstone wurde bewusst nicht ausgeführt (kein externer Aufruf in der Session); Selektoren sind Best-Effort und müssen beim ersten echten Lauf ggf. nachjustiert werden.
- Mock-CV (Jonas Berger) enthält KEIN KI-Manager-IHK-Zertifikat – Parser meldet das korrekt als offene Information.

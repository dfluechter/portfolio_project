# Sicherheitsrichtlinie & Schutzkonzept

Sicherheit folgt im Portfolio-Projekt dem Prinzip der **Defense-in-Depth**. Dieses Dokument beschreibt die Sicherheitsmechanismen, Zugriffsbeschränkungen und Schutzregeln.

---

## 1. Strikt geschützter Quellordner für Zertifikate (Read-Only)

> [!CAUTION]
> **Höchste Priorität für alle Agenten, Skripte und Entwickler:**
> Der Quellordner unter `CERTIFICATES_PATH` in der `.env`-Datei ist **STRIKT READ-ONLY**.

- **Verbotene Aktionen**:
  - Niemals Dateien ändern, überschreiben, umbenennen oder verschieben.
  - Niemals Dateien oder Unterordner löschen (weder per Script noch Shell).
- **Erlaubte Aktionen**:
  - Ausschließlich lesender Zugriff (Berechnung des SHA-256 Hashes, OCR-Textextraktion, Streaming in S3-Upload-Puffer).
  - Quelldateien verbleiben unberührt am Ursprungsort.

---

## 2. API- und Zugriffs-Sicherheit

1. **Custom User Model & Single-User Prinzip**:
   - Die Anmeldung erfolgt ausschließlich über eine verifizierte E-Mail-Adresse (`portfolio.User`, kein `username`).
   - Die Registrierung (`POST /api/auth/users/`) ist über `IsAdminUser` gesperrt. Neue Benutzer können nur über die CLI via `createsuperuser` erzeugt werden.
2. **Passwort-Reset & Session-Sync**:
   - Bietet einen Single-User-Reset-Flow über das Login-Modal und eine gesicherte Bestätigungsseite (`/password-reset/confirm/:uid/:token`).
   - Bei abgelaufenem Refresh-Token sichert ein Axios-Interceptor den sauberen Logout via `auth:unauthorized`.
3. **JWT-Laufzeiten & Auto-Revocation**:
   - Access-Token: 60 Minuten Gültigkeit.
   - Refresh-Token: 7 Tage Gültigkeit mit atomarer Token-Rotation.
4. **Schreibschutz für Provider**:
   - `Provider` mit verknüpften Zertifikaten sind durch `on_delete=models.PROTECT` vor versehentlichem Löschen geschützt. Löschanfragen antworten mit `409 Conflict`.
5. **Track-Pflicht für Veröffentlichungen**:
   - Ein Zertifikat kann nur auf `is_published=True` gesetzt werden, wenn mindestens ein `Track` zugewiesen ist, um unkategorisierte Veröffentlichungen auszuschließen.

---

## 3. Datei-Upload-Härtung & Magic-Byte Prüfung

Beim Direct-to-Storage Upload nach Supabase S3 vertraut das Backend keinem Client-Payload:
- **Existenz & Größenprüfung**: Vor der Registrierung prüft das Backend via S3 `head_object`, ob die Datei existiert und maximal 10 MB groß ist.
- **Header-Magic-Byte Validierung**:
  - Das Backend liest die ersten 2048 Bytes des Objekts per S3-Range-Request (`bytes=0-2047`).
  - Es verifiziert die echten Dateisignaturen (`%PDF`, `\x89PNG`, `\xFF\xD8\xFF`).
  - Manipulierte Dateien mit vorgetäuschten Dateiendungen werden mit `400 Bad Request` abgewiesen.
- **SHA-256 Prüfsummen-Abgleich**: Der Hash wird serverseitig berechnet und abgeglichen.

---

## 4. KI-Sicherheits-Guardrails & Zero-Cost Circuit Breaker

Zum Schutz vor Missbrauch des Chat-Endpunkts (`POST /api/ai/chat/`):
- **Pre-Flight Filterung**: Regex-Filter prüfen auf Jailbreak- und Injection-Muster.
- **0-Token Drop**: Bei verdächtigen Eingaben wird kein Request an Google Gemini gesendet. Die API antwortet defensiv, wodurch 0 API-Kosten und 0 Token-Verbrauch anfallen.
- **Striker Fakten-Rahmen**: Systemprompts instruieren das Modell, ausschließlich im bereitgestellten Portfolio-Kontext zu antworten und keine externen Fakten zu erfinden.

---

## 5. Responsible Disclosure

Sicherheitsrelevante Schwachstellen können vertraulich gemeldet werden:
- **Kontakt**: `security@dfluechter.ipv64.de` oder direkt via GitHub Security Advisories.
- Es wird gebeten, keine Sicherheitslücken in öffentlichen GitHub Issues zu posten.

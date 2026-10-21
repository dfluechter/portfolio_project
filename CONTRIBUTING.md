# Leitfaden für Mitwirkende (Contributing Guidelines)

Herzlich willkommen! Wir freuen uns sehr, dass du an unserem Portfolio-Projekt mitwirken möchtest. Jede Unterstützung – ob das Beheben von Fehlern, das Verbessern der Dokumentation oder das Vorschlagen neuer Features – hilft uns, dieses Projekt noch besser zu machen.

Bitte nimm dir kurz Zeit, diesen Leitfaden durchzulesen, um einen reibungslosen und effizienten Ablauf bei der Zusammenarbeit zu gewährleisten.

---

## 📜 Verhaltenskodex (Code of Conduct)
Mit deiner Teilnahme an diesem Projekt verpflichtest du dich, einen respektvollen, professionellen und integrativen Umgangston zu pflegen. Belästigungen, Beleidigungen oder ungebührliches Verhalten werden in keiner Weise toleriert.

---

## 🛡️ Sicherheitslücken melden
**Wichtig:** Wenn du eine Sicherheitslücke entdeckst, erstelle bitte **kein öffentliches GitHub-Issue**. Befolge stattdessen die Richtlinien in unserer [`SECURITY.md`](SECURITY.md), um die Schwachstelle vertraulich über GitHubs *Private Vulnerability Reporting* zu melden.

---

## 💡 Wie kann ich beitragen?

### 1. Fehler melden (Bugs)
Wenn du einen Fehler im Code findest, durchsuche bitte zuerst unsere bestehenden Issues, um Duplikate zu vermeiden. Falls das Problem neu ist, erstelle ein neues Issue und stelle folgende Details bereit:
* Eine klare und prägnante Beschreibung des Fehlers.
* Schritte zur Reproduktion des Fehlers.
* Das erwartete Verhalten und das tatsächliche Verhalten.
* Relevante Log-Dateien, Fehlermeldungen oder Screenshots.

### 2. Features vorschlagen
Du hast eine Idee für eine neue Funktion? Großartig! Erstelle ein Issue und beschreibe:
* Welches Problem das neue Feature löst.
* Wie die Umsetzung deiner Meinung nach aussehen könnte.
* Eventuelle Alternativen, die du in Betracht gezogen hast.

### 3. Pull Requests (PRs) einreichen
Bevor du mit dem Schreiben von Code beginnst, stelle sicher, dass es ein entsprechendes Issue gibt oder erstelle eines, um deine Idee vorab mit uns zu besprechen. 

Befolge für deinen PR diese Schritte:
1. Forke das Repository und erstelle einen eigenen Feature-Branch (z. B. `feat/mein-neues-feature` oder `fix/login-fehler`).
2. Implementiere deine Änderungen. Schreibe passende Tests für neue Logik.
3. Stelle sicher, dass die lokalen Qualitätsgatter (Linter, Formatter, Tests) grün sind.
4. Sende einen Pull Request gegen den `main`-Branch unseres Repositories.

---

## 💻 Lokales Setup für Entwickler

Um die Entwicklungsumgebung lokal aufzusetzen, benötigst du **Python 3.13+**, den Paketmanager **[uv](https://docs.astral.sh/uv/)** sowie **Node.js 20+** (inklusive npm).

### 1. Repository vorbereiten
```bash
git clone https://github.com/dein-username/portfolio_project.git
cd portfolio_project
```

### 2. Backend (Django REST API)
Installiere die Python-Abhängigkeiten und richte die Datenbank ein:
```bash
# Virtuelle Umgebung erstellen und Pakete installieren
uv sync

# Migrationen ausführen (lokale SQLite-Datenbank wird erstellt)
uv run python manage.py migrate

# Lokalen Admin-Benutzer für das Backend anlegen
uv run python manage.py createsuperuser
```

### 3. Frontend (React + Vite + TypeScript)
```bash
cd frontend
npm install
npm run dev
```

---

## 🚦 Qualitätsgatter & Code-Standards

Unser Repository verwendet automatisierte Gates, um eine gleichbleibend hohe Code-Qualität zu sichern. Jede Pull Request wird in unserer GitHub-CI-Pipeline auf diese Standards geprüft.

### 1. Code-Formatierung (.editorconfig & Ruff)
* Dein Editor sollte die Regeln aus der [`.editorconfig`](.editorconfig) automatisch anwenden (4 Spaces für Python, 2 Spaces für TypeScript/React).
* Wir nutzen **Ruff** für das Backend-Linting und -Formatting. Du kannst deinen Code jederzeit manuell prüfen:
  ```bash
  uv run ruff check .
  uv run ruff format .
  ```

### 2. Pre-Commit Hooks (Dringend empfohlen!)
Um zu verhindern, dass fehlerhafter oder schlecht formatierter Code committet wird, solltest du die lokalen Git-Hooks aktivieren:
```bash
# Pre-Commit installieren und aktivieren
pip install pre-commit
pre-commit install --hook-type pre-commit --hook-type commit-msg
```
Die Hooks formatieren deinen Code automatisch beim Ausführen von `git commit` und fangen Fehler ab.

### 3. Conventional Commits
Deine Commit-Nachrichten müssen dem **Conventional Commits**-Standard entsprechen (siehe [`.gitmessage`](.gitmessage) für die genaue Struktur). Dies wird lokal über `commitlint` erzwungen.
* *Beispiel:* `feat(auth): implement JWT token rotation`
* *Beispiel:* `fix(api): correct project image upload validation`

### 4. Tests ausführen (pytest)
Bevor du deine Änderungen pushst, führe bitte die Test-Suite aus. Wir streben eine Testabdeckung von mindestens **95%** an:
```bash
uv run pytest --cov=portfolio
```

---

## 🔍 Der Pull Request- & Review-Prozess

* **Review-Pflicht:** Jede Pull Request erfordert mindestens ein genehmigtes Review (Approval) eines Maintainers, bevor sie gemergt werden kann.
* **Separation of Duties:** Du kannst deine eigenen Änderungen nicht selbst freigeben oder mergen.
* **Status Checks:** Alle Prüfungen im GitHub-Workflow (CI) müssen fehlerfrei durchlaufen (grün sein).
* **Aufräumen:** Sobald dein PR erfolgreich gemergt wurde, löschen wir den Feature-Branch, um das Repository sauber zu halten.

Vielen Dank für deine Unterstützung und viel Spaß beim Coden! 🚀

# Ingredient Scanner

Eine React-App zum Scannen von Zutatenlisten mit der Kamera.

## 🚀 Features

- 📱 **Kamera-Scanner** - Direkte Kamera-Aktivierung beim App-Start
- 🔄 **Multi-Kamera-Support** - Wechsel zwischen verfügbaren Kameras
- 🎯 **Scan-Fenster** - Visueller Guide für optimale Aufnahme
- 📸 **Foto-Aufnahme** - Hochqualitative Bilder im JPEG-Format
- 📱 **Responsive Design** - Optimiert für mobile Geräte

## 🛠️ Technologie-Stack

- **React 18** mit TypeScript
- **Vite** für schnelle Entwicklung
- **react-webcam** für Kamera-Funktionalität
- **GitHub Pages** für Deployment

## 🚀 Lokale Entwicklung

```bash
# Abhängigkeiten installieren
npm install

# Entwicklungsserver starten
npm run dev

# Build für Produktion
npm run build

# Code-Qualität prüfen
npm run lint
```

## 🌐 Deployment

Die App wird automatisch über GitHub Actions auf GitHub Pages deployed.

### GitHub Pages manuell aktivieren:

1. **Repository öffnen** → `https://github.com/rostigerloeffel/ingredients-scan`
2. **Settings** → **Pages** (in der linken Seitenleiste)
3. **Source** → **GitHub Actions** auswählen
4. **Save** klicken
5. **Warten** - Die erste Deployment kann 2-3 Minuten dauern

**Nach der Aktivierung:**
- Die App wird unter `https://rostigerloeffel.github.io/ingredients-scan/` verfügbar sein
- Jeder Push auf den `main` Branch löst automatisch ein neues Deployment aus
- GitHub Actions werden im **Actions** Tab angezeigt

### Troubleshooting:

Falls GitHub Pages nicht funktioniert:
1. Überprüfen Sie die **Actions** → **Deploy to GitHub Pages**
2. Stellen Sie sicher, dass **Settings** → **Pages** → **Source** auf **GitHub Actions** steht
3. Warten Sie 5-10 Minuten nach der ersten Aktivierung

## 📱 Verwendung

1. **App öffnen** - Kamera wird automatisch aktiviert
2. **Zutatenliste positionieren** - Im Scan-Fenster platzieren
3. **Foto aufnehmen** - "Zutatenliste scannen" Button drücken
4. **Bild überprüfen** - Vorschau des aufgenommenen Bildes
5. **Neuer Scan** - "Neuen Scan starten" für weitere Aufnahmen

## 🔧 Entwicklung

Die App ist in TypeScript geschrieben und verwendet moderne React-Patterns:

- **Komponenten-basierte Architektur**
- **TypeScript** für Typsicherheit
- **CSS Modules** für Styling
- **Responsive Design** für alle Geräte

## 📄 Lizenz

MIT License

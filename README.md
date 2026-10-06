# mminteractive

TYPO3-14.3-Extension (Vendor **Mikelmade**, Key `mminteractive`): Bild hochladen,
verlinkte Bereiche (Rechteck, Kreis, Polygon, Freihand) direkt auf dem Bild
einzeichnen, mit der Maus verschieben/skalieren und je Bereich Link, Rahmen und
Hintergrund für **Normal / Hover / Mousedown** festlegen – alles auf einer Seite,
ohne Modalfenster. 

## Bedienung

1. Modul **Mikelmade → Imagemaps** öffnen, Seite/Sysordner im Seitenbaum wählen. Die
   Liste zeigt zu jeder Imagemap ein **Thumbnail**, Titel, Anzahl Bereiche sowie
   **Bearbeiten** und **Löschen**. **Neue Imagemap** legt einen neuen Datensatz an.
2. Titel eingeben, im Editor **Bild hochladen**. Das Bild wird sofort angezeigt
   (kein vorheriges Speichern nötig).
3. Werkzeug wählen (Rechteck, Kreis, Polygon, Freihand) und auf dem Bild
   zeichnen. Bereiche lassen sich auswählen, per Maus verschieben und über
   Ziehpunkte skalieren; **Mehrfachauswahl** mit Shift/Strg-Klick, Auswahlrahmen
   oder Strg+A (gemeinsam verschieben/löschen, Pfeiltasten, Entf).
4. Unter dem Bild die Eigenschaften des gewählten Bereichs:
   - **Bezeichner** (eigener Name, unabhängig vom Titel; wird als `data-name`
     ausgegeben), Tooltip-Text (kleiner Rich-Text-Editor, siehe unten),
     **Own Style** (freier CSS-Text, siehe unten)
   - **Link mit dem TYPO3-Link-Dialog** (Seite, Datei, URL, E-Mail …)
   - je Zustand **Normal / Hover / Mousedown**: Rahmenfarbe, Rahmenstil,
     Rahmenbreite, Hintergrundfarbe, Deckkraft und **Hintergrundbild
     (Upload direkt an der Stelle)**
   - Vorschau der Zustände im Editor („Vorschau: Normal/Hover/Mousedown“)
5. Mit dem normalen **Speichern** des Formulars sichern.
6. Inhaltselement **MM Interactive – Imagemap** (Gruppe „Plugins“) auf einer Seite
   einfügen und die Imagemap auswählen.

## Backend-Modul: eigener Bereich „Mikelmade“

Das Modul hängt nicht mehr unter „Inhalt“, sondern in einem eigenen
Hauptmodul **Mikelmade** (Kennung `mikelmade`, Icon:
`Resources/Public/Icons/mikelmade.svg`); das Imagemap-Modul ist dessen
Untermodul `mikelmade_mminteractive` (Pfad `/module/mikelmade/mminteractive`).
Weitere Mikelmade-Erweiterungen können sich mit `'parent' => 'mikelmade'`
in dieselbe Gruppe einhängen. Das Hauptmodul gibt den Seitenbaum an seine
Untermodule weiter (`@typo3/backend/tree/page-tree-element`), das Modul
arbeitet also weiterhin mit der im Seitenbaum gewählten Seite.

## Löschen

In der Modulübersicht löscht **Löschen** (mit Sicherheitsabfrage) die Imagemap
**und alle zugehörigen Daten**:

- der Datensatz selbst (Titel, Bereiche),
- das Hauptbild,
- **alle** Hintergrundbilder aller Bereiche (Normal/Hover/Mousedown),

alles aus `fileadmin/mminteractive`. Das gilt nur für Bilder, die über diesen
Editor hochgeladen wurden (eindeutige Dateinamen, nicht mit anderen Imagemaps
geteilt) – andere Dateien im Ordner bleiben unberührt. Die Löschung ist wie bei
TYPO3-Formularen per Formular-Token abgesichert und erfordert Bearbeitungsrecht
auf die Seite sowie die Tabelle „Imagemap“.

Es gibt **keinen Sichtbarkeits-Status** (kein Verbergen/Zeitsteuerung) – eine
nicht mehr benötigte Imagemap wird gelöscht statt versteckt.

## Speicherung

- **Eigene Datenstruktur:** Bild und Bereiche liegen als ein JSON-Dokument in der
  Spalte `areas` des Imagemap-Datensatzes (keine Kind-Tabelle, keine
  FAL-Relationen): `{"image": {"file","width","height"}, "areas": [...]}`.
- **Bilder** (Hauptbild und Hintergrundbilder) werden über einen eigenen
  Upload-Endpunkt in **`fileadmin/mminteractive`** abgelegt (Ordner wird bei Bedarf
  angelegt). Geschrieben wird über die FAL-Speicher-API: Ordnerrechte,
  Dateiendungs-Regeln und Namensbereinigung von TYPO3 gelten. Erlaubt sind
  jpg, jpeg, png, gif, webp (max. 20 MB, der Inhalt muss zur Endung passen).
  Im JSON steht nur die Referenz (`1:/mminteractive/name.png`).
- Nicht-Admins brauchen Schreibrechte auf den Ordner (Dateimount), das Modul
  „Imagemaps“, die Tabelle „Imagemap“ und Seitenrechte. Löschen erfordert
  zusätzlich Bearbeitungsrecht auf die jeweilige Seite.
- Das **Thumbnail** in der Übersicht wird über die reguläre FAL-Bildbearbeitung
  (zugeschnittene Vorschau) aus dem Hauptbild erzeugt.

## Link-Dialog

Das Link-Feld ist ein **echtes TYPO3-Link-Feld** (FormEngine), das der Editor in das
Panel des gewählten Bereichs einbettet; der Dialog ist also der Standard-TYPO3-
Link-Browser. Falls sich das Feld in einer TYPO3-Version nicht rendern lässt, zeigt
der Editor stattdessen ein Textfeld (`t3://page?uid=12`, `https://…`, `mailto:…`).
Das Formular bleibt in jedem Fall benutzbar.

## Frontend

Reines SVG + CSS (`:hover`/`:active`), kein JavaScript nötig, **responsive**
(skaliert fluid über `viewBox`, nie größer als das Originalbild).

- „Mousedown“ entspricht `:active` und wird – wie im Browser – zusätzlich zu
  Hover angewendet. Hover/Mousedown überschreiben nur, was dort gesetzt ist
  (Farbe leer / Breite 0 / Deckkraft leer = Wert bleibt).
- Hintergrund: Farbe (mit Deckkraft) liegt unter dem Hintergrundbild; das Bild
  wird auf die Bounding-Box des Bereichs gestreckt.
- Ein Bereich ohne Rahmen und ohne Hintergrund ist unsichtbar, aber klickbar.
- Rahmenstile: solid/dashed/dotted/none.

## Installation / Update

```bash
composer require mikelmade/mminteractive
```

`composer dump-autoload`, Datenbankschema abgleichen (Wartung → Analyze Database
Structure bzw. `typo3 database:updateschema`), Caches leeren.

## Bekannte TYPO3-14-Falle: Content-Security-Policy blockiert Inline-Styles

Rahmen, Rahmenfarbe, Hintergrundfarbe usw. werden je Bereich über ein
dynamisch erzeugtes `<style>`-Element ausgegeben (die Werte stehen erst zur
Laufzeit fest, können also nicht als externe CSS-Datei ausgeliefert werden).
Ist auf der Website eine nonce-basierte Content-Security-Policy für
`style-src` aktiv, blockiert der Browser dieses `<style>`-Element ohne
gültiges `nonce`-Attribut lautlos – SVG-Form und Link funktionieren dann
weiterhin (nicht von `style-src` betroffen), nur Rahmen/Farbe fehlen.
**Behoben:** Der ViewHelper fragt jetzt das TYPO3-CSP-Nonce aus dem Request
ab (`$request->getAttribute('nonce')`) und setzt es als `nonce="…"` am
`<style>`-Tag, wenn eine Policy das verlangt. Auf Seiten ohne CSP oder mit
permissivem `style-src` ändert sich nichts.

## Drehung

Jeder Bereich (unabhängig von der Form) lässt sich um seinen eigenen
Mittelpunkt drehen:

- per Ziehen am Griff oberhalb der Form (Shift = 15°-Schritte), oder
- über das Zahlenfeld **„Drehung (Grad)“** in den Bereichs-Eigenschaften.

## Punkte zu Polygon/Freihand hinzufügen

Im Editor: gewünschten Polygon- oder Freihand-Bereich auswählen, dann
**Doppelklick auf die Kontur** an der Stelle, an der ein neuer Punkt
entstehen soll. Ein Doppelklick zu weit von der Kontur entfernt fügt nichts
ein (kein versehentliches Hinzufügen durch einen ungenauen Klick).

## Tooltip anpassen

Der Abschnitt **„Tooltip“** ist standardmäßig **aufgeklappt und optisch
abgehoben** (hellblauer Hintergrund), damit er nicht zwischen den
Zustands-Abschnitten (Normal/Hover/Mousedown) übersehen wird. Er erscheint
direkt unter dem Link-Feld, sobald ein Bereich ausgewählt ist – ohne
zusätzlichen Klick.

Jeder Bereich hat einen eigenen, frei gestaltbaren Tooltip (Inhalt = das
Tooltip-Text-Feld, siehe „Tooltip-Text im kleinen Rich-Text-Editor“ unten).
Im Editor unter dem Abschnitt **„Tooltip“**
einstellbar:

- **Rahmen:** Farbe, Breite, Eckenradius, Stil (durchgezogen/gestrichelt/
  gepunktet/keiner)
- **Hintergrund:** Farbe mit Deckkraft (0–100 %, betrifft nur den
  Hintergrund, nicht Text oder Rahmen) sowie ein Hintergrundbild
  (wird wie bei `background-size: cover` zentriert zugeschnitten)
- **Innenabstand (Padding)**
- **Positionierung:**
  - *Dynamisch*: X-/Y-Abstand in px, der dem Mauszeiger folgt
  - *Fest*: X-/Y-Wert in px; bleibt am Bildschirm hängen
    (`position: fixed`), scrollt also **nicht** mit der Seite. Mit
    **Bezugspunkt** wählbar, wovon aus gezählt wird:
    - *Bereich*: ab der linken oberen Ecke des jeweiligen Bereichs
    - *Bild*: ab der linken oberen Ecke des gesamten Bildes – nützlich für
      z. B. „immer oben rechts im Bild“, unabhängig davon, welcher Bereich
      gerade gehovert wird
  - *Fest zum Dokument*: X-/Y-Wert in px, ab dem Dokumentanfang; ein fester
    Punkt auf der **Seite**, unabhängig von Bereich und Mauszeiger
    (`position: absolute`) – scrollt **mit** der Seite, im Unterschied zu
    „Fest“
- **z-index:** Normalerweise nicht nötig zu ändern (Standard: immer ganz
  oben, `2147483647`). Niedrigere (auch negative) Werte lassen andere
  Elemente der Seite über dem Tooltip liegen.
- **Breite/Höhe (px):** Standardmäßig leer = automatische Größe (passt
  sich dem Inhalt an, max. 280px breit). Mit einer festen Breite wird diese
  Begrenzung aufgehoben; eine feste Höhe schneidet zu langen Inhalt ab,
  statt die Box wachsen zu lassen.

Eine **Live-Vorschau direkt im Editor**: Beim Überfahren eines Bereichs im
Auswählen-Modus erscheint der Tooltip exakt so, wie er später im Frontend
aussehen und sich positionieren würde (inklusive Folgen des Mauszeigers im
dynamischen Modus). Eine zusätzliche statische Vorschau im Panel gibt es
bewusst nicht.

**Wichtig – diese Funktion braucht JavaScript im Frontend:** Eine dem
Mauszeiger folgende Position ist mit reinem CSS nicht möglich. Das bisherige
native Browser-Tooltip (`<title>`-Element) wurde durch den neuen, gestylten
Tooltip ersetzt, um doppelte Tooltips zu vermeiden. Ist JavaScript im
Browser des Besuchers deaktiviert, erscheint **kein** Tooltip mehr – alles
andere (Formen, Links, Hover-/Mousedown-Rahmen und -Hintergrund) bleibt
davon unberührt und funktioniert weiterhin rein über CSS. Der zugängliche
Name des Links (`aria-label`) bleibt in jedem Fall erhalten, unabhängig von
JavaScript.

Der Tooltip hat **keine eigene Textfarbe** – Standard ist
weißer Text, passend zum dunklen Standard-Hintergrund. Bei einer selbst
gewählten hellen Hintergrundfarbe bitte auf ausreichenden Kontrast achten.

## Positionierung im Frontend-Plugin

Im Inhaltselement (Reiter des Plugins, Palette **„Position im Dokument"**)
lässt sich festlegen, wie die Imagemap auf der Seite platziert wird:

- **Relativ** (Standard): normaler Textfluss wie bisher. Zusätzlich gibt es
  **Abstand nach oben** und **Abstand nach unten** (px, 0 = kein Abstand).
- **Absolut**: aus dem Textfluss genommen (`position: absolute`), mit
  **X-** (von links) und **Y-Position** (von oben), je in **px oder %**.
  Bezugspunkt ist der nächste positionierte Vorfahre bzw. die Seite;
  scrollt mit der Seite.
- **Fixed**: wie Absolut, aber am Bildschirm fixiert (`position: fixed`),
  bleibt also beim Scrollen stehen; X/Y beziehen sich auf das Browserfenster.

Je nach gewählter Positionierung werden nur die passenden Felder gezeigt
(Abstände bei „Relativ", X/Y bei „Absolut"/„Fixed"). Ein leeres X oder Y
wird einfach nicht gesetzt. Bestehende Inhaltselemente sind „Relativ" ohne
Abstände und sehen unverändert aus.

## Own Style

Ein eigener Akkordeonpunkt **„Own Style"** als letzter Tab, nach „Mousedown"
– eine kleine Textarea für freie CSS-Deklarationen, die für
den **gesamten Bereich** gelten (nicht nur für einen einzelnen Zustand),
z. B.:

```
opacity: 0.8;
transform: rotate(2deg);
```

Das ist bewusst ein Fluchtventil ohne Positivliste (anders als beim
Tooltip-Text) – alle CSS-Eigenschaften sind erlaubt, auch solche, die über
die strukturierten Felder (Rahmen, Hintergrund, Rotation, …) nicht
abgebildet werden können. Das ist unproblematisch, weil der Text in einen
CSS-Kontext (`<style>`) eingebettet wird, nicht in HTML – die
Markup-Injection-Risiken des Tooltip-Textes gelten hier nicht.

**Wichtig zu wissen:** Der Inhalt eines
`<style>`-Elements ist für den Browser reiner Text bis zum ersten
wörtlichen `</style` – ließe man das durch, könnte darüber das Element
vorzeitig beendet und beliebiges HTML/Skript angehängt werden. Dieses
eine Muster (sowie, als zusätzliche Vorsichtsmaßnahme, die inzwischen in
Browsern wirkungslosen alten CSS-Skript-Vektoren `expression()` und
`javascript:`) wird beim Rendern entfernt; alles andere bleibt
unverändert erhalten.

Ersetzt das bisherige, jetzt entfernte Feld „CSS-Klasse" (wurde nicht
benötigt).

## Tooltip-Text im kleinen Rich-Text-Editor

Der Tooltip-Text wird nicht mehr über das Feld „Titel / Tooltip" gepflegt
(das gibt es nicht mehr) – statt dessen gibt es im Tooltip-Abschnitt ein
kleines, eingebettetes Rich-Text-Feld mit einer schlanken Werkzeugleiste:

- **Absatzformat:** Normal oder Überschrift H1–H4
- **Schriftart:** Auswahl aus gängigen Schriftarten (Arial, Georgia, Times
  New Roman, Courier New, Verdana, Tahoma, Trebuchet MS)
- **Schriftfarbe:** Farbwähler
- **Fett, Kursiv, Unterstrichen**
- **Link einfügen** (fragt nach der Ziel-URL)
- **Bild einfügen:** lädt ein Bild hoch (wie bei den Hintergrundbildern,
  nach `fileadmin/mminteractive`) und fügt es an der Cursor-Position ein
- **Bilder verschieben:** läuft über das native Drag-and-Drop von
  `contenteditable` – ein Bild lässt sich wie jeder andere Inhalt an eine
  andere Stelle im Text ziehen, auch **in eine Tabellenzelle hinein**. Es
  gibt dafür keine eigene, freie Positionierung; das Bild bleibt immer Teil
  des normalen Textflusses, genau wie beim Verschieben von Text selbst.
- **Bilder in der Größe verändern:** ein Klick auf ein Bild zeigt vier
  Eckpunkte; Ziehen daran ändert nur Breite/Höhe, verankert an der
  gegenüberliegenden Ecke (die bleibt an Ort und Stelle). **Shift beim
  Ziehen** behält das Seitenverhältnis des Originalbildes bei. Klick
  irgendwo anders wählt das Bild ab.
- **Rechtsklick auf ein Bild:** öffnet ein kleines Menü zum Bearbeiten von
  Rahmenstil, Rahmenbreite, Rahmenfarbe, dem Abstand zwischen Bild und
  Rahmen (CSS `padding`) sowie dem Außenabstand des Bildes zum übrigen
  Inhalt (CSS `margin`).
- **Tabelle einfügen** (Grid-Symbol): fragt nach Zeilen- und Spaltenanzahl
  (max. 10×10)
- **Tabelle löschen** (Grid-Symbol mit rotem Kreuz): entfernt die Tabelle,
  in der der Cursor gerade steht; steht der Cursor in keiner Tabelle,
  erscheint ein Hinweis, es wird nichts gelöscht
- **Rechtsklick auf eine Tabelle:** öffnet ein kleines Menü zum Bearbeiten
  der Tabellenbreite, Rahmenbreite/-farbe (wirkt auf Tabelle und alle
  Zellen, damit der Rahmen wie ein durchgehendes Gitter aussieht) und der
  Breite jeder einzelnen Spalte (wirkt auf alle Zeilen dieser Spalte)
- **Formatierung entfernen**
- **Quelltext-Ansicht** (`</>`): wechselt zwischen der normalen Ansicht und
  dem rohen HTML-Code zum direkten Bearbeiten

Eine **Live-Vorschau** gibt es beim Überfahren der Form im
Auswählen-Modus (zeigt den Tooltip exakt so, wie er später im Frontend
aussehen würde). Eine zusätzliche statische Vorschau im Panel selbst gibt
es bewusst nicht. Im Frontend wird der Inhalt als echtes HTML gerendert
(nicht als reiner Text) – fetter Text ist also tatsächlich fett, Links
sind klickbar.

**Sicherheit:** Beim Speichern wird der Inhalt serverseitig mit PHPs
`DOMDocument` zerlegt und gegen eine Positivliste geprüft:

- Erlaubte Tags: `b`, `strong`, `i`, `em`, `u`, `a`, `br`, `ul`, `ol`, `li`,
  `p`, `span`, `h1`–`h4`, `img`, `table`/`thead`/`tbody`/`tr`/`td`/`th`,
  `font` (Alt-Fallback). Alles andere wird entfernt, der **Inhalt bleibt
  aber erhalten** (z. B. wird aus `<div>Text</div>` einfach `Text`).
- Erlaubte Attribute je Tag: `a` → `href`/`title`/`target`, `img` →
  `src`/`alt`/`title`/`width`/`height`, `font` → `color`/`face`. Alle
  anderen Attribute werden entfernt.
- `style` ist überall erlaubt, aber auf `color`, `font-family`, `width`,
  `height`, `border-width`, `border-style`, `border-color`,
  `border-collapse`, `padding` und `margin` reduziert – alle anderen
  CSS-Eigenschaften (u. a. `position`) werden herausgefiltert. Bilder
  werden ausschließlich über `width`/`height` in der Größe verändert, nie
  positioniert.
- `<script>`- und `<style>`-Inhalte werden vollständig entfernt (nicht nur
  das Tag, auch der Inhalt dazwischen); `javascript:` in `href`/`src` wird
  entschärft.
- Für Screenreader wird zusätzlich eine reine Text-Variante (ohne Markup)
  als `aria-label` ausgegeben.

Tabellen- und Bildrahmen/-größe werden **nicht** über Inline-Styles
gesteuert (die würden durch die `style`-Positivliste sowieso entfernt),
sondern über CSS-Regeln, die überall dort greifen, wo Tooltip-Inhalte
angezeigt werden (Editor-Vorschau und Frontend).

## Hintergrundbild-Optionen (Größe, Seitenverhältnis, Wiederholen)

Für jedes Hintergrundbild (Normal/Hover/Mousedown) stehen zur Verfügung:

- **Bildgröße:**
  - *Strecken* – füllt den Bereich exakt aus, verzerrt bei Bedarf (Standard,
    entspricht dem bisherigen, einzigen Verhalten)
  - *Enthalten (contain)* – passt vollständig in den Bereich, ohne
    zuzuschneiden
  - *Ausfüllen (cover)* – füllt den Bereich vollständig aus, schneidet bei
    Bedarf zu
  - *Original (auto)* – native Bildgröße, kein Skalieren
  - *Benutzerdefiniert* – Breite/Höhe frei wählbar, unabhängig in px oder %
- **Seitenverhältnis beibehalten:** aus (Standard) = wie bisher verzerren;
  an = Bild wird gemäß der gewählten Bildgröße eingepasst (contain/auto/
  benutzerdefiniert) bzw. zugeschnitten (cover, strecken)
- **Wiederholen (Kachel):** Bild wird als Kachel wiederholt statt einmal
  angezeigt; Kachelbreite/-höhe frei in px, leer = Originalgröße des Bildes

**Vererbung:** Zeigt ein Zustand (z. B. Hover) kein eigenes Bild, sondern
übernimmt das von Normal, gelten automatisch auch dessen Größen-/
Wiederholungs-Einstellungen mit – Bild und „wie es dargestellt wird“ gehören
also zusammen und werden nicht getrennt vererbt.

**Rückwärtskompatibel:** Bereiche, die vor dieser Funktion angelegt wurden,
zeigen ihr Hintergrundbild unverändert (Strecken, kein Seitenverhältnis,
keine Wiederholung).

## Lizenz

GPL-2.0-or-later

# Vos photos 360°

Placez ici les photos prises avec votre caméra 360°.

## Format attendu
- **Format équirectangulaire** (ratio 2:1, ex. 5760 × 2880 px). C'est le format
  par défaut exporté par la quasi-totalité des caméras 360 (Insta360, Ricoh
  Theta, GoPro Max, etc.).
- Extension **`.jpg`** de préférence (plus léger que le PNG).
- Astuce : compressez vos images (par ex. avec [squoosh.app](https://squoosh.app))
  pour un chargement rapide, surtout sur mobile.

## Nommage
Nommez chaque fichier d'après la pièce, par exemple :

```
photos/
  salon.jpg
  cuisine.jpg
  chambre.jpg
```

Ces noms doivent correspondre à ceux indiqués dans
`assets/js/tour.js` (champ `panorama`).

## Activer vos photos
Dans `assets/js/tour.js`, passez la ligne :

```js
const MODE_DEMO = true;
```

à :

```js
const MODE_DEMO = false;
```

La visite utilisera alors vos photos au lieu de l'image de démonstration.

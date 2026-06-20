# Visite virtuelle 360° de mon logement

Site web pour présenter un logement à louer grâce à une **visite virtuelle 360°**
(photos prises avec une caméra 360). On tourne la vue à 360° dans chaque pièce
et on passe d'une pièce à l'autre en cliquant sur des flèches au sol.

- Site **statique** : aucun serveur, aucune base de données, aucun build.
- Basé sur [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/) (libre et gratuit).
- Fonctionne sur ordinateur, mobile et tablette.

## Mettre vos propres photos en 3 étapes
1. Ajoutez vos photos 360° dans `photos/` (format équirectangulaire `.jpg`).
2. Décrivez vos pièces dans `assets/js/tour.js` (liste `pieces`).
3. Passez `MODE_DEMO` à `false` en haut de `assets/js/tour.js`.

Personnalisez le titre, le loyer, la description et le contact dans `index.html`.

## Tester en local
Les photos 360 ne se chargent pas en `file://`. Lancez un serveur local :
```bash
python3 -m http.server 8000
```
Puis ouvrez http://localhost:8000

## Mettre en ligne (gratuit)
GitHub Pages : Settings → Pages → branche `main` → dossier racine.

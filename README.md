# Visite virtuelle 360° — site de location

Site web **professionnel** pour présenter un logement à louer en **visite
virtuelle 360°**, avec un **espace d'administration** pour tout gérer sans
toucher au code.

- Site **statique** (GitHub Pages, Netlify…), sans serveur ni base de données.
- Basé sur [Photo Sphere Viewer](https://photo-sphere-viewer.js.org/) (libre, gratuit).
- Responsive : ordinateur, mobile, tablette.

## Le site public (`index.html`)
- Page d'accueil soignée : bandeau, chiffres clés (surface, loyer…), atouts, description.
- Visite 360° avec déplacement entre les pièces (flèches au sol) et points d'info cliquables.
- Sélecteur de pièces, plein écran.
- Formulaire de contact (ouvre votre messagerie) + coordonnées directes.
- Optimisé pour le partage (aperçu WhatsApp / réseaux / annonces).

## L'espace admin (`admin.html`)
Un éditeur visuel **dans le navigateur**, protégé par mot de passe :
- **Le bien** : titre, surface, loyer, charges, DPE, description, atouts, contact…
- **Pièces & photos** : ajouter / supprimer / réordonner les pièces, importer la
  photo 360° de chaque pièce (glisser-déposer), placer les **flèches de
  navigation** et les **points d'info** en cliquant directement dans l'image.
- **Apparence** : couleur du site, mot de passe admin, mode démo.
- **Publier** : génère un pack `.zip` (`tour.json` + photos) prêt à mettre en ligne.

> ⚙️ Comme l'hébergement est statique, l'admin enregistre votre travail dans
> votre navigateur, puis exporte un pack à publier. La sécurité par mot de passe
> est volontairement légère (côté navigateur) : ne mettez pas d'informations
> sensibles. Pour empêcher l'accès public à l'admin, vous pouvez simplement
> supprimer `admin.html` du site en ligne et ne l'utiliser qu'en local.

## Mettre à jour le site (workflow)
1. Ouvrez `admin.html`, faites vos modifications, allez dans **Publier**.
2. Téléchargez le pack `.zip`, décompressez-le dans le dossier `photo360`.
3. Dans Git Bash, depuis `photo360` :
   ```bash
   git add -A
   git commit -m "Mise a jour de la visite"
   git push origin main
   ```
4. Le site se met à jour sur `https://seb0031.github.io/photo360/`.

## Tester en local
Les photos 360° ne se chargent pas en `file://`. Lancez un serveur local :
```bash
python3 -m http.server 8000
```
puis ouvrez <http://localhost:8000> (et <http://localhost:8000/admin.html> pour l'admin).

## Structure
```
index.html            Site public
admin.html            Espace d'administration
tour.json             Données de la visite (généré/édité par l'admin)
assets/css/           Styles (site + admin)
assets/js/            Logique (site + admin)
photos/               Photos 360° des pièces
```

import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';

/* =========================================================================
 *  CONFIGURATION DE LA VISITE
 *  -------------------------------------------------------------------------
 *  C'est le SEUL fichier à modifier pour mettre vos propres pièces.
 *
 *  1) Mettez MODE_DEMO à false une fois vos photos prêtes.
 *  2) Placez vos photos 360° (format équirectangulaire .jpg) dans le
 *     dossier "photos/" (ex : photos/salon.jpg).
 *  3) Pour chaque pièce, renseignez : id, nom, panorama et les "liens"
 *     (links) vers les autres pièces.
 *
 *  Les "links" sont les flèches sur lesquelles on clique pour se déplacer.
 *  - "nodeId"   : l'id de la pièce vers laquelle on va.
 *  - "position" : où placer la flèche, en degrés.
 *        yaw   = orientation horizontale (0 à 360°, sens des aiguilles)
 *        pitch = inclinaison verticale ( -90 = sol, 0 = horizon )
 *    Astuce : laissez la visite ouverte, tournez la vue vers la porte de
 *    la pièce voisine, et ajustez le "yaw" jusqu'à ce que la flèche tombe
 *    au bon endroit.
 * ========================================================================= */

const MODE_DEMO = true;

// Photos de démonstration (pour voir le site fonctionner tout de suite).
const DEMO = 'https://photo-sphere-viewer.js.org/assets/sphere.jpg';

const pieces = [
  {
    id: 'salon',
    nom: 'Salon',
    panorama: MODE_DEMO ? DEMO : 'photos/salon.jpg',
    links: [
      { nodeId: 'cuisine', position: { yaw: '100deg', pitch: '-10deg' } },
      { nodeId: 'chambre', position: { yaw: '260deg', pitch: '-10deg' } },
    ],
  },
  {
    id: 'cuisine',
    nom: 'Cuisine',
    panorama: MODE_DEMO ? DEMO : 'photos/cuisine.jpg',
    links: [
      { nodeId: 'salon', position: { yaw: '280deg', pitch: '-10deg' } },
    ],
  },
  {
    id: 'chambre',
    nom: 'Chambre',
    panorama: MODE_DEMO ? DEMO : 'photos/chambre.jpg',
    links: [
      { nodeId: 'salon', position: { yaw: '80deg', pitch: '-10deg' } },
    ],
  },
];

/* =========================================================================
 *  INITIALISATION (en principe, rien à modifier en dessous)
 * ========================================================================= */

const viewer = new Viewer({
  container: document.querySelector('#visionneuse'),
  loadingTxt: 'Chargement de la visite…',
  navbar: ['zoom', 'move', 'caption', 'fullscreen'],
  defaultZoomLvl: 0,
  plugins: [
    MarkersPlugin,
    [VirtualTourPlugin, {
      positionMode: 'manual',   // déplacement par flèches placées à la main
      renderMode: '3d',         // flèches posées "au sol", style Google Street View
      nodes: pieces.map((p) => ({
        id: p.id,
        panorama: p.panorama,
        name: p.nom,
        caption: p.nom,
        links: p.links,
      })),
      startNodeId: pieces[0].id,
    }],
  ],
});

import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';
import { VirtualTourPlugin } from '@photo-sphere-viewer/virtual-tour-plugin';

/* =========================================================================
 *  Site public : lit les données de tour.json et construit la page + visite.
 *  (Aucune modification nécessaire ici : tout se règle dans l'espace admin.)
 * ========================================================================= */

async function chargerDonnees() {
  // 1) Données enregistrées via l'espace admin (navigateur), prioritaires pour l'aperçu.
  try {
    const local = localStorage.getItem('tour-data');
    if (local) return JSON.parse(local);
  } catch (e) { /* ignore */ }

  // 2) Sinon le fichier publié tour.json.
  try {
    const rep = await fetch('tour.json', { cache: 'no-store' });
    if (rep.ok) return await rep.json();
  } catch (e) { /* ignore (ex. ouverture en file://) */ }

  return null;
}

function texte(sel, valeur) {
  document.querySelectorAll(sel).forEach((el) => { el.textContent = valeur; });
}

function panoramaDe(piece, opts) {
  return opts.demo ? opts.demoPanorama : piece.photo;
}

function remplirInfosBien(data) {
  const b = data.bien || {};
  const o = data.options || {};

  if (o.theme) document.documentElement.style.setProperty('--accent', o.theme);

  document.title = `${b.titre || 'Logement à louer'} — Visite virtuelle 360°`;

  texte('[data-bien="titre"]', b.titre || 'Logement à louer');
  texte('[data-bien="sousTitre"]', b.sousTitre || '');
  texte('[data-bien="type"]', b.type || '—');
  texte('[data-bien="surface"]', b.surface ? `${b.surface} m²` : '—');
  texte('[data-bien="pieces"]', b.pieces ? `${b.pieces} pièces` : '—');
  texte('[data-bien="chambres"]', b.chambres != null ? `${b.chambres}` : '—');
  texte('[data-bien="etage"]', b.etage || '—');
  texte('[data-bien="disponibilite"]', b.disponibilite || '—');
  texte('[data-bien="disponibilite-badge"]', b.disponibilite || 'Disponible');
  texte('[data-bien="dpe"]', b.dpe || '—');
  texte('[data-bien="ville"]', b.ville || '—');
  texte('[data-bien="loyer"]', b.loyer != null ? `${b.loyer} €` : '—');
  texte('[data-bien="charges"]', b.charges != null ? `${b.charges} €` : '—');
  texte('[data-bien="loyerCC"]', b.loyer != null ? `${(b.loyer || 0) + (b.charges || 0)} €` : '—');
  texte('[data-bien="description"]', b.description || '');

  const contact = b.contact || {};
  texte('[data-bien="contact-nom"]', contact.nom || '');
  const email = document.querySelector('[data-bien="contact-email"]');
  if (email) { email.textContent = contact.email || ''; email.href = `mailto:${contact.email || ''}`; }
  const tel = document.querySelector('[data-bien="contact-tel"]');
  if (tel) { tel.textContent = contact.tel || ''; tel.href = `tel:${(contact.tel || '').replace(/\s/g, '')}`; }

  // Atouts
  const ul = document.getElementById('atouts');
  if (ul) {
    ul.innerHTML = '';
    (b.atouts || []).forEach((a) => {
      const li = document.createElement('li');
      li.textContent = a;
      ul.appendChild(li);
    });
  }

  // Formulaire de contact -> mailto pré-rempli
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const sujet = encodeURIComponent(`Demande de visite — ${b.titre || 'logement'}`);
      const corps = encodeURIComponent(
        `Nom : ${fd.get('nom')}\nEmail : ${fd.get('email')}\n\n${fd.get('message')}`
      );
      window.location.href = `mailto:${contact.email || ''}?subject=${sujet}&body=${corps}`;
    });
  }
}

function construireVisite(data) {
  const pieces = data.pieces || [];
  const opts = data.options || {};
  const conteneur = document.getElementById('visionneuse');
  if (!conteneur) return;

  if (pieces.length === 0) {
    conteneur.innerHTML = '<p style="color:#fff;padding:2rem;text-align:center">Aucune pièce à afficher pour le moment.</p>';
    return;
  }

  const noeuds = pieces.map((p) => ({
    id: p.id,
    panorama: panoramaDe(p, opts),
    name: p.nom,
    caption: p.nom,
    links: (p.liens || []).map((l) => ({
      nodeId: l.vers,
      position: { yaw: `${l.yaw}deg`, pitch: `${l.pitch}deg` },
    })),
    markers: (p.infos || []).map((info, i) => ({
      id: `${p.id}-info-${i}`,
      position: { yaw: `${info.yaw}deg`, pitch: `${info.pitch}deg` },
      html: '<div class="hotspot-info">i</div>',
      anchor: 'center center',
      tooltip: { content: `<strong>${info.titre || ''}</strong><br>${info.texte || ''}`, position: 'top center' },
    })),
  }));

  const viewer = new Viewer({
    container: conteneur,
    loadingTxt: 'Chargement de la visite…',
    navbar: ['zoom', 'move', 'caption', 'fullscreen'],
    defaultZoomLvl: 0,
    plugins: [
      MarkersPlugin,
      [VirtualTourPlugin, {
        positionMode: 'manual',
        renderMode: '3d',
        nodes: noeuds,
        startNodeId: pieces[0].id,
      }],
    ],
  });

  const tour = viewer.getPlugin(VirtualTourPlugin);

  // Sélecteur de pièces (boutons sous la visite)
  const selecteur = document.getElementById('room-selector');
  if (selecteur) {
    selecteur.innerHTML = '';
    const boutons = {};
    pieces.forEach((p) => {
      const b = document.createElement('button');
      b.className = 'room-btn';
      b.textContent = p.nom;
      b.addEventListener('click', () => tour.setCurrentNode(p.id));
      selecteur.appendChild(b);
      boutons[p.id] = b;
    });
    boutons[pieces[0].id]?.classList.add('actif');
    tour.addEventListener('node-changed', ({ node }) => {
      Object.values(boutons).forEach((b) => b.classList.remove('actif'));
      boutons[node.id]?.classList.add('actif');
    });
  }
}

(async function init() {
  const data = await chargerDonnees();
  if (!data) {
    document.getElementById('visionneuse').innerHTML =
      '<p style="color:#fff;padding:2rem;text-align:center">Impossible de charger les données. Lancez le site via un serveur local (voir README).</p>';
    return;
  }
  remplirInfosBien(data);
  construireVisite(data);
})();

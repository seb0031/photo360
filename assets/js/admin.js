import { Viewer } from '@photo-sphere-viewer/core';
import { MarkersPlugin } from '@photo-sphere-viewer/markers-plugin';

/* =========================================================================
 *  ESPACE ADMINISTRATION — éditeur visuel de la visite virtuelle.
 *  Tout se passe dans le navigateur (aucun serveur).
 *  - Données : localStorage  (clé "tour-data")
 *  - Photos  : IndexedDB     (stockage des images 360, par pièce)
 *  - Publier : génère un .zip (tour.json + photos) à envoyer sur GitHub.
 * ========================================================================= */

/* ---------- Données par défaut (si rien n'est encore enregistré) ---------- */
const DEFAUT = {
  options: { demo: true, demoPanorama: 'https://photo-sphere-viewer.js.org/assets/sphere.jpg', theme: '#2b6cb0', motDePasseAdmin: 'admin' },
  bien: {
    titre: 'Logement à louer', sousTitre: 'Visite virtuelle 360°', type: 'Appartement',
    surface: 45, pieces: 2, chambres: 1, etage: '', loyer: 750, charges: 50, dpe: '', ville: '',
    disponibilite: 'Immédiatement', description: '', atouts: [],
    contact: { nom: '', email: '', tel: '' },
  },
  pieces: [],
};

/* ---------- Stockage des photos (IndexedDB) ---------- */
const IDB = { nom: 'visite360', store: 'photos' };
function ouvrirDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB.nom, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(IDB.store);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
async function photoSet(id, blob) {
  const db = await ouvrirDB();
  return new Promise((res, rej) => { const tx = db.transaction(IDB.store, 'readwrite'); tx.objectStore(IDB.store).put(blob, id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function photoGet(id) {
  const db = await ouvrirDB();
  return new Promise((res, rej) => { const tx = db.transaction(IDB.store, 'readonly'); const rq = tx.objectStore(IDB.store).get(id); rq.onsuccess = () => res(rq.result || null); rq.onerror = () => rej(rq.error); });
}
async function photoDel(id) {
  const db = await ouvrirDB();
  return new Promise((res, rej) => { const tx = db.transaction(IDB.store, 'readwrite'); tx.objectStore(IDB.store).delete(id); tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
}
async function photoIds() {
  const db = await ouvrirDB();
  return new Promise((res, rej) => { const tx = db.transaction(IDB.store, 'readonly'); const rq = tx.objectStore(IDB.store).getAllKeys(); rq.onsuccess = () => res(rq.result || []); rq.onerror = () => rej(rq.error); });
}

/* ---------- État ---------- */
let data = null;
let pieceSel = null;       // id de la pièce en cours d'édition
let viewer = null;         // instance PSV de l'aperçu
let markers = null;        // plugin markers
let urlsTemp = [];         // object URLs à révoquer
let placement = null;      // { type:'lien', vers } ou { type:'info', titre, texte }

const yawDeg = (r) => Math.round(((r * 180 / Math.PI) % 360 + 360) % 360);
const pitchDeg = (r) => Math.round(r * 180 / Math.PI);
const slug = (s) => (s || 'piece').toLowerCase().normalize('NFD')
  .split('').filter((c) => { const n = c.charCodeAt(0); return n < 0x300 || n > 0x36f; }).join('')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'piece';

function chargerData() {
  try { const l = localStorage.getItem('tour-data'); if (l) return JSON.parse(l); } catch (e) {}
  return null;
}
async function chargerDataInitiale() {
  const local = chargerData();
  if (local) return local;
  try { const r = await fetch('tour.json', { cache: 'no-store' }); if (r.ok) return await r.json(); } catch (e) {}
  return JSON.parse(JSON.stringify(DEFAUT));
}
function sauver() {
  try { localStorage.setItem('tour-data', JSON.stringify(data)); flashSave(); } catch (e) { alert('Sauvegarde impossible : ' + e.message); }
}
let saveTimer;
function flashSave() {
  const bar = document.getElementById('save-bar');
  bar.textContent = 'Enregistré ✓';
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { bar.textContent = 'Modifications enregistrées automatiquement dans ce navigateur ✓'; }, 1500);
}
const pieceById = (id) => data.pieces.find((p) => p.id === id);
const autresPieces = (id) => data.pieces.filter((p) => p.id !== id);

/* =========================================================================
 *  CONNEXION
 * ========================================================================= */
function initLogin() {
  const form = document.getElementById('login-form');
  if (sessionStorage.getItem('admin-ok') === '1') return deverrouiller();
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const mdp = document.getElementById('login-pass').value;
    const attendu = (data.options && data.options.motDePasseAdmin) || 'admin';
    if (mdp === attendu) { sessionStorage.setItem('admin-ok', '1'); deverrouiller(); }
    else { document.getElementById('login-err').textContent = 'Mot de passe incorrect.'; }
  });
}
function deverrouiller() {
  document.getElementById('login').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

/* =========================================================================
 *  ONGLETS
 * ========================================================================= */
function initTabs() {
  document.querySelectorAll('.tab').forEach((t) => {
    t.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach((x) => x.classList.remove('actif'));
      document.querySelectorAll('.panel').forEach((p) => p.classList.remove('actif'));
      t.classList.add('actif');
      document.querySelector(`.panel[data-panel="${t.dataset.tab}"]`).classList.add('actif');
    });
  });
}

/* =========================================================================
 *  ONGLET « LE BIEN » + « APPARENCE »
 * ========================================================================= */
function initFormBien() {
  document.querySelectorAll('[data-champ]').forEach((el) => {
    const champ = el.dataset.champ;
    if (champ === 'atouts') el.value = (data.bien.atouts || []).join('\n');
    else el.value = data.bien[champ] ?? '';
    el.addEventListener('input', () => {
      if (champ === 'atouts') data.bien.atouts = el.value.split('\n').map((s) => s.trim()).filter(Boolean);
      else if (el.type === 'number') data.bien[champ] = el.value === '' ? null : Number(el.value);
      else data.bien[champ] = el.value;
      sauver();
    });
  });
  document.querySelectorAll('[data-contact]').forEach((el) => {
    const champ = el.dataset.contact;
    el.value = (data.bien.contact || {})[champ] ?? '';
    el.addEventListener('input', () => { data.bien.contact = data.bien.contact || {}; data.bien.contact[champ] = el.value; sauver(); });
  });
  document.querySelectorAll('[data-option]').forEach((el) => {
    const champ = el.dataset.option;
    if (el.type === 'checkbox') el.checked = !!data.options[champ];
    else el.value = data.options[champ] ?? '';
    el.addEventListener('input', () => { data.options[champ] = el.type === 'checkbox' ? el.checked : el.value; sauver(); });
  });
}

/* =========================================================================
 *  ONGLET « PIÈCES & PHOTOS »
 * ========================================================================= */
function renderListePieces() {
  const ul = document.getElementById('liste-pieces');
  ul.innerHTML = '';
  data.pieces.forEach((p, i) => {
    const li = document.createElement('li');
    li.draggable = true;
    li.dataset.id = p.id;
    if (p.id === pieceSel) li.classList.add('sel');
    li.innerHTML = `<span class="drag">⠿</span><span class="nom"></span><span class="pastille">photo</span>`;
    li.querySelector('.nom').textContent = `${i + 1}. ${p.nom}`;
    photoGet(p.id).then((blob) => {
      const past = li.querySelector('.pastille');
      if (!blob) { past.textContent = 'sans photo'; past.classList.add('vide'); }
    });
    li.addEventListener('click', () => ouvrirEditeur(p.id));
    ajouterDnD(li);
    ul.appendChild(li);
  });
}

let dragId = null;
function ajouterDnD(li) {
  li.addEventListener('dragstart', () => { dragId = li.dataset.id; });
  li.addEventListener('dragover', (e) => e.preventDefault());
  li.addEventListener('drop', (e) => {
    e.preventDefault();
    const cibleId = li.dataset.id;
    if (!dragId || dragId === cibleId) return;
    const from = data.pieces.findIndex((p) => p.id === dragId);
    const to = data.pieces.findIndex((p) => p.id === cibleId);
    const [m] = data.pieces.splice(from, 1);
    data.pieces.splice(to, 0, m);
    dragId = null;
    sauver(); renderListePieces();
  });
}

function ajouterPiece() {
  const nom = prompt('Nom de la nouvelle pièce :', 'Nouvelle pièce');
  if (!nom) return;
  let id = slug(nom); let n = 2;
  while (pieceById(id)) { id = `${slug(nom)}-${n++}`; }
  data.pieces.push({ id, nom, photo: `photos/${id}.jpg`, vueInitiale: { yaw: 0, pitch: 0 }, liens: [], infos: [] });
  sauver(); renderListePieces(); ouvrirEditeur(id);
}

async function supprimerPiece(id) {
  if (!confirm('Supprimer cette pièce et sa photo ?')) return;
  data.pieces = data.pieces.filter((p) => p.id !== id);
  // Nettoie les liens des autres pièces qui pointaient vers elle
  data.pieces.forEach((p) => { p.liens = (p.liens || []).filter((l) => l.vers !== id); });
  await photoDel(id);
  if (pieceSel === id) pieceSel = null;
  sauver(); renderListePieces();
  document.getElementById('editeur-piece').innerHTML = '<p class="vide">← Sélectionnez une pièce pour la modifier.</p>';
}

async function ouvrirEditeur(id) {
  pieceSel = id;
  placement = null;
  renderListePieces();
  const p = pieceById(id);
  const col = document.getElementById('editeur-piece');
  col.innerHTML = `
    <div class="editeur-head">
      <input id="ed-nom" type="text" value="" />
      <button class="btn-piece-sup" id="ed-sup">Supprimer</button>
    </div>
    <div class="zone-photo" id="zone-photo">
      <strong>Photo 360° de la pièce</strong><br>
      Glissez une image ici, ou <label style="color:var(--accent);cursor:pointer;text-decoration:underline">parcourir<input type="file" id="ed-file" accept="image/*" hidden></label><br>
      <span class="aide-mini">Format équirectangulaire (.jpg). La photo reste dans votre navigateur jusqu'à publication.</span>
    </div>
    <div id="ed-placement"></div>
    <div class="apercu-360" id="ed-apercu"></div>
    <div class="editeur-actions">
      <button class="btn btn-light" id="ed-add-lien">➜ Ajouter une flèche vers une pièce</button>
      <button class="btn btn-light" id="ed-add-info">ⓘ Ajouter un point d'info</button>
    </div>
    <div class="bloc-titre">Flèches de navigation</div>
    <ul class="mini-liste" id="ed-liens"></ul>
    <div class="bloc-titre">Points d'info</div>
    <ul class="mini-liste" id="ed-infos"></ul>
  `;
  document.getElementById('ed-nom').value = p.nom;
  document.getElementById('ed-nom').addEventListener('input', (e) => { p.nom = e.target.value; sauver(); renderListePieces(); });
  document.getElementById('ed-sup').addEventListener('click', () => supprimerPiece(id));

  // Upload photo (clic + drag&drop)
  const zone = document.getElementById('zone-photo');
  const file = document.getElementById('ed-file');
  file.addEventListener('change', () => { if (file.files[0]) chargerPhoto(id, file.files[0]); });
  zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', (e) => { e.preventDefault(); zone.classList.remove('drag'); if (e.dataTransfer.files[0]) chargerPhoto(id, e.dataTransfer.files[0]); });

  document.getElementById('ed-add-lien').addEventListener('click', () => demarrerAjoutLien(id));
  document.getElementById('ed-add-info').addEventListener('click', () => demarrerAjoutInfo(id));

  await construireApercu(id);
  renderLiensInfos(id);
}

async function chargerPhoto(id, fichier) {
  await photoSet(id, fichier);
  const p = pieceById(id);
  p.photo = `photos/${id}.jpg`;
  sauver();
  renderListePieces();
  await construireApercu(id);
}

async function panoramaApercu(p) {
  const blob = await photoGet(p.id);
  if (blob) { const url = URL.createObjectURL(blob); urlsTemp.push(url); return url; }
  return data.options.demoPanorama; // pas encore de photo -> démo
}

async function construireApercu(id) {
  const p = pieceById(id);
  if (viewer) { viewer.destroy(); viewer = null; }
  urlsTemp.forEach(URL.revokeObjectURL); urlsTemp = [];
  const pano = await panoramaApercu(p);
  viewer = new Viewer({
    container: document.getElementById('ed-apercu'),
    panorama: pano,
    navbar: ['zoom', 'move', 'fullscreen'],
    plugins: [MarkersPlugin],
  });
  markers = viewer.getPlugin(MarkersPlugin);
  viewer.addEventListener('ready', () => rafraichirMarkers(id), { once: true });
  viewer.addEventListener('click', (e) => {
    if (!placement || !e.data) return;
    const yaw = yawDeg(e.data.yaw);
    const pitch = pitchDeg(e.data.pitch);
    if (placement.type === 'lien') p.liens.push({ vers: placement.vers, yaw, pitch });
    else p.infos.push({ yaw, pitch, titre: placement.titre, texte: placement.texte });
    placement = null;
    document.getElementById('ed-placement').innerHTML = '';
    sauver(); rafraichirMarkers(id); renderLiensInfos(id);
  });
}

function rafraichirMarkers(id) {
  if (!markers) return;
  const p = pieceById(id);
  const list = [];
  (p.liens || []).forEach((l, i) => {
    const cible = pieceById(l.vers);
    list.push({ id: `lien-${i}`, position: { yaw: `${l.yaw}deg`, pitch: `${l.pitch}deg` },
      html: '<div class="hotspot-info" style="background:#dd6b20">➜</div>', anchor: 'center center',
      tooltip: `Vers ${cible ? cible.nom : '?'}` });
  });
  (p.infos || []).forEach((info, i) => {
    list.push({ id: `info-${i}`, position: { yaw: `${info.yaw}deg`, pitch: `${info.pitch}deg` },
      html: '<div class="hotspot-info">i</div>', anchor: 'center center',
      tooltip: `${info.titre || ''} — ${info.texte || ''}` });
  });
  try { markers.setMarkers(list); } catch (e) {}
}

function demarrerAjoutLien(id) {
  const autres = autresPieces(id);
  if (autres.length === 0) { alert('Ajoutez d\'abord une autre pièce pour pouvoir y mener.'); return; }
  const liste = autres.map((p, i) => `${i + 1}. ${p.nom}`).join('\n');
  const rep = prompt(`Vers quelle pièce mène cette flèche ?\n\n${liste}\n\nTapez le numéro :`);
  const idx = Number(rep) - 1;
  if (isNaN(idx) || !autres[idx]) return;
  placement = { type: 'lien', vers: autres[idx].id };
  document.getElementById('ed-placement').innerHTML =
    `<div class="placement-info">👆 Cliquez dans l'image, à l'endroit où placer la flèche vers « ${autres[idx].nom} ».</div>`;
}

function demarrerAjoutInfo(id) {
  const titre = prompt('Titre du point d\'info (ex. « Cuisine équipée ») :');
  if (titre === null) return;
  const texte = prompt('Texte du point d\'info :') || '';
  placement = { type: 'info', titre, texte };
  document.getElementById('ed-placement').innerHTML =
    `<div class="placement-info">👆 Cliquez dans l'image, à l'endroit où placer le point « ${titre} ».</div>`;
}

function renderLiensInfos(id) {
  const p = pieceById(id);
  const ulL = document.getElementById('ed-liens');
  const ulI = document.getElementById('ed-infos');
  ulL.innerHTML = ''; ulI.innerHTML = '';
  (p.liens || []).forEach((l, i) => {
    const cible = pieceById(l.vers);
    const li = document.createElement('li');
    li.innerHTML = `<span>➜ ${cible ? cible.nom : '?'} <span class="aide-mini">(${l.yaw}° / ${l.pitch}°)</span></span><button class="sup">✕</button>`;
    li.querySelector('.sup').addEventListener('click', () => { p.liens.splice(i, 1); sauver(); rafraichirMarkers(id); renderLiensInfos(id); });
    ulL.appendChild(li);
  });
  if (!p.liens || !p.liens.length) ulL.innerHTML = '<li class="aide-mini">Aucune flèche pour le moment.</li>';
  (p.infos || []).forEach((info, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>ⓘ ${info.titre || ''}</span><button class="sup">✕</button>`;
    li.querySelector('.sup').addEventListener('click', () => { p.infos.splice(i, 1); sauver(); rafraichirMarkers(id); renderLiensInfos(id); });
    ulI.appendChild(li);
  });
  if (!p.infos || !p.infos.length) ulI.innerHTML = '<li class="aide-mini">Aucun point d\'info.</li>';
}

/* =========================================================================
 *  ONGLET « PUBLIER »
 * ========================================================================= */
async function infoZip() {
  const ids = await photoIds();
  const sans = data.pieces.filter((p) => !ids.includes(p.id)).map((p) => p.nom);
  let msg = `${ids.length} photo(s) prête(s).`;
  if (data.options.demo) msg += ' ⚠️ Mode démo activé : décochez-le dans « Apparence » pour afficher vos photos.';
  if (sans.length) msg += ` Pièces sans photo : ${sans.join(', ')}.`;
  document.getElementById('zip-info').textContent = msg;
}

function telecharger(nom, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nom; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

async function exportJSON() {
  // Met à jour les chemins de photos
  data.pieces.forEach((p) => { p.photo = `photos/${p.id}.jpg`; });
  telecharger('tour.json', new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
}

async function exportZIP() {
  if (typeof JSZip === 'undefined') { alert('Bibliothèque ZIP non chargée (vérifiez votre connexion).'); return; }
  const zip = new JSZip();
  data.pieces.forEach((p) => { p.photo = `photos/${p.id}.jpg`; });
  zip.file('tour.json', JSON.stringify(data, null, 2));
  const dossier = zip.folder('photos');
  for (const p of data.pieces) {
    const blob = await photoGet(p.id);
    if (blob) dossier.file(`${p.id}.jpg`, blob);
  }
  const contenu = await zip.generateAsync({ type: 'blob' });
  telecharger('mise-a-jour-photo360.zip', contenu);
}

/* =========================================================================
 *  INITIALISATION
 * ========================================================================= */
(async function init() {
  data = await chargerDataInitiale();
  // garantit les champs de base
  data.options = Object.assign({}, DEFAUT.options, data.options);
  data.bien = Object.assign({}, DEFAUT.bien, data.bien);
  data.pieces = data.pieces || [];

  initLogin();
  initTabs();
  initFormBien();
  renderListePieces();

  document.getElementById('btn-add-piece').addEventListener('click', ajouterPiece);
  document.getElementById('btn-json').addEventListener('click', exportJSON);
  document.getElementById('btn-zip').addEventListener('click', exportZIP);
  document.getElementById('btn-reset').addEventListener('click', () => {
    if (confirm('Réinitialiser efface vos modifications locales (les photos restent). Continuer ?')) {
      localStorage.removeItem('tour-data'); location.reload();
    }
  });
  document.querySelector('.tab[data-tab="publier"]').addEventListener('click', infoZip);
})();

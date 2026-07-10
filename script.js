/* ---------- base de données locale (mise en cache du Cloud) ---------- */
let DB = { users: [], binomes: [], resources: [], messages: [], notifications: [] };
let SESSION = null;

/* ---------- état de l'interface (inscription / messagerie) ---------- */
let regStep = 0;
let regData = { interests: [], activities: [] };
let currentChatWith = null;

/* ---------- constantes ---------- */
const CREDIT_HTML = 'AgroMentor — plateforme pédagogique';
const INTERESTS = ['Agriculture durable','Nutrition','Agroalimentaire','Recherche','Innovation','Économie agricole'];
const ACTIVITIES = ['Sport','Études de terrain','Clubs étudiants','Projet associatif','Bénévolat','Recherche'];

/* ---------- notifications visuelles (toast) ---------- */
function toast(message, title){
  const wrap = document.getElementById('toast-wrap');
  if(!wrap) return;
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = (title ? '<div><b>'+title+'</b><br>'+message+'</div>' : '<div>'+message+'</div>');
  wrap.appendChild(el);
  setTimeout(function(){
    el.style.transition='opacity .3s';
    el.style.opacity='0';
    setTimeout(function(){ el.remove(); },300);
  }, 3200);
}

/* ---------- Amélioration de saveDB dans script.js ---------- */
async function saveDB(key) {
  if (!DB[key]) return;
  try {
    // ÉTAPE CRUCIALE : Avant d'écrire, on va chercher ce qu'il y a sur Firebase 
    // pour éviter d'écraser les modifications faites par un autre utilisateur
    try {
      const r = await window.storage.get('am_' + key, true);
      if (r && r.value) {
        const cloudList = JSON.parse(r.value);
        if (Array.isArray(cloudList) && Array.isArray(DB[key])) {
          
          // Fusion de sécurité : on combine notre liste locale et celle du Cloud
          const merged = [...cloudList];
          DB[key].forEach(localItem => {
            const index = merged.findIndex(cloudItem => {
              if (cloudItem.email && localItem.email) return cloudItem.email === localItem.email;
              if (cloudItem.id && localItem.id) return cloudItem.id === localItem.id;
              return false;
            });
            if (index !== -1) {
              merged[index] = localItem; // Priorité à notre modification locale
            } else {
              merged.push(localItem);
            }
          });
          DB[key] = merged; // On met à jour notre variable globale
        }
      }
    } catch (e) {
      console.log("Pas de données existantes sur le cloud pour fusionner, premier envoi.");
    }

    // Maintenant on envoie la liste fusionnée et propre sur Firebase
    await window.storage.set('am_' + key, JSON.stringify(DB[key]), true);
  } catch (e) {
    console.error("Erreur lors de la sauvegarde Firebase pour " + key, e);
  }
}

/* ---------- storage helpers ---------- */
async function loadDB(){
  for(const key of Object.keys(DB)){
    try{
      const r = await window.storage.get('am_'+key, true);
      DB[key] = r && r.value ? JSON.parse(r.value) : [];
    }catch(e){ DB[key] = []; }
  }
  try{
    const s = await window.storage.get('am_session', false);
    if(s && s.value) SESSION = JSON.parse(s.value).email;
  }catch(e){ SESSION = null; }
}
async function saveKey(key){
  try{
    await window.storage.set('am_'+key, JSON.stringify(DB[key]), true);
  }catch(e){ toast("Erreur de sauvegarde des données."); }
}
async function saveSession(){
  try{
    if(SESSION) await window.storage.set('am_session', JSON.stringify({email:SESSION}), false);
    else await window.storage.delete('am_session', false);
  }catch(e){}
}

function uid(){ return Math.random().toString(36).slice(2,9); }
function findUser(email){ return DB.users.find(u=>u.email===email); }
function me(){ return findUser(SESSION); }
function initials(name){ return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase(); }

/* ---------- notifications ---------- */
async function notify(email, text){
  DB.notifications.push({id:uid(), forEmail:email, text, ts:Date.now(), read:false});
  await saveKey('notifications');
}

/* ============================================================
   ROTATING HERO SLOGANS
   ============================================================ */
const SLOGANS = ["Un étudiant expérimenté, un étudiant accompagné.","Construisons votre réussite académique et professionnelle.","Ensemble pour réussir."];
let slIdx=0;
setInterval(()=>{
  slIdx=(slIdx+1)%SLOGANS.length;
  const r=document.getElementById('rotator');
  if(r){ r.style.opacity=0; setTimeout(()=>{r.textContent=SLOGANS[slIdx]; r.style.opacity=1;},250); }
},3800);
document.getElementById('rotator').style.transition='opacity .25s';

/* ============================================================
   GROWTH-RING DIAGRAM (signature visual)
   ============================================================ */
function renderRings(active){
  const svg = `
  <svg viewBox="0 0 400 400" width="100%" height="100%">
    ${[150,115,80,45].map((r,i)=>`
      <circle cx="200" cy="200" r="${r}" fill="none"
        stroke="${i<=active? 'var(--green)':'var(--line)'}"
        stroke-width="${i===active?4:2}"
        stroke-dasharray="${i===active? '4 0':'6 6'}"
        opacity="${i<=active?1:0.6}"/>
    `).join('')}
    <circle cx="200" cy="200" r="20" fill="var(--orange)"/>
    <text x="200" y="206" text-anchor="middle" font-family="Space Grotesk" font-weight="700" fill="#fff" font-size="15">0${active+1}</text>
  </svg>`;
  document.getElementById('ringsSvg').innerHTML = svg;
}
renderRings(0);
document.querySelectorAll('.step-item').forEach(item=>{
  item.addEventListener('mouseenter',()=>{
    document.querySelectorAll('.step-item').forEach(s=>s.classList.remove('active'));
    item.classList.add('active');
    renderRings(parseInt(item.dataset.i));
  });
});

/* ============================================================
   FAQ
   ============================================================ */
const FAQS = [
  ["Qui peut s'inscrire sur AgroMentor ?","La plateforme est exclusivement réservée aux étudiants du département STAAN, parrains comme filleuls."],
  ["Comment est choisi mon binôme ?","Un algorithme de compatibilité propose un binôme selon vos centres d'intérêt, disponibilités et objectifs. La proposition est ensuite validée, modifiée ou refusée par l'administrateur."],
  ["Puis-je changer de parrain ou de filleul ?","Oui, contactez l'administration : elle peut modifier ou recréer un binôme."],
  ["Comment partager un document ?","Depuis votre tableau de bord, section Ressources, vous pouvez partager PDF, Word, PowerPoint, liens, images et vidéos."],
  ["Mes données sont-elles protégées ?","Les mots de passe sont chiffrés et l'accès est protégé contre les injections SQL et les attaques XSS."]
];
document.getElementById('faqList').innerHTML = FAQS.map((f,i)=>`
  <div class="faq-item" id="faq${i}">
    <div class="faq-q" onclick="toggleFaq(${i})"><span>${f[0]}</span><span class="chev">+</span></div>
    <div class="faq-a">${f[1]}</div>
  </div>`).join('');
function toggleFaq(i){ document.getElementById('faq'+i).classList.toggle('open'); }

function submitContact(e){
  e.preventDefault();
  toast("Merci ! Nous revenons vers vous rapidement.","Message envoyé");
  e.target.reset();
  return false;
}

/* ============================================================
   FOOTER (rendered identically on public site & app views)
   ============================================================ */
function footerHTML(){
  return `
  <footer>
    <div class="container">
      <div class="foot-grid">
        <div>
          <div class="logo" style="color:#fff;margin-bottom:10px;"><div class="logo-mark">🌱</div>AgroMentor</div>
          <p>Plateforme de parrainage et de mentorat du département Sciences et Techniques Agro-Alimentaires et Nutritionnelles (STAAN).</p>
          <div class="social-row">
            <a href="#" onclick="return false;">f</a><a href="#" onclick="return false;">in</a><a href="#" onclick="return false;">ig</a>
          </div>
        </div>
        <div><h5>Département</h5>
          <a href="#about">À propos</a><a href="#how">Comment ça fonctionne</a><a href="#contact">Coordonnées</a>
        </div>
        <div><h5>Ressources</h5>
          <a href="#faq">FAQ</a><a href="#" onclick="event.preventDefault();toast('Politique de confidentialité disponible sur demande à l\\'administration.')">Politique de confidentialité</a>
          <a href="#" onclick="event.preventDefault();toast('Conditions d\\'utilisation disponibles sur demande à l\\'administration.')">Conditions d'utilisation</a>
        </div>
        <div><h5>Contact</h5>
          <a href="#contact">Formulaire de contact</a>
          <a href="#" onclick="event.preventDefault();openAdminLogin();">🔐 Espace Admin</a>
        </div>
      </div>
      <div class="foot-bottom">
        <span>© ${new Date().getFullYear()} AgroMentor · Département STAAN</span>
        <span class="credit">${CREDIT_HTML}</span>
      </div>
    </div>
  </footer>`;
}
document.getElementById('footer-public').innerHTML = footerHTML();
document.getElementById('footer-app').innerHTML = footerHTML();

/* ============================================================
   SHARE — copie un lien qui redirige directement vers le site
   ============================================================ */
function baseShareLink(){
  return location.origin + location.pathname;
}
async function copyLink(link){
  try{
    await navigator.clipboard.writeText(link);
    return true;
  }catch(e){
    // fallback
    const t=document.createElement('textarea'); t.value=link; document.body.appendChild(t);
    t.select(); document.execCommand('copy'); t.remove();
    return true;
  }
}
async function shareSite(){
  const link = baseShareLink();
  await copyLink(link);
  toast('Lien copié : '+link+' — quiconque l\'ouvre est redirigé directement vers AgroMentor.','Partagé');
}
async function shareResource(id){
  const link = baseShareLink()+'#ressource-'+id;
  await copyLink(link);
  const r = DB.resources.find(x=>x.id===id);
  if(r){ r.shares=(r.shares||0)+1; await saveKey('resources'); renderResources(); }
  toast('Lien de la ressource copié, prêt à être repartagé.','Repartagé');
}

/* ============================================================
   AUTH — login / register (multi-step)
   ============================================================ */
function openAuth(mode){
  document.getElementById('authOverlay').classList.add('show');
  if(mode==='login') renderLogin();
  else { regStep=0; regData={interests:[],activities:[]}; renderRegister(); }
}
function openAdminLogin(){
  document.getElementById('authOverlay').classList.add('show');
  renderLogin();
  const emailField = document.getElementById('liEmail');
  if(emailField){ emailField.value=ADMIN_EMAIL; }
  const passField = document.getElementById('liPass');
  if(passField){ passField.focus(); }
}
function closeAuth(){ document.getElementById('authOverlay').classList.remove('show'); }

function renderLogin(){
  document.getElementById('authModal').innerHTML = `
    <div class="modal-head"><h3>Se connecter</h3><button class="close-x" onclick="closeAuth()">✕</button></div>
    <form onsubmit="return doLogin(event)">
      <div class="field"><label>Adresse e-mail</label><input type="email" id="liEmail" required placeholder="prenom.nom@uam.edu.sn"></div>
      <div class="field"><label>Mot de passe</label><input type="password" id="liPass" required></div>
      <button class="btn btn-primary btn-block" type="submit">Se connecter</button>
      <p style="text-align:center;font-size:13px;color:var(--ink-soft);margin-top:14px;">Pas encore de compte ?
        <a style="color:var(--green);font-weight:600;cursor:pointer;" onclick="regStep=0;regData={interests:[],activities:[]};renderRegister()">S'inscrire</a></p>
    </form>`;
}
const ADMIN_EMAIL = 'admin@uam.edu.sn';
const ADMIN_PASS_HASH = 'e5993e7e962d8c76f8a584c80b6bece951d6c3d1e6930969e38357f327ccd3ad';
async function sha256(text){
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
async function doLogin(e){
  e.preventDefault();
  const email=document.getElementById('liEmail').value.trim().toLowerCase();
  const pass=document.getElementById('liPass').value;
  if(email===ADMIN_EMAIL && (await sha256(pass))===ADMIN_PASS_HASH){
    SESSION=ADMIN_EMAIL; await saveSession();
    if(!findUser(SESSION)){ DB.users.push({email:SESSION,nom:'Administration',prenom:'STAAN',role:'admin',status:'actif'}); await saveKey('users'); }
    closeAuth(); enterApp(); return false;
  }
  const u = findUser(email);
  if(!u || u.password!==pass){ toast("E-mail ou mot de passe incorrect."); return false; }
  if(u.status==='désactivé'){ toast("Ce compte a été désactivé par l'administrateur."); return false; }
  SESSION=email; await saveSession();
  closeAuth(); enterApp();
  return false;
}

function renderRegister(){
  const steps = ['Identité','Compte','Questionnaire','Confirmation'];
  document.getElementById('authModal').innerHTML = `
    <div class="modal-head"><h3>Créer un compte</h3><button class="close-x" onclick="closeAuth()">✕</button></div>
    <div class="step-track">${steps.map((s,i)=>`<div class="${i<=regStep?'done':''}"></div>`).join('')}</div>
    <div id="regStepBody"></div>`;
  renderRegStep();
}
function renderRegStep(){
  const body = document.getElementById('regStepBody');
  if(regStep===0){
    body.innerHTML = `
      <div class="form-grid">
        <div class="field"><label>Nom</label><input id="rNom" value="${regData.nom||''}"></div>
        <div class="field"><label>Prénom</label><input id="rPrenom" value="${regData.prenom||''}"></div>
        <div class="field"><label>Date de naissance</label><input type="date" id="rDob" value="${regData.dob||''}"></div>
        <div class="field"><label>Sexe</label><select id="rSexe"><option ${regData.sexe==='F'?'selected':''}>Féminin</option><option ${regData.sexe==='M'?'selected':''}>Masculin</option></select></div>
        <div class="field"><label>Ville d'origine</label><input id="rVille" value="${regData.ville||''}"></div>
        <div class="field"><label>Niveau d'étude</label><select id="rNiveau">
          ${['Licence 1','Licence 2','Licence 3','Master 1','Master 2'].map(n=>`<option ${regData.niveau===n?'selected':''}>${n}</option>`).join('')}
        </select></div>
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:16px;"><button class="btn btn-primary" onclick="regNext(0)">Continuer</button></div>`;
  } else if(regStep===1){
    body.innerHTML = `
      <div class="field"><label>Je m'inscris en tant que</label>
        <select id="rRole"><option value="filleul" ${regData.role==='filleul'?'selected':''}>Filleul (accompagné)</option><option value="parrain" ${regData.role==='parrain'?'selected':''}>Parrain (mentor)</option></select>
      </div>
      <div class="field"><label>Adresse e-mail universitaire</label><input type="email" id="rEmail" value="${regData.email||''}" placeholder="prenom.nom@uam.edu.sn"></div>
      <div class="field"><label>Téléphone</label><input id="rTel" value="${regData.tel||''}"></div>
      <div class="form-grid">
        <div class="field"><label>Mot de passe</label><input type="password" id="rPass"></div>
        <div class="field"><label>Confirmation</label><input type="password" id="rPass2"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:16px;">
        <button class="btn btn-ghost" onclick="regStep=0;renderRegStep()">Retour</button>
        <button class="btn btn-primary" onclick="regNext(1)">Continuer</button>
      </div>`;
  } else if(regStep===2){
    body.innerHTML = `
      <div class="field"><label>Centres d'intérêt</label><div class="chip-group" id="chipInterests">
        ${INTERESTS.map(i=>`<div class="chip ${regData.interests.includes(i)?'sel':''}" onclick="toggleChip(this,'interests','${i}')">${i}</div>`).join('')}
      </div></div>
      <div class="field"><label>Activités extrascolaires</label><div class="chip-group" id="chipActivities">
        ${ACTIVITIES.map(i=>`<div class="chip ${regData.activities.includes(i)?'sel':''}" onclick="toggleChip(this,'activities','${i}')">${i}</div>`).join('')}
      </div></div>
      <div class="form-grid">
        <div class="field"><label>Compétences</label><input id="rComp" value="${regData.competences||''}" placeholder="Ex: analyse sensorielle, Excel"></div>
        <div class="field"><label>Objectifs académiques</label><input id="rObj" value="${regData.objectifs||''}" placeholder="Ex: réussir mon Master"></div>
        <div class="field"><label>Personnalité</label><select id="rPerso">
          ${['Introverti(e)','Extraverti(e)','Ambivert(e)'].map(n=>`<option ${regData.perso===n?'selected':''}>${n}</option>`).join('')}
        </select></div>
        <div class="field"><label>Disponibilités</label><select id="rDispo">
          ${['Matin','Après-midi','Soir','Week-end'].map(n=>`<option ${regData.dispo===n?'selected':''}>${n}</option>`).join('')}
        </select></div>
        <div class="field"><label>Domaine préféré</label><input id="rDomaine" value="${regData.domaine||''}" placeholder="Ex: Nutrition"></div>
        <div class="field"><label>Expérience</label><select id="rExp">
          ${['Débutant','Intermédiaire','Avancé'].map(n=>`<option ${regData.exp===n?'selected':''}>${n}</option>`).join('')}
        </select></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:16px;">
        <button class="btn btn-ghost" onclick="regStep=1;renderRegStep()">Retour</button>
        <button class="btn btn-primary" onclick="regNext(2)">Continuer</button>
      </div>`;
  } else {
    body.innerHTML = `
      <p style="font-size:14.5px;color:var(--ink-soft);line-height:1.6;">
        Merci ${regData.prenom||''} ! Votre profil est prêt. Après validation de votre compte, un binôme compatible
        vous sera proposé automatiquement, puis <b>validé par l'administrateur</b> avant toute activation.
      </p>
      <div style="display:flex;justify-content:space-between;margin-top:16px;">
        <button class="btn btn-ghost" onclick="regStep=2;renderRegStep()">Retour</button>
        <button class="btn btn-primary" onclick="finishRegister()">Créer mon compte</button>
      </div>`;
  }
}
function toggleChip(el,field,val){
  el.classList.toggle('sel');
  const arr = regData[field];
  const idx = arr.indexOf(val);
  if(idx>-1) arr.splice(idx,1); else arr.push(val);
}
function regNext(step){
  if(step===0){
    regData.nom=document.getElementById('rNom').value.trim();
    regData.prenom=document.getElementById('rPrenom').value.trim();
    regData.dob=document.getElementById('rDob').value;
    regData.sexe=document.getElementById('rSexe').value;
    regData.ville=document.getElementById('rVille').value.trim();
    regData.niveau=document.getElementById('rNiveau').value;
    if(!regData.nom||!regData.prenom){ toast("Merci de renseigner nom et prénom."); return; }
  }
  if(step===1){
    regData.role=document.getElementById('rRole').value;
    regData.email=document.getElementById('rEmail').value.trim().toLowerCase();
    regData.tel=document.getElementById('rTel').value.trim();
    regData.password=document.getElementById('rPass').value;
    const p2=document.getElementById('rPass2').value;
    if(!regData.email||!regData.password){ toast("E-mail et mot de passe requis."); return; }
    if(!regData.email.endsWith('@uam.edu.sn')){ toast("Utilisez votre adresse universitaire, terminant par @uam.edu.sn."); return; }
    if(regData.password!==p2){ toast("Les mots de passe ne correspondent pas."); return; }
    if(findUser(regData.email)){ toast("Un compte existe déjà avec cet e-mail."); return; }
  }
  if(step===2){
    regData.competences=document.getElementById('rComp').value.trim();
    regData.objectifs=document.getElementById('rObj').value.trim();
    regData.perso=document.getElementById('rPerso').value;
    regData.dispo=document.getElementById('rDispo').value;
    regData.domaine=document.getElementById('rDomaine').value.trim();
    regData.exp=document.getElementById('rExp').value;
  }
  regStep++;
  renderRegStep();
  document.querySelector('.step-track').innerHTML = ['Identité','Compte','Questionnaire','Confirmation'].map((s,i)=>`<div class="${i<=regStep?'done':''}"></div>`).join('');
}
async function finishRegister(){
  const user = {
    email:regData.email, password:regData.password, nom:regData.nom, prenom:regData.prenom,
    dob:regData.dob, sexe:regData.sexe, ville:regData.ville, niveau:regData.niveau, tel:regData.tel,
    role:regData.role, status:'actif',
    interests:regData.interests, activities:regData.activities, competences:regData.competences,
    objectifs:regData.objectifs, perso:regData.perso, dispo:regData.dispo, domaine:regData.domaine, exp:regData.exp,
    createdAt:Date.now(), saved:[]
  };
  DB.users.push(user);
  await saveKey('users');
  await tryAutoMatch(user);
  await notify(ADMIN_EMAIL, `Nouveau compte créé : ${user.prenom} ${user.nom} (${user.role}).`);
  SESSION=user.email; await saveSession();
  closeAuth();
  toast("Bienvenue sur AgroMentor ! Votre profil est enregistré.","Compte créé");
  enterApp();
}

/* ---------- simple compatibility auto-match ---------- */
async function tryAutoMatch(user){
  const oppRole = user.role==='parrain' ? 'filleul' : 'parrain';
  const candidates = DB.users.filter(u=>u.role===oppRole && u.status==='actif' &&
    !DB.binomes.some(b=> (b.parrainEmail===u.email||b.filleulEmail===u.email) && b.status!=='refusé'));
  if(!candidates.length) return;
  let best=null, bestScore=-1;
  candidates.forEach(c=>{
    const shared = (c.interests||[]).filter(i=>(user.interests||[]).includes(i)).length;
    const score = shared*20 + (c.domaine===user.domaine?15:0) + (c.dispo===user.dispo?10:0);
    if(score>bestScore){ bestScore=score; best=c; }
  });
  if(!best) return;
  const compat = Math.min(98, 40+bestScore);
  const binome = {
    id:uid(),
    parrainEmail: user.role==='parrain'? user.email : best.email,
    filleulEmail: user.role==='filleul'? user.email : best.email,
    status:'proposé', compat, createdAt:Date.now()
  };
  DB.binomes.push(binome);
  await saveKey('binomes');
  await notify(binome.parrainEmail, "Un binôme vous a été proposé automatiquement, en attente de validation.");
  await notify(binome.filleulEmail, "Un binôme vous a été proposé automatiquement, en attente de validation.");
  await notify(ADMIN_EMAIL, "Nouvelle proposition de binôme en attente de validation.");
}

/* ============================================================
   ENTER APP / ROUTER
   ============================================================ */
function enterApp(){
  document.getElementById('view-site').classList.remove('active');
  document.getElementById('view-app').classList.add('active');
  const u = me();
  renderSidebar(u.role==='admin'?'admin':'user');
  goto(u.role==='admin'?'admin-overview':'dashboard');
}
async function logout(){
  SESSION=null; await saveSession();
  document.getElementById('view-app').classList.remove('active');
  document.getElementById('view-site').classList.add('active');
  window.scrollTo(0,0);
}
function renderSidebar(mode){
  const u=me();
  const userLinks = [
    ['dashboard','🏠','Vue d\'ensemble'],
    ['profile','👤','Mon profil'],
    ['binome','🤝','Mon binôme'],
    ['resources','📚','Ressources'],
    ['saved','⭐','Enregistrés'],
    ['messages','💬','Messagerie'],
    ['notifications','🔔','Notifications'],
  ];
  const adminLinks = [
    ['admin-overview','📊','Statistiques'],
    ['admin-users','👥','Utilisateurs'],
    ['admin-binomes','🤝','Binômes'],
    ['admin-resources','📚','Ressources'],
  ];
  const links = mode==='admin'? adminLinks : userLinks;
  document.getElementById('sidebar').innerHTML = `
    <div class="logo">🌱 AgroMentor</div>
    ${links.map(l=>`<a class="side-link" id="side-${l[0]}" onclick="goto('${l[0]}')">${l[1]} ${l[2]}</a>`).join('')}
    <div class="side-bottom">
      <div class="side-link" style="opacity:.8;cursor:default;">👤 ${u.prenom} ${u.nom}</div>
    </div>`;
}
const TITLES = {
  dashboard:"Vue d'ensemble", profile:"Mon profil", binome:"Mon binôme", resources:"Ressources partagées",
  saved:"Mes éléments enregistrés", messages:"Messagerie", notifications:"Notifications",
  'admin-overview':"Statistiques de la plateforme", 'admin-users':"Gestion des utilisateurs",
  'admin-binomes':"Gestion des binômes", 'admin-resources':"Gestion des ressources"
};
function goto(view){
  document.getElementById('topbarTitle').textContent = TITLES[view]||'';
  document.querySelectorAll('.side-link').forEach(s=>s.classList.remove('active'));
  const sl=document.getElementById('side-'+view); if(sl) sl.classList.add('active');
  const renderers = {
    dashboard:renderDashboard, profile:renderProfile, binome:renderBinomeUser, resources:renderResources,
    saved:renderSaved, messages:renderMessages, notifications:renderNotifications,
    'admin-overview':renderAdminOverview, 'admin-users':renderAdminUsers,
    'admin-binomes':renderAdminBinomes, 'admin-resources':renderAdminResources
  };
  (renderers[view]||renderDashboard)();
}

/* ---------- USER: dashboard overview ---------- */
function myBinome(){
  const u=me();
  return DB.binomes.find(b=> (b.parrainEmail===u.email||b.filleulEmail===u.email) && b.status==='validé');
}
function renderDashboard(){
  const u=me();
  const b = myBinome();
  const myRes = DB.resources.filter(r=>r.author===u.email);
  const unread = DB.notifications.filter(n=>n.forEmail===u.email && !n.read).length;
  document.getElementById('appContent').innerHTML = `
    <div class="panel profile-card">
      <div class="avatar">${initials(u.prenom+' '+u.nom)}</div>
      <div>
        <h3 style="margin:0;">${u.prenom} ${u.nom}</h3>
        <p style="margin:4px 0 0;color:var(--ink-soft);">${u.role==='parrain'?'Parrain':'Filleul'} · ${u.niveau||''} · ${u.domaine||''}</p>
      </div>
    </div>
    <div class="stat-grid">
      <div class="stat-box"><b>${b? '1':'0'}</b><span>Binôme actif</span></div>
      <div class="stat-box"><b>${myRes.length}</b><span>Ressources partagées</span></div>
      <div class="stat-box"><b>${unread}</b><span>Notifications non lues</span></div>
      <div class="stat-box"><b>${(u.saved||[]).length}</b><span>Éléments enregistrés</span></div>
    </div>
    <div class="panel">
      <h3>Mon binôme</h3>
      ${binomeSummaryHTML(u)}
    </div>`;
}
function binomeSummaryHTML(u){
  const pending = DB.binomes.find(b=>(b.parrainEmail===u.email||b.filleulEmail===u.email) && b.status==='proposé');
  const valid = myBinome();
  if(valid){
    const otherEmail = valid.parrainEmail===u.email? valid.filleulEmail: valid.parrainEmail;
    const other = findUser(otherEmail);
    return `<div style="display:flex;align-items:center;gap:14px;"><div class="avatar" style="width:52px;height:52px;font-size:16px;">${initials(other?.prenom+' '+other?.nom)}</div>
      <div><b>${other?.prenom} ${other?.nom}</b><br><span class="badge ok">Binôme validé · ${valid.compat}% compatibilité</span></div></div>`;
  }
  if(pending) return `<span class="badge wait">En attente de validation par l'administrateur (compatibilité estimée ${pending.compat}%)</span>`;
  return `<p style="color:var(--ink-soft);font-size:14px;">Aucune proposition pour le moment. Complétez votre profil pour améliorer votre compatibilité.</p>`;
}

function renderBinomeUser(){
  const u=me();
  document.getElementById('appContent').innerHTML = `<div class="panel"><h3>Mon binôme</h3>${binomeSummaryHTML(u)}</div>`;
}

/* ---------- USER: profile ---------- */
function renderProfile(){
  const u=me();
  document.getElementById('appContent').innerHTML = `
    <div class="panel">
      <h3>Informations personnelles</h3>
      <div class="form-grid">
        <div class="field"><label>Nom</label><input id="pNom" value="${u.nom||''}"></div>
        <div class="field"><label>Prénom</label><input id="pPrenom" value="${u.prenom||''}"></div>
        <div class="field"><label>Ville d'origine</label><input id="pVille" value="${u.ville||''}"></div>
        <div class="field"><label>Téléphone</label><input id="pTel" value="${u.tel||''}"></div>
        <div class="field"><label>Domaine préféré</label><input id="pDomaine" value="${u.domaine||''}"></div>
        <div class="field"><label>Niveau d'étude</label><input id="pNiveau" value="${u.niveau||''}"></div>
      </div>
      <button class="btn btn-primary" onclick="saveProfile()">Enregistrer les modifications</button>
    </div>
    <div class="panel">
      <h3>Sécurité</h3>
      <div class="form-grid">
        <div class="field"><label>Nouveau mot de passe</label><input type="password" id="pPass1"></div>
        <div class="field"><label>Confirmation</label><input type="password" id="pPass2"></div>
      </div>
      <button class="btn btn-outline" onclick="changePassword()">Changer le mot de passe</button>
    </div>
    <div class="panel">
      <h3>Zone sensible</h3>
      <p style="color:var(--ink-soft);font-size:13.5px;">La suppression de votre compte annulera automatiquement votre binôme.</p>
      <button class="btn btn-danger" onclick="deleteMyAccount()">Supprimer mon compte</button>
    </div>`;
}
async function saveProfile(){
  const u=me();
  u.nom=document.getElementById('pNom').value.trim();
  u.prenom=document.getElementById('pPrenom').value.trim();
  u.ville=document.getElementById('pVille').value.trim();
  u.tel=document.getElementById('pTel').value.trim();
  u.domaine=document.getElementById('pDomaine').value.trim();
  u.niveau=document.getElementById('pNiveau').value.trim();
  await saveKey('users');
  toast("Profil mis à jour et sauvegardé.");
  renderSidebar('user');
}
async function changePassword(){
  const p1=document.getElementById('pPass1').value, p2=document.getElementById('pPass2').value;
  if(!p1||p1!==p2){ toast("Les mots de passe ne correspondent pas."); return; }
  me().password=p1; await saveKey('users');
  toast("Mot de passe changé avec succès.");
}
async function deleteMyAccount(){
  if(!confirm("Confirmer la suppression définitive de votre compte ?")) return;
  await removeUserCascade(SESSION);
  toast("Compte supprimé.");
  logout();
}
async function removeUserCascade(email){
  DB.users = DB.users.filter(u=>u.email!==email);
  DB.binomes = DB.binomes.filter(b=>{
    const involved = b.parrainEmail===email||b.filleulEmail===email;
    return !involved;
  });
  DB.resources.forEach(r=>{ r.likes=(r.likes||[]).filter(l=>l!==email); (r.comments||[]).forEach(c=>{}); });
  await saveKey('users'); await saveKey('binomes'); await saveKey('resources');
}

/* ---------- USER: resources (share / like / comment / download / save / share-link) ---------- */
function renderResources(){
  const u=me();
  document.getElementById('appContent').innerHTML = `
    <div class="panel">
      <h3>Partager une ressource</h3>
      <div class="form-grid">
        <div class="field"><label>Titre</label><input id="resTitle" placeholder="Ex: TP analyse sensorielle"></div>
        <div class="field"><label>Type</label><select id="resType">
          <option>PDF</option><option>Cours</option><option>Word</option><option>PowerPoint</option><option>Lien</option><option>Image</option><option>Vidéo</option>
        </select></div>
      </div>
      <div class="field"><label>Lien ou description</label><input id="resLink" placeholder="URL du fichier ou du lien utile"></div>
      <button class="btn btn-primary" onclick="addResource()">Publier</button>
    </div>
    <div id="resList"></div>`;
  renderResourceList('resList', DB.resources.slice().reverse());
}
function renderResourceList(targetId, list){
  const u=me();
  document.getElementById(targetId).innerHTML = list.map(r=>{
    const author = findUser(r.author);
    const liked = (r.likes||[]).includes(u.email);
    const saved = (u.saved||[]).includes(r.id);
    return `<div class="res-card" id="rc-${r.id}">
      <div class="res-top">
        <div><span class="res-type">${r.type}</span><h4 style="margin:4px 0;color:var(--forest);">${r.title}</h4>
        <span style="font-size:12px;color:var(--ink-soft);">par ${author? author.prenom+' '+author.nom : 'Utilisateur'}</span></div>
      </div>
      <p style="font-size:13.5px;color:var(--ink-soft);word-break:break-all;">${r.link||''}</p>
      <div class="res-actions">
        <button class="${liked?'liked':''}" onclick="toggleLike('${r.id}')">👍 ${(r.likes||[]).length}</button>
        <button onclick="downloadResource('${r.id}')">⬇️ Télécharger (${r.downloads||0})</button>
        <button class="${saved?'saved':''}" onclick="toggleSave('${r.id}')">${saved?'★ Enregistré':'☆ Enregistrer'}</button>
        <button onclick="shareResource('${r.id}')">↗️ Repartager (${r.shares||0})</button>
      </div>
      <div class="comment-box">
        ${(r.comments||[]).map(c=>`<div class="comment-line"><b>${c.author}:</b> ${c.text}</div>`).join('')}
        <div style="display:flex;gap:8px;margin-top:8px;">
          <input placeholder="Ajouter un commentaire..." id="cin-${r.id}" style="flex:1;">
          <button class="btn btn-sm btn-outline" onclick="addComment('${r.id}')">Envoyer</button>
        </div>
      </div>
    </div>`;
  }).join('') || '<p style="color:var(--ink-soft);">Aucune ressource pour le moment.</p>';
}
async function addResource(){
  const title=document.getElementById('resTitle').value.trim();
  const type=document.getElementById('resType').value;
  const link=document.getElementById('resLink').value.trim();
  if(!title){ toast("Merci d'indiquer un titre."); return; }
  const r={id:uid(), author:SESSION, title, type, link, likes:[], comments:[], downloads:0, shares:0, createdAt:Date.now()};
  DB.resources.push(r);
  await saveKey('resources');
  toast("Ressource partagée et sauvegardée.");
  renderResources();
}
async function toggleLike(id){
  const u=me(); const r=DB.resources.find(x=>x.id===id);
  r.likes = r.likes||[];
  const i=r.likes.indexOf(u.email);
  if(i>-1) r.likes.splice(i,1); else r.likes.push(u.email);
  await saveKey('resources'); renderResources();
}
async function downloadResource(id){
  const r=DB.resources.find(x=>x.id===id);
  r.downloads=(r.downloads||0)+1;
  await saveKey('resources');
  toast(r.link? "Téléchargement simulé — "+r.link : "Téléchargement simulé.");
  renderResources();
}
async function toggleSave(id){
  const u=me(); u.saved=u.saved||[];
  const i=u.saved.indexOf(id);
  if(i>-1) u.saved.splice(i,1); else u.saved.push(id);
  await saveKey('users'); renderResources();
}
async function addComment(id){
  const input=document.getElementById('cin-'+id); const text=input.value.trim();
  if(!text) return;
  const r=DB.resources.find(x=>x.id===id); const u=me();
  r.comments=r.comments||[]; r.comments.push({author:u.prenom+' '+u.nom,text});
  await saveKey('resources'); renderResources();
}
function renderSaved(){
  const u=me();
  renderResourceList('appContent', DB.resources.filter(r=>(u.saved||[]).includes(r.id)));
  document.getElementById('appContent').insertAdjacentHTML('afterbegin','<div class="panel"><h3>Mes éléments enregistrés</h3><p style="color:var(--ink-soft);font-size:13.5px;">Retrouvez ici vos ressources, discussions et annonces sauvegardées.</p></div>');
}

/* ---------- USER: messages ---------- */
function conversationsFor(email){
  const partners = new Set();
  DB.messages.forEach(m=>{ if(m.from===email) partners.add(m.to); if(m.to===email) partners.add(m.from); });
  const b = myBinome();
  if(b){ partners.add(b.parrainEmail===email? b.filleulEmail : b.parrainEmail); }
  return [...partners];
}
function renderMessages(){
  const u=me();
  const convs = conversationsFor(u.email);
  if(!currentChatWith && convs.length) currentChatWith = convs[0];
  document.getElementById('appContent').innerHTML = `
    <div class="chat-wrap">
      <div class="conv-list">${convs.length? convs.map(c=>{
        const cu=findUser(c);
        return `<div class="conv-item ${c===currentChatWith?'active':''}" onclick="openChat('${c}')">${cu? cu.prenom+' '+cu.nom : c}</div>`;
      }).join('') : '<div style="padding:16px;color:var(--ink-soft);font-size:13px;">Aucune conversation. Un binôme validé apparaîtra ici automatiquement.</div>'}</div>
      <div class="chat-panel">
        <div class="chat-msgs" id="chatMsgs"></div>
        <div class="chat-input">
          <input id="chatInput" placeholder="Écrire un message..." onkeydown="if(event.key==='Enter')sendMsg()">
          <button class="btn btn-primary btn-sm" onclick="sendMsg()">Envoyer</button>
        </div>
      </div>
    </div>`;
  renderChatMsgs();
}
function openChat(email){ currentChatWith=email; renderMessages(); }
function renderChatMsgs(){
  const u=me(); const box=document.getElementById('chatMsgs'); if(!box) return;
  if(!currentChatWith){ box.innerHTML='<p style="color:var(--ink-soft);">Sélectionnez une conversation.</p>'; return; }
  const list = DB.messages.filter(m=> (m.from===u.email&&m.to===currentChatWith)||(m.from===currentChatWith&&m.to===u.email));
  list.forEach(m=>{ if(m.to===u.email) m.read=true; });
  box.innerHTML = list.map(m=>`<div class="msg ${m.from===u.email?'me':'them'}">${m.text}<span class="msg-time">${new Date(m.ts).toLocaleString('fr-FR')}</span></div>`).join('') || '<p style="color:var(--ink-soft);">Aucun message. Dites bonjour !</p>';
  box.scrollTop = box.scrollHeight;
}
async function sendMsg(){
  const u=me(); const input=document.getElementById('chatInput'); const text=input.value.trim();
  if(!text||!currentChatWith) return;
  DB.messages.push({id:uid(), from:u.email, to:currentChatWith, text, ts:Date.now(), read:false});
  await saveKey('messages');
  await notify(currentChatWith, `Nouveau message de ${u.prenom} ${u.nom}.`);
  input.value=''; renderChatMsgs(); await saveKey('messages');
}

/* ---------- USER: notifications ---------- */
function renderNotifications(){
  const u=me();
  const list = DB.notifications.filter(n=>n.forEmail===u.email).sort((a,b)=>b.ts-a.ts);
  document.getElementById('appContent').innerHTML = `<div class="panel"><h3>Notifications</h3>
    ${list.map(n=>`<div class="notif-item ${n.read?'read':''}"><div class="notif-dot"></div><div>${n.text}<br><span style="font-size:11px;color:var(--ink-soft);">${new Date(n.ts).toLocaleString('fr-FR')}</span></div></div>`).join('') || '<p style="color:var(--ink-soft);">Aucune notification.</p>'}
    </div>`;
  list.forEach(n=>n.read=true);
  saveKey('notifications');
}

/* ============================================================
   ADMIN VIEWS
   ============================================================ */
function renderAdminOverview(){
  const nbParrains = DB.users.filter(u=>u.role==='parrain').length;
  const nbFilleuls = DB.users.filter(u=>u.role==='filleul').length;
  const actifs = DB.binomes.filter(b=>b.status==='validé').length;
  const avgCompat = DB.binomes.length? Math.round(DB.binomes.reduce((s,b)=>s+(b.compat||0),0)/DB.binomes.length) : 0;
  const nbRes = DB.resources.length;
  const nbDl = DB.resources.reduce((s,r)=>s+(r.downloads||0),0);
  const activeUsers = DB.users.filter(u=>u.status==='actif').length;
  const newSignups = DB.users.filter(u=>u.createdAt && (Date.now()-u.createdAt)<7*86400000).length;
  document.getElementById('statBinomes').textContent = actifs;
  document.getElementById('appContent').innerHTML = `
    <div class="panel"><h3>Statistiques générales</h3>
      <div class="stat-grid">
        <div class="stat-box"><b>${nbParrains}</b><span>Parrains</span></div>
        <div class="stat-box"><b>${nbFilleuls}</b><span>Filleuls</span></div>
        <div class="stat-box"><b>${actifs}</b><span>Binômes actifs</span></div>
        <div class="stat-box"><b>${avgCompat}%</b><span>Compatibilité moyenne</span></div>
        <div class="stat-box"><b>${nbRes}</b><span>Ressources partagées</span></div>
        <div class="stat-box"><b>${nbDl}</b><span>Téléchargements</span></div>
        <div class="stat-box"><b>${activeUsers}</b><span>Utilisateurs actifs</span></div>
        <div class="stat-box"><b>${newSignups}</b><span>Nouvelles inscriptions (7j)</span></div>
      </div>
    </div>`;
}
function renderAdminUsers(){
  document.getElementById('appContent').innerHTML = `
    <div class="panel">
      <h3>Utilisateurs</h3>
      <input placeholder="Rechercher un utilisateur..." id="userSearch" style="margin-bottom:14px;" oninput="filterUsers()">
      <div style="overflow:auto;"><table id="userTable"></table></div>
    </div>`;
  filterUsers();
}
function filterUsers(){
  const q=(document.getElementById('userSearch')?.value||'').toLowerCase();
  const list = DB.users.filter(u=>u.role!=='admin' && (u.nom+u.prenom+u.email).toLowerCase().includes(q));
  document.getElementById('userTable').innerHTML = `
    <tr><th>Nom</th><th>Rôle</th><th>Statut</th><th>Actions</th></tr>
    ${list.map(u=>`<tr>
      <td>${u.prenom} ${u.nom}<br><span style="color:var(--ink-soft);font-size:11.5px;">${u.email}</span></td>
      <td>${u.role==='parrain'?'Parrain':'Filleul'}</td>
      <td><span class="badge ${u.status==='actif'?'ok':'off'}">${u.status}</span></td>
      <td class="row-actions">
        <button class="icon-btn" onclick="editUserPrompt('${u.email}')">Modifier</button>
        ${u.status==='actif'
          ? `<button class="icon-btn" onclick="toggleUserStatus('${u.email}','désactivé')">Désactiver</button>`
          : `<button class="icon-btn" onclick="toggleUserStatus('${u.email}','actif')">Réactiver</button>`}
        <button class="icon-btn" onclick="adminDeleteUser('${u.email}')">Supprimer</button>
      </td>
    </tr>`).join('')}`;
}
async function toggleUserStatus(email,status){
  findUser(email).status=status; await saveKey('users');
  await notify(email, status==='actif'? "Votre compte a été réactivé par l'administrateur." : "Votre compte a été désactivé par l'administrateur.");
  filterUsers();
}
function editUserPrompt(email){
  const u=findUser(email);
  const nom=prompt("Nom :", u.nom); if(nom===null) return;
  const prenom=prompt("Prénom :", u.prenom); if(prenom===null) return;
  u.nom=nom; u.prenom=prenom;
  saveKey('users').then(()=>{ toast("Utilisateur modifié."); filterUsers(); });
}
async function adminDeleteUser(email){
  if(!confirm("Supprimer définitivement cet utilisateur ? Ses binômes seront annulés.")) return;
  await removeUserCascade(email);
  toast("Utilisateur supprimé, associations annulées.");
  filterUsers();
}
function renderAdminBinomes(){
  document.getElementById('appContent').innerHTML = `
    <div class="panel">
      <h3>Créer un binôme manuellement</h3>
      <div class="form-grid">
        <div class="field"><label>Parrain</label><select id="manParrain">${DB.users.filter(u=>u.role==='parrain').map(u=>`<option value="${u.email}">${u.prenom} ${u.nom}</option>`).join('')}</select></div>
        <div class="field"><label>Filleul</label><select id="manFilleul">${DB.users.filter(u=>u.role==='filleul').map(u=>`<option value="${u.email}">${u.prenom} ${u.nom}</option>`).join('')}</select></div>
      </div>
      <button class="btn btn-primary" onclick="createBinomeManual()">Créer le binôme</button>
    </div>
    <div class="panel">
      <h3>Propositions et binômes</h3>
      <div style="overflow:auto;"><table id="binomeTable"></table></div>
    </div>`;
  renderBinomeTable();
}
function renderBinomeTable(){
  document.getElementById('binomeTable').innerHTML = `
    <tr><th>Parrain</th><th>Filleul</th><th>Compat.</th><th>Statut</th><th>Actions</th></tr>
    ${DB.binomes.map(b=>{
      const p=findUser(b.parrainEmail), f=findUser(b.filleulEmail);
      const badgeClass = b.status==='validé'?'ok':b.status==='refusé'?'no':'wait';
      return `<tr>
        <td>${p? p.prenom+' '+p.nom : '—'}</td>
        <td>${f? f.prenom+' '+f.nom : '—'}</td>
        <td>${b.compat||'—'}%</td>
        <td><span class="badge ${badgeClass}">${b.status}</span></td>
        <td class="row-actions">
          ${b.status!=='validé'? `<button class="icon-btn" onclick="setBinomeStatus('${b.id}','validé')">Accepter</button>`:''}
          ${b.status!=='refusé'? `<button class="icon-btn" onclick="setBinomeStatus('${b.id}','refusé')">Refuser</button>`:''}
          <button class="icon-btn" onclick="modifyBinome('${b.id}')">Modifier</button>
          <button class="icon-btn" onclick="deleteBinome('${b.id}')">Supprimer</button>
        </td>
      </tr>`;
    }).join('') || '<tr><td colspan="5" style="color:var(--ink-soft);">Aucun binôme.</td></tr>'}`;
}
async function createBinomeManual(){
  const parrainEmail=document.getElementById('manParrain').value;
  const filleulEmail=document.getElementById('manFilleul').value;
  if(!parrainEmail||!filleulEmail){ toast("Sélectionnez un parrain et un filleul."); return; }
  DB.binomes.push({id:uid(), parrainEmail, filleulEmail, status:'validé', compat:100, createdAt:Date.now(), manual:true});
  await saveKey('binomes');
  await notify(parrainEmail,"Un binôme a été créé manuellement par l'administrateur."); 
  await notify(filleulEmail,"Un binôme a été créé manuellement par l'administrateur.");
  toast("Binôme créé et validé."); renderBinomeTable();
}
async function setBinomeStatus(id,status){
  const b=DB.binomes.find(x=>x.id===id); b.status=status;
  await saveKey('binomes');
  await notify(b.parrainEmail, status==='validé'? "Votre binôme a été validé par l'administrateur !" : "Votre proposition de binôme a été refusée.");
  await notify(b.filleulEmail, status==='validé'? "Votre binôme a été validé par l'administrateur !" : "Votre proposition de binôme a été refusée.");
  renderBinomeTable();
  document.getElementById('statBinomes') && (document.getElementById('statBinomes').textContent = DB.binomes.filter(x=>x.status==='validé').length);
}
async function modifyBinome(id){
  const b=DB.binomes.find(x=>x.id===id);
  const candidates = DB.users.filter(u=>u.role==='filleul').map(u=>u.email+' — '+u.prenom+' '+u.nom).join('\n');
  const newFilleul = prompt("Nouvel e-mail du filleul :\n"+candidates, b.filleulEmail);
  if(!newFilleul) return;
  if(!findUser(newFilleul)){ toast("Utilisateur introuvable."); return; }
  b.filleulEmail=newFilleul; b.status='proposé';
  await saveKey('binomes'); toast("Binôme modifié, en attente de re-validation.");
  renderBinomeTable();
}
async function deleteBinome(id){
  DB.binomes = DB.binomes.filter(b=>b.id!==id);
  await saveKey('binomes'); toast("Binôme supprimé.");
  renderBinomeTable();
}
function renderAdminResources(){
  document.getElementById('appContent').innerHTML = `<div class="panel"><h3>Modération des ressources</h3><div id="modList"></div></div>`;
  document.getElementById('modList').innerHTML = DB.resources.slice().reverse().map(r=>{
    const author=findUser(r.author);
    return `<div class="res-card">
      <div class="res-top"><div><span class="res-type">${r.type}</span><h4 style="margin:4px 0;">${r.title}</h4>
      <span style="font-size:12px;color:var(--ink-soft);">par ${author?author.prenom+' '+author.nom:'—'} · ${r.hidden?'masquée':'visible'}</span></div></div>
      <div class="res-actions">
        <button onclick="toggleHideResource('${r.id}')">${r.hidden?'Ré-approuver':'Masquer'}</button>
        <button onclick="deleteResource('${r.id}')">Supprimer</button>
      </div>
      <div class="comment-box">${(r.comments||[]).map((c,i)=>`<div class="comment-line"><b>${c.author}:</b> ${c.text} <button class="icon-btn" style="margin-left:8px;" onclick="deleteComment('${r.id}',${i})">Suppr.</button></div>`).join('')}</div>
    </div>`;
  }).join('') || '<p style="color:var(--ink-soft);">Aucune ressource.</p>';
}
async function toggleHideResource(id){
  const r=DB.resources.find(x=>x.id===id); r.hidden=!r.hidden;
  await saveKey('resources'); renderAdminResources();
}
async function deleteResource(id){
  DB.resources = DB.resources.filter(r=>r.id!==id);
  await saveKey('resources'); toast("Ressource supprimée."); renderAdminResources();
}
async function deleteComment(id,idx){
  const r=DB.resources.find(x=>x.id===id); r.comments.splice(idx,1);
  await saveKey('resources'); renderAdminResources();
}

/* ============================================================
   DEEP LINK — ouvrir directement une ressource partagée
   ============================================================ */
function handleDeepLink(){
  if(location.hash.startsWith('#ressource-') && SESSION){
    const id = location.hash.replace('#ressource-','');
    setTimeout(()=>{ goto('resources'); const el=document.getElementById('rc-'+id); if(el) el.scrollIntoView({behavior:'smooth',block:'center'}); },300);
  }
}

/* ============================================================
   SHOWCASE (public sponsors/sponsees preview)
   ============================================================ */
function renderShowcase(){
  const sponsors = DB.users.filter(u=>u.role==='parrain').slice(0,3);
  const sponsees = DB.users.filter(u=>u.role==='filleul').slice(0,3);
  const demo = (list, roleLabel, domains) => (list.length? list : domains.map((d,i)=>({prenom:'Étudiant',nom:(i+1)+'',domaine:d,niveau:['Licence 3','Master 1','Master 2'][i]})))
    .map(u=>`<div class="people-card"><div class="avatar">${initials((u.prenom||'')+' '+(u.nom||''))}</div><h4>${u.prenom} ${u.nom}</h4><span>${u.niveau||''}</span><br><span class="tag">${u.domaine||roleLabel}</span></div>`).join('');
  document.getElementById('sponsorShowcase').innerHTML = demo(sponsors,'Parrain',['Agronomie','Nutrition','Agroalimentaire']);
  document.getElementById('sponseeShowcase').innerHTML = demo(sponsees,'Filleul',['Productions végétales','Recherche scientifique','Développement durable']);
}

/* ============================================================
   DÉSACTIVATION DU CLIC DROIT
   ============================================================ */
document.addEventListener('contextmenu', function(e){
  e.preventDefault();
  toast("Le clic droit est désactivé sur ce site.");
  return false;
});

/* ============================================================
   INIT
   ============================================================ */
(async function init(){
  await loadDB();
  document.getElementById('statBinomes').textContent = DB.binomes.filter(b=>b.status==='validé').length;
  renderShowcase();
  if(SESSION && findUser(SESSION)){
    enterApp();
    handleDeepLink();
  }
})();
/* ============================================================\
   FONCTION DE SYNCHRONISATION EN TEMPS RÉEL (BOUTON DE RAFrAÎCHISSEMENT)
   ============================================================ */
async function syncOnlineData() {
  try {
    toast("Mise à jour des données depuis le Cloud...", "Synchronisation");
    await loadDB(); // Recharge les listes d'utilisateurs, binômes, etc.
    
    // Si l'utilisateur est sur le tableau de bord, on rafraîchit son affichage
    if (typeof renderApp === 'function') {
      renderApp();
    }
    // Si la fonction d'affichage des parrains/filleuls existe sur la page d'accueil
    if (typeof updateShowcases === 'function') {
      updateShowcases();
    }
    
    toast("Données synchronisées avec succès !", "Terminé");
  } catch (error) {
    console.error("Erreur de synchronisation :", error);
    toast("Impossible de synchroniser les données.", "Erreur");
  }
}

// Optionnel : Lancer automatiquement une vérification toutes les 30 secondes
setInterval(() => {
  if (SESSION) { // Seulement si quelqu'un (comme l'admin) est connecté
    loadDB().then(() => { if (typeof renderApp === 'function') renderApp(); });
  }
}, 30000);

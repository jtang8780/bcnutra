/* ===== Dynamic Formulas — shared site JS (v3) ===== */

/* --- language --- */
var TITLES = {
  home:      {en:'Reset Your Cortisol in 28 Days · Dynamic Formulas', zh:'28天科学皮质醇调控计划 · Dynamic Formulas', es:'Reinicia tu cortisol en 28 días · Dynamic Formulas', fr:'Réinitialisez votre cortisol en 28 jours · Dynamic Formulas'},
  cortisol:  {en:'Cortisol & Health · Dynamic Formulas', zh:'压力与健康 · Dynamic Formulas', es:'Cortisol y salud · Dynamic Formulas', fr:'Cortisol et santé · Dynamic Formulas'},
  how:       {en:'How It Works · Dynamic Formulas', zh:'临床循证 · Dynamic Formulas', es:'Cómo funciona · Dynamic Formulas', fr:'Comment ça marche · Dynamic Formulas'},
  who:       {en:"Who It's For · Dynamic Formulas", zh:'适用人群 · Dynamic Formulas', es:'Para quién es · Dynamic Formulas', fr:'Pour qui · Dynamic Formulas'},
  guarantee: {en:'Our Guarantee · Dynamic Formulas', zh:'服务与保障 · Dynamic Formulas', es:'Nuestra garantía · Dynamic Formulas', fr:'Notre garantie · Dynamic Formulas'},
  faq:       {en:'FAQs · Dynamic Formulas', zh:'常见问题 · Dynamic Formulas', es:'Preguntas frecuentes · Dynamic Formulas', fr:'Questions fréquentes · Dynamic Formulas'}
};
var HTML_LANG = {en:'en', zh:'zh-CN', es:'es', fr:'fr'};

function setLang(l){
  if(!HTML_LANG[l]) l = 'en';
  document.body.dataset.lang = l;
  document.documentElement.lang = HTML_LANG[l];
  var key = document.body.dataset.page || 'home';
  if(TITLES[key] && TITLES[key][l]) document.title = TITLES[key][l];
  try{ localStorage.setItem('df-lang', l); }catch(e){}
  var btns = document.querySelectorAll('.lang-btn');
  for(var i=0;i<btns.length;i++) btns[i].classList.toggle('on', btns[i].dataset.l === l);
}

(function(){
  var btns = document.querySelectorAll('.lang-btn');
  for(var i=0;i<btns.length;i++){
    btns[i].addEventListener('click', function(){ setLang(this.dataset.l); });
  }
  var saved = null;
  try{ saved = localStorage.getItem('df-lang'); }catch(e){}
  if(saved){ setLang(saved); return; }
  var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || 'en'];
  var pick = 'en';
  for(var j=0;j<list.length;j++){
    var n = String(list[j]).toLowerCase();
    if(n.indexOf('zh')===0){ pick='zh'; break; }
    if(n.indexOf('es')===0){ pick='es'; break; }
    if(n.indexOf('fr')===0){ pick='fr'; break; }
    if(n.indexOf('en')===0){ pick='en'; break; }
  }
  setLang(pick);
})();

/* --- copyright year --- */
(function(){
  var y = document.querySelectorAll('.yr');
  for(var i=0;i<y.length;i++) y[i].textContent = new Date().getFullYear();
})();

/* --- nav shadow --- */
(function(){
  var nav = document.querySelector('header.nav');
  if(!nav) return;
  addEventListener('scroll', function(){ nav.classList.toggle('scrolled', scrollY > 8); }, {passive:true});
})();

/* --- mobile drawer --- */
(function(){
  var burger = document.querySelector('.burger'), drawer = document.getElementById('drawer');
  if(!burger || !drawer) return;
  burger.addEventListener('click', function(){
    var open = drawer.classList.toggle('open');
    burger.setAttribute('aria-expanded', open);
  });
  var links = drawer.querySelectorAll('a');
  for(var i=0;i<links.length;i++) links[i].addEventListener('click', function(){ drawer.classList.remove('open'); });
})();

/* --- FAQ accordion --- */
(function(){
  var qs = document.querySelectorAll('.qa .q');
  for(var i=0;i<qs.length;i++){
    qs[i].addEventListener('click', function(){ this.closest('.qa').classList.toggle('open'); });
  }
})();

/* --- contact form -> mail client (recipient never shown to users) --- */
(function(){
  var f = document.getElementById('contactForm');
  if(!f) return;
  var CONTACT_EMAIL = 'jta689@hotmail.com';
  f.addEventListener('submit', function(e){
    e.preventDefault();
    function g(id){ var el = document.getElementById(id); return el ? el.value.trim() : ''; }
    var subject = 'Website enquiry — ' + g('cf-name');
    var body = 'Name: ' + g('cf-name') + '\nAge: ' + g('cf-age') + '\nEmail: ' + g('cf-email') + '\n\n' + g('cf-msg');
    location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  });
})();

/* --- scroll reveal --- */
(function(){
  var els = document.querySelectorAll('.reveal');
  if(!els.length) return;
  if(!('IntersectionObserver' in window)){
    for(var i=0;i<els.length;i++) els[i].classList.add('in');
    return;
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, {threshold:.12});
  for(var k=0;k<els.length;k++) io.observe(els[k]);
})();

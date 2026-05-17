pub const ADMIN_HTML: &str = r##"<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>PaperPhone Admin</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{--bg:#0a0a0f;--bg2:#12121a;--bg3:#1a1a28;--card:#16162a;--border:#2a2a40;--text:#e8e8f0;--text2:#8888a0;--accent:#6366f1;--accent2:#818cf8;--danger:#ef4444;--success:#22c55e;--warn:#f59e0b;--radius:12px}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:var(--bg);color:var(--text);min-height:100vh}
.login-wrap{display:flex;align-items:center;justify-content:center;min-height:100vh;padding:20px}
.login-box{background:var(--card);border:1px solid var(--border);border-radius:16px;padding:40px;width:100%;max-width:380px;text-align:center;backdrop-filter:blur(20px)}
.login-box h1{font-size:24px;margin-bottom:8px;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.login-box p{color:var(--text2);font-size:13px;margin-bottom:24px}
.input{width:100%;padding:12px 16px;border-radius:var(--radius);border:1px solid var(--border);background:var(--bg2);color:var(--text);font-size:14px;outline:none;transition:.2s}
.input:focus{border-color:var(--accent)}
.btn{padding:12px 24px;border-radius:var(--radius);border:none;font-size:14px;font-weight:600;cursor:pointer;transition:.2s;width:100%}
.btn-primary{background:linear-gradient(135deg,var(--accent),var(--accent2));color:#fff}
.btn-primary:hover{opacity:.9;transform:translateY(-1px)}
.btn-danger{background:var(--danger);color:#fff}
.btn-success{background:var(--success);color:#fff}
.btn-warn{background:var(--warn);color:#000}
.btn-sm{padding:6px 14px;font-size:12px;width:auto;border-radius:8px}
.btn:disabled{opacity:.5;cursor:not-allowed}
.err{color:var(--danger);font-size:13px;margin-top:8px}
.app{display:none}
.header{background:var(--bg2);border-bottom:1px solid var(--border);padding:12px 20px;display:flex;align-items:center;gap:16px;position:sticky;top:0;z-index:10;backdrop-filter:blur(10px)}
.header h1{font-size:18px;flex:1;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.lang-sel{padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg3);color:var(--text);font-size:12px;cursor:pointer}
.logout-btn{padding:6px 14px;border-radius:8px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:12px;cursor:pointer}
.logout-btn:hover{border-color:var(--danger);color:var(--danger)}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;padding:20px;max-width:1200px;margin:0 auto}
.stat-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:20px;text-align:center}
.stat-card .num{font-size:32px;font-weight:700;background:linear-gradient(135deg,var(--accent),var(--accent2));-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.stat-card .label{font-size:12px;color:var(--text2);margin-top:4px}
.filters{padding:0 20px;max-width:1200px;margin:16px auto;display:flex;gap:8px;flex-wrap:wrap}
.filter-btn{padding:8px 16px;border-radius:20px;border:1px solid var(--border);background:transparent;color:var(--text2);font-size:13px;cursor:pointer;transition:.2s}
.filter-btn.active{background:var(--accent);color:#fff;border-color:var(--accent)}
.reports{padding:0 20px 40px;max-width:1200px;margin:0 auto}
.report-card{background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:16px;margin-top:12px;transition:.2s}
.report-card:hover{border-color:var(--accent);transform:translateY(-1px)}
.report-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}
.report-meta{font-size:12px;color:var(--text2);display:flex;gap:12px;flex-wrap:wrap;margin-top:6px}
.badge{padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;display:inline-block}
.badge-pending{background:rgba(245,158,11,.15);color:var(--warn)}
.badge-reviewed{background:rgba(34,197,94,.15);color:var(--success)}
.badge-dismissed{background:rgba(136,136,160,.15);color:var(--text2)}
.badge-type{background:rgba(99,102,241,.15);color:var(--accent2)}
.report-detail{margin-top:8px;padding:10px 12px;background:var(--bg2);border-radius:8px;font-size:13px;color:var(--text2)}
.report-actions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.empty{text-align:center;padding:60px 20px;color:var(--text2)}
@media(max-width:600px){.stats{grid-template-columns:1fr 1fr}.header{padding:10px 14px}.reports{padding:0 12px 40px}}
</style>
</head>
<body>
<div id="login" class="login-wrap">
<div class="login-box">
<h1>🛡️ PaperPhone Admin</h1>
<p id="login-subtitle"></p>
<input class="input" type="password" id="pwd" placeholder="Password" style="margin-bottom:16px"
  onkeydown="if(event.key==='Enter')doLogin()">
<button class="btn btn-primary" onclick="doLogin()" id="login-btn"></button>
<div class="err" id="login-err"></div>
</div>
</div>
<div class="app" id="app">
<div class="header">
<h1>🛡️ PaperPhone Admin</h1>
<select class="lang-sel" id="lang-sel" onchange="setLang(this.value)"></select>
<button class="logout-btn" onclick="doLogout()" id="logout-btn"></button>
</div>
<div class="stats" id="stats"></div>
<div class="filters" id="filters"></div>
<div class="reports" id="reports"></div>
</div>
<script>
const BASE='{{ADMIN_PATH}}';
const I={
en:{login:'Log In',subtitle:'Content Moderation Dashboard',logout:'Logout',users:'Users',pending:'Pending',total_reports:'Total Reports',blocks:'Blocks',filter_all:'All',filter_pending:'Pending',filter_reviewed:'Reviewed',filter_dismissed:'Dismissed',reporter:'Reporter',target:'Target',reason:'Reason',time:'Time',detail:'Detail',review:'Review',dismiss:'Dismiss',delete_content:'Delete Content',ban_user:'Ban User',confirm_ban:'This will permanently delete the user and all their data. Continue?',confirm_delete:'Delete this content?',no_reports:'No reports found',invalid_pwd:'Invalid password',badge_pending:'Pending',badge_reviewed:'Reviewed',badge_dismissed:'Dismissed',reason_offensive:'Offensive',reason_spam:'Spam',reason_harassment:'Harassment',reason_violence:'Violence',reason_misinformation:'Misinfo',reason_other:'Other'},
zh:{login:'登录',subtitle:'内容审核管理面板',logout:'退出',users:'用户数',pending:'待处理',total_reports:'总举报',blocks:'拉黑数',filter_all:'全部',filter_pending:'待处理',filter_reviewed:'已审核',filter_dismissed:'已驳回',reporter:'举报人',target:'目标',reason:'原因',time:'时间',detail:'详情',review:'审核通过',dismiss:'驳回',delete_content:'删除内容',ban_user:'封禁用户',confirm_ban:'此操作将永久删除该用户及其所有数据，是否继续？',confirm_delete:'确定删除此内容？',no_reports:'暂无举报',invalid_pwd:'密码错误',badge_pending:'待处理',badge_reviewed:'已审核',badge_dismissed:'已驳回',reason_offensive:'不当内容',reason_spam:'垃圾信息',reason_harassment:'骚扰',reason_violence:'暴力',reason_misinformation:'虚假信息',reason_other:'其他'},
ja:{login:'ログイン',subtitle:'コンテンツモデレーション',logout:'ログアウト',users:'ユーザー',pending:'未処理',total_reports:'報告総数',blocks:'ブロック',filter_all:'すべて',filter_pending:'未処理',filter_reviewed:'確認済',filter_dismissed:'却下',reporter:'報告者',target:'対象',reason:'理由',time:'日時',detail:'詳細',review:'確認',dismiss:'却下',delete_content:'コンテンツ削除',ban_user:'ユーザーBAN',confirm_ban:'ユーザーとすべてのデータを永久に削除しますか？',confirm_delete:'このコンテンツを削除しますか？',no_reports:'報告なし',invalid_pwd:'パスワードが違います',badge_pending:'未処理',badge_reviewed:'確認済',badge_dismissed:'却下',reason_offensive:'不適切',reason_spam:'スパム',reason_harassment:'嫌がらせ',reason_violence:'暴力',reason_misinformation:'誤情報',reason_other:'その他'},
ko:{login:'로그인',subtitle:'콘텐츠 관리 대시보드',logout:'로그아웃',users:'사용자',pending:'대기중',total_reports:'총 신고',blocks:'차단',filter_all:'전체',filter_pending:'대기중',filter_reviewed:'검토됨',filter_dismissed:'기각',reporter:'신고자',target:'대상',reason:'사유',time:'시간',detail:'상세',review:'검토',dismiss:'기각',delete_content:'콘텐츠 삭제',ban_user:'사용자 차단',confirm_ban:'사용자와 모든 데이터를 영구 삭제하시겠습니까?',confirm_delete:'이 콘텐츠를 삭제하시겠습니까?',no_reports:'신고 없음',invalid_pwd:'비밀번호 오류',badge_pending:'대기중',badge_reviewed:'검토됨',badge_dismissed:'기각',reason_offensive:'부적절',reason_spam:'스팸',reason_harassment:'괴롭힘',reason_violence:'폭력',reason_misinformation:'허위정보',reason_other:'기타'},
fr:{login:'Connexion',subtitle:'Modération de contenu',logout:'Déconnexion',users:'Utilisateurs',pending:'En attente',total_reports:'Signalements',blocks:'Blocages',filter_all:'Tous',filter_pending:'En attente',filter_reviewed:'Examiné',filter_dismissed:'Rejeté',reporter:'Signaleur',target:'Cible',reason:'Raison',time:'Date',detail:'Détail',review:'Examiner',dismiss:'Rejeter',delete_content:'Supprimer',ban_user:'Bannir',confirm_ban:'Supprimer définitivement cet utilisateur et toutes ses données ?',confirm_delete:'Supprimer ce contenu ?',no_reports:'Aucun signalement',invalid_pwd:'Mot de passe incorrect',badge_pending:'En attente',badge_reviewed:'Examiné',badge_dismissed:'Rejeté',reason_offensive:'Offensant',reason_spam:'Spam',reason_harassment:'Harcèlement',reason_violence:'Violence',reason_misinformation:'Désinformation',reason_other:'Autre'},
de:{login:'Anmelden',subtitle:'Inhaltsmoderation',logout:'Abmelden',users:'Benutzer',pending:'Ausstehend',total_reports:'Meldungen',blocks:'Blockiert',filter_all:'Alle',filter_pending:'Ausstehend',filter_reviewed:'Geprüft',filter_dismissed:'Abgelehnt',reporter:'Melder',target:'Ziel',reason:'Grund',time:'Zeit',detail:'Detail',review:'Prüfen',dismiss:'Ablehnen',delete_content:'Löschen',ban_user:'Sperren',confirm_ban:'Benutzer und alle Daten dauerhaft löschen?',confirm_delete:'Diesen Inhalt löschen?',no_reports:'Keine Meldungen',invalid_pwd:'Falsches Passwort',badge_pending:'Ausstehend',badge_reviewed:'Geprüft',badge_dismissed:'Abgelehnt',reason_offensive:'Anstößig',reason_spam:'Spam',reason_harassment:'Belästigung',reason_violence:'Gewalt',reason_misinformation:'Falschinfo',reason_other:'Sonstiges'},
es:{login:'Iniciar sesión',subtitle:'Panel de moderación',logout:'Cerrar sesión',users:'Usuarios',pending:'Pendiente',total_reports:'Reportes',blocks:'Bloqueos',filter_all:'Todos',filter_pending:'Pendiente',filter_reviewed:'Revisado',filter_dismissed:'Descartado',reporter:'Reportador',target:'Objetivo',reason:'Razón',time:'Fecha',detail:'Detalle',review:'Revisar',dismiss:'Descartar',delete_content:'Eliminar',ban_user:'Banear',confirm_ban:'¿Eliminar permanentemente este usuario y todos sus datos?',confirm_delete:'¿Eliminar este contenido?',no_reports:'Sin reportes',invalid_pwd:'Contraseña incorrecta',badge_pending:'Pendiente',badge_reviewed:'Revisado',badge_dismissed:'Descartado',reason_offensive:'Ofensivo',reason_spam:'Spam',reason_harassment:'Acoso',reason_violence:'Violencia',reason_misinformation:'Desinformación',reason_other:'Otro'},
ru:{login:'Войти',subtitle:'Панель модерации',logout:'Выход',users:'Пользователи',pending:'Ожидает',total_reports:'Жалобы',blocks:'Блокировки',filter_all:'Все',filter_pending:'Ожидает',filter_reviewed:'Рассмотрено',filter_dismissed:'Отклонено',reporter:'Отправитель',target:'Цель',reason:'Причина',time:'Дата',detail:'Подробности',review:'Рассмотреть',dismiss:'Отклонить',delete_content:'Удалить',ban_user:'Забанить',confirm_ban:'Удалить пользователя и все данные навсегда?',confirm_delete:'Удалить контент?',no_reports:'Нет жалоб',invalid_pwd:'Неверный пароль',badge_pending:'Ожидает',badge_reviewed:'Рассмотрено',badge_dismissed:'Отклонено',reason_offensive:'Оскорбление',reason_spam:'Спам',reason_harassment:'Травля',reason_violence:'Насилие',reason_misinformation:'Дезинфо',reason_other:'Другое'}
};
let L='en',token=localStorage.getItem('admin_token');
function t(k){return(I[L]||I.en)[k]||k}
function setLang(l){L=l;localStorage.setItem('admin_lang',l);renderAll()}
function $(id){return document.getElementById(id)}
async function api(path,opt={}){
  const h={'Content-Type':'application/json'};
  if(token)h['Authorization']='Bearer '+token;
  const r=await fetch(BASE+'/api'+path,{...opt,headers:{...h,...(opt.headers||{})}});
  if(!r.ok)throw await r.json().catch(()=>({error:'Error'}));
  return r.json();
}
async function doLogin(){
  const pw=$('pwd').value;if(!pw)return;
  try{const r=await api('/login',{method:'POST',body:JSON.stringify({password:pw})});
    token=r.token;localStorage.setItem('admin_token',token);showApp();
  }catch(e){$('login-err').textContent=t('invalid_pwd')}
}
function doLogout(){token=null;localStorage.removeItem('admin_token');showLogin()}
function showLogin(){$('login').style.display='flex';$('app').style.display='none';renderLogin()}
function showApp(){$('login').style.display='none';$('app').style.display='block';renderAll();loadData()}
function renderLogin(){
  $('login-subtitle').textContent=t('subtitle');
  $('login-btn').textContent=t('login');
  $('pwd').placeholder='Password';$('login-err').textContent='';
}
let stats={},reports=[],curFilter='pending';
async function loadData(){
  try{stats=await api('/stats')}catch(e){doLogout();return}
  try{reports=await api('/reports?status='+(curFilter==='all'?'all':curFilter))}catch(e){reports=[]}
  renderAll();
}
function renderAll(){
  renderLogin();
  // Lang selector
  const ls=$('lang-sel');ls.innerHTML='';
  for(const k of Object.keys(I)){const o=document.createElement('option');o.value=k;o.textContent=k.toUpperCase();if(k===L)o.selected=true;ls.appendChild(o)}
  $('logout-btn').textContent=t('logout');
  // Stats
  $('stats').innerHTML=`
    <div class="stat-card"><div class="num">${stats.users||0}</div><div class="label">${t('users')}</div></div>
    <div class="stat-card"><div class="num">${stats.reports_pending||0}</div><div class="label">${t('pending')}</div></div>
    <div class="stat-card"><div class="num">${stats.reports_total||0}</div><div class="label">${t('total_reports')}</div></div>
    <div class="stat-card"><div class="num">${stats.blocks||0}</div><div class="label">${t('blocks')}</div></div>`;
  // Filters
  const fk=[['pending','filter_pending'],['all','filter_all'],['reviewed','filter_reviewed'],['dismissed','filter_dismissed']];
  $('filters').innerHTML=fk.map(([v,k])=>`<button class="filter-btn${curFilter===v?' active':''}" onclick="setFilter('${v}')">${t(k)}</button>`).join('');
  // Reports
  if(!reports.length){$('reports').innerHTML=`<div class="empty">${t('no_reports')}</div>`;return}
  $('reports').innerHTML=reports.map(r=>{
    const badge=r.status==='pending'?'badge-pending':r.status==='reviewed'?'badge-reviewed':'badge-dismissed';
    const reasonKey='reason_'+(r.reason||'other');
    const d=new Date(r.created_at);const ts=d.toLocaleString();
    const canAct=r.status==='pending';
    const canDel=r.target_type==='moment'||r.target_type==='timeline_post';
    return `<div class="report-card">
      <div class="report-head">
        <div><span class="badge badge-type">${r.target_type}</span> <span class="badge ${badge}">${t('badge_'+r.status)}</span>
        <div class="report-meta"><span>${t('reporter')}: ${r.reporter_id.slice(0,8)}…</span><span>${t('target')}: ${r.target_id}</span><span>${t('reason')}: ${t(reasonKey)}</span><span>${t('time')}: ${ts}</span></div></div>
      </div>
      ${r.detail?`<div class="report-detail">${esc(r.detail)}</div>`:''}
      <div class="report-actions">
        ${canAct?`<button class="btn btn-sm btn-success" onclick="actReview(${r.id})">${t('review')}</button>
        <button class="btn btn-sm btn-warn" onclick="actDismiss(${r.id})">${t('dismiss')}</button>`:''}
        ${canDel?`<button class="btn btn-sm btn-danger" onclick="actDelete('${r.target_type}','${r.target_id}')">${t('delete_content')}</button>`:''}
        ${r.target_type==='user'?`<button class="btn btn-sm btn-danger" onclick="actBan('${r.target_id}')">${t('ban_user')}</button>`:''}
      </div>
    </div>`}).join('');
}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function setFilter(f){curFilter=f;loadData()}
async function actReview(id){try{await api(`/reports/${id}/review`,{method:'POST'});loadData()}catch(e){alert(e.error||'Error')}}
async function actDismiss(id){try{await api(`/reports/${id}/dismiss`,{method:'POST'});loadData()}catch(e){alert(e.error||'Error')}}
async function actDelete(type,id){if(!confirm(t('confirm_delete')))return;try{await api(`/content/${type}/${id}`,{method:'DELETE'});loadData()}catch(e){alert(e.error||'Error')}}
async function actBan(id){if(!confirm(t('confirm_ban')))return;try{await api(`/users/${id}/ban`,{method:'POST'});loadData()}catch(e){alert(e.error||'Error')}}
// Init
L=localStorage.getItem('admin_lang')||'en';
if(token){showApp()}else{showLogin()}
</script>
</body>
</html>"##;

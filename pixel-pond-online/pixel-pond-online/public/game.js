const socket = io({ transports: ['websocket', 'polling'] });
const canvas = document.getElementById('game'), ctx = canvas.getContext('2d');
const W=960,H=600; let me=null, room='pond-1', players=new Map(), keys={}, lastMove=0, fishing=false;
const water={x:285,y:95,w:390,h:410};
const $=id=>document.getElementById(id);
const nameInput=$('name-input'), roomInput=$('room-input');
nameInput.value=localStorage.getItem('pond-name')||'Angler';
roomInput.value=new URLSearchParams(location.search).get('room')||'pond-1';
function join(){ room=roomInput.value.trim()||'pond-1'; localStorage.setItem('pond-name',nameInput.value.trim()); socket.emit('join',{room,name:nameInput.value},res=>{if(!res.ok){$('join-error').textContent=res.error;return} me=res.id;players=new Map(res.players.map(p=>[p.id,p]));$('join-screen').style.display='none';$('room-label').textContent=room;$('player-count').textContent=`${players.size}/30 ONLINE`;renderPlayers();}); }
$('join-btn').onclick=join;
socket.on('connect',()=>{if(me===null && $('join-screen').style.display==='none')join()});
socket.on('player:joined',p=>{players.set(p.id,p);renderPlayers();});
socket.on('player:moved',p=>{const old=players.get(p.id);if(old)Object.assign(old,p);});
socket.on('player:stats',p=>{const old=players.get(p.id);if(old)Object.assign(old,p);if(p.id===me)updateStats(p);renderPlayers();});
socket.on('player:left',id=>{players.delete(id);renderPlayers();});
socket.on('room:count',n=>$('player-count').textContent=`${n}/30 ONLINE`);
socket.on('system:message',msg=>addChat(msg,true));
socket.on('chat:message',m=>addChat(`${m.name}: ${m.text}`));
function renderPlayers(){$('player-list').innerHTML='';for(const p of players.values()){const row=document.createElement('div');row.className='player-row';row.innerHTML=`<span>● ${escapeHtml(p.name)} ${p.id===me?'(kamu)':''}</span><small>Lv.${p.level||1}</small>`;$('player-list').appendChild(row)}}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function addChat(text,system=false){const p=document.createElement('p');p.className=system?'system':'';p.textContent=text;$('chat-log').appendChild(p);$('chat-log').scrollTop=$('chat-log').scrollHeight}
function updateStats(p){$('coins').textContent=`🪙 ${p.coins||0}`;$('level').textContent=`LV ${p.level||1}`;$('level-side').textContent=p.level||1;$('fish-count').textContent=p.fish||0}
$('chat-form').addEventListener('submit',e=>{e.preventDefault();const v=$('chat-input').value.trim();if(v){socket.emit('chat:send',v);$('chat-input').value=''}});
function fish(){if(!me||fishing)return;const p=players.get(me);if(!p)return;const dx=Math.max(water.x-p.x,0,p.x-(water.x+water.w)),dy=Math.max(water.y-p.y,0,p.y-(water.y+water.h));if(Math.hypot(dx,dy)>95){$('catch-result').textContent='Dekati tepi danau dulu untuk memancing.';return}fishing=true;$('fish-btn').disabled=true;$('catch-result').textContent='Menunggu ikan menggigit...';socket.emit('fish:cast',{},res=>{if(res.ok){$('catch-result').textContent=`🎉 ${res.fish}  +${res.coins} koin`;updateStats({coins:res.totalCoins,fish:res.fishCount,level:res.level});const p=players.get(me);if(p)Object.assign(p,{coins:res.totalCoins,fish:res.fishCount,level:res.level});renderPlayers()}else $('catch-result').textContent=res.error;setTimeout(()=>{fishing=false;$('fish-btn').disabled=false},3500)})}
$('fish-btn').onclick=fish;$('mobile-fish').onclick=fish;
window.addEventListener('keydown',e=>{if(['INPUT'].includes(document.activeElement.tagName))return;keys[e.key.toLowerCase()]=true;if(e.code==='Space'){e.preventDefault();fish()}});window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
document.querySelectorAll('[data-dir]').forEach(b=>{const d=b.dataset.dir;b.addEventListener('pointerdown',e=>{e.preventDefault();keys['mobile-'+d]=true});['pointerup','pointerleave','pointercancel'].forEach(ev=>b.addEventListener(ev,()=>keys['mobile-'+d]=false))});
function move(){const p=players.get(me);if(p){let dx=0,dy=0;if(keys.w||keys.arrowup||keys['mobile-up'])dy--;if(keys.s||keys.arrowdown||keys['mobile-down'])dy++;if(keys.a||keys.arrowleft||keys['mobile-left'])dx--;if(keys.d||keys.arrowright||keys['mobile-right'])dx++;if(dx||dy){const len=Math.hypot(dx,dy);p.x=Math.max(28,Math.min(932,p.x+dx/len*3));p.y=Math.max(28,Math.min(572,p.y+dy/len*3));if(performance.now()-lastMove>45){socket.emit('player:move',{x:p.x,y:p.y});lastMove=performance.now()}}} }
function rounded(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function draw(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#8bcf91';ctx.fillRect(0,0,W,H);
// grass tiles
for(let y=0;y<H;y+=32)for(let x=0;x<W;x+=32){ctx.fillStyle=((x/32+y/32)%2)?'#8acb8d':'#94d396';ctx.fillRect(x,y,32,32)}
// shoreline and lake
rounded(265,75,430,450,70,'#d9c58b');rounded(278,86,404,428,64,'#58bfc0');rounded(294,102,372,396,58,'#45aeb8');
// water ripples
for(let i=0;i<25;i++){let x=310+(i*67)%330,y=125+(i*91)%340;ctx.strokeStyle='#a3e7d8';ctx.globalAlpha=.4;ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,8+(i%4)*4,.2,2.6);ctx.stroke()}ctx.globalAlpha=1;
// dock
rounded(435,42,150,80,8,'#805638');for(let x=445;x<580;x+=22){ctx.fillStyle='#b9804e';ctx.fillRect(x,47,15,70)}
// trees and rocks
for(const [x,y,s] of [[90,110,1],[180,475,.8],[790,110,1.1],[850,470,.9],[110,350,.8],[770,320,.8]]){ctx.fillStyle='#80583d';ctx.fillRect(x-5*s,y,10*s,24*s);ctx.fillStyle='#347e55';ctx.beginPath();ctx.arc(x,y,24*s,0,Math.PI*2);ctx.fill();ctx.fillStyle='#58a96c';ctx.beginPath();ctx.arc(x-8*s,y-8*s,13*s,0,Math.PI*2);ctx.fill()}
// decorations
for(let i=0;i<22;i++){let x=(i*137+37)%W,y=(i*83+30)%H;if(x>260&&x<700&&y>70&&y<530)continue;ctx.fillStyle=i%2?'#f4e08b':'#f7a7a9';ctx.beginPath();ctx.arc(x,y,3,0,Math.PI*2);ctx.fill()}
// fish silhouettes
for(let i=0;i<6;i++){let x=330+(i*59)%290,y=145+(i*73)%320;ctx.fillStyle='#d2f1d6';ctx.beginPath();ctx.ellipse(x,y,8,4,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.moveTo(x-7,y);ctx.lineTo(x-14,y-5);ctx.lineTo(x-14,y+5);ctx.fill()}
// players
for(const p of players.values()){const isMe=p.id===me;ctx.fillStyle='#15374866';ctx.beginPath();ctx.ellipse(p.x,p.y+13,14,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=p.color||'#ff9f43';ctx.beginPath();ctx.arc(p.x,p.y,12,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe5bd';ctx.beginPath();ctx.arc(p.x,p.y-2,7,0,Math.PI*2);ctx.fill();ctx.fillStyle='#18354a';ctx.fillRect(p.x-4,p.y-4,2,2);ctx.fillRect(p.x+3,p.y-4,2,2);if(isMe){ctx.strokeStyle='#fff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p.x,p.y,16,0,Math.PI*2);ctx.stroke()}ctx.font='bold 12px Nunito';ctx.textAlign='center';ctx.lineWidth=3;ctx.strokeStyle='#173849';ctx.strokeText(p.name,p.x,p.y-20);ctx.fillStyle='#fff';ctx.fillText(p.name,p.x,p.y-20)}
ctx.textAlign='left';ctx.font='bold 13px Nunito';ctx.fillStyle='#173849';ctx.fillText('PIXEL POND · FISHING SPOT',18,28);
}
function loop(){move();draw();requestAnimationFrame(loop)}loop();

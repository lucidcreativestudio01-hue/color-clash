const socket = io(),
  lobby = document.querySelector('#lobby'),
  game = document.querySelector('#game'),
  nameInput = document.querySelector('#name'),
  joinBtn = document.querySelector('#join'),
  statusEl = document.querySelector('#status'),
  canvas = document.querySelector('#board'),
  ctx = canvas.getContext('2d'),
  scores = document.querySelector('#scores'),
  winner = document.querySelector('#winner');

let state = {
  players: [],
  orb: { x: 500, y: 300 }
};

const keys = new Set();

/* =========================
   KEYBOARD CONTROLS
========================= */

joinBtn.onclick = () => {
  socket.emit('join', nameInput.value.trim() || 'Player');
  lobby.classList.add('hidden');
  game.classList.remove('hidden');
};

nameInput.onkeydown = e => {
  if (e.key === 'Enter') joinBtn.click();
};

onkeydown = e => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
  }
  keys.add(e.key.toLowerCase());
};

onkeyup = e => keys.delete(e.key.toLowerCase());

/* =========================
   MOBILE TOUCH CONTROLS
========================= */

const mobileControls = document.createElement('div');
mobileControls.id = 'mobile-controls';

mobileControls.innerHTML = `
  <div class="touch-row">
    <button class="touch-btn" data-key="arrowup">▲</button>
  </div>
  <div class="touch-row">
    <button class="touch-btn" data-key="arrowleft">◀</button>
    <button class="touch-btn" data-key="arrowdown">▼</button>
    <button class="touch-btn" data-key="arrowright">▶</button>
  </div>
`;

document.body.appendChild(mobileControls);

/* Mobile control styling */
const mobileStyle = document.createElement('style');

mobileStyle.textContent = `
  #mobile-controls {
    display: none;
    position: fixed;
    left: 50%;
    bottom: 24px;
    transform: translateX(-50%);
    z-index: 9999;
    user-select: none;
    -webkit-user-select: none;
    touch-action: none;
  }

  .touch-row {
    display: flex;
    justify-content: center;
    gap: 8px;
    margin: 8px 0;
  }

  .touch-btn {
    width: 62px;
    height: 62px;
    border-radius: 16px;
    border: 2px solid rgba(255,255,255,.35);
    background: rgba(20,20,35,.88);
    color: white;
    font-size: 25px;
    font-weight: 900;
    display: grid;
    place-items: center;
    padding: 0;
    margin: 0;
    touch-action: none;
    -webkit-tap-highlight-color: transparent;
  }

  .touch-btn:active,
  .touch-btn.active {
    background: #a7e6a7;
    color: #102015;
    transform: scale(.94);
  }

  @media (max-width: 800px), (pointer: coarse) {
    #mobile-controls {
      display: block;
    }

    .hint {
      margin-bottom: 150px;
    }
  }
`;

document.head.appendChild(mobileStyle);

/* Make touch buttons behave like held keyboard keys */
document.querySelectorAll('.touch-btn').forEach(button => {
  const key = button.dataset.key;

  const start = e => {
    e.preventDefault();
    keys.add(key);
    button.classList.add('active');
  };

  const stop = e => {
    e.preventDefault();
    keys.delete(key);
    button.classList.remove('active');
  };

  button.addEventListener('pointerdown', start);
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', stop);
});

/* =========================
   SEND MOVEMENT
========================= */

setInterval(() => {
  let dx = 0;
  let dy = 0;

  if (keys.has('w') || keys.has('arrowup')) dy--;
  if (keys.has('s') || keys.has('arrowdown')) dy++;
  if (keys.has('a') || keys.has('arrowleft')) dx--;
  if (keys.has('d') || keys.has('arrowright')) dx++;

  if (dx || dy) {
    socket.emit('move', { dx, dy });
  }
}, 50);

/* =========================
   MULTIPLAYER STATE
========================= */

socket.on('state', d => {
  state = d;

  statusEl.textContent =
    `${d.players.length} player${d.players.length === 1 ? '' : 's'} online`;

  scores.innerHTML = [...d.players]
    .sort((a, b) => b.score - a.score)
    .map(p => `
      <div class="score">
        <span>
          <i class="dot" style="background:${p.color}"></i>
          ${esc(p.name)}
        </span>
        <b>${p.score}</b>
      </div>
    `)
    .join('');
});

socket.on('winner', d => {
  winner.textContent = `${d.name} wins!`;
  winner.classList.remove('hidden');

  setTimeout(() => {
    winner.classList.add('hidden');
  }, 2200);
});

/* =========================
   SECURITY
========================= */

function esc(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }[c]));
}

/* =========================
   DRAW GAME
========================= */

function draw() {
  ctx.clearRect(0, 0, 1000, 600);

  ctx.strokeStyle = '#202032';

  for (let x = 0; x <= 1000; x += 50) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, 600);
    ctx.stroke();
  }

  for (let y = 0; y <= 600; y += 50) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(1000, y);
    ctx.stroke();
  }

  ctx.beginPath();
  ctx.arc(
    state.orb.x,
    state.orb.y,
    14 + Math.sin(Date.now() / 150) * 3,
    0,
    Math.PI * 2
  );

  ctx.fillStyle = '#a7e6a7';
  ctx.fill();

  for (const p of state.players) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.fillStyle = p.color;
    ctx.fill();

    if (p.id === socket.id) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 23, 0, Math.PI * 2);
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(p.name, p.x, p.y - 28);
  }

  requestAnimationFrame(draw);
}

draw();

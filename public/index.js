const $ = id => document.getElementById(id);
let token = null,
  user = null,
  socket = null;

function setStatus(id, text, error = false) {
  $(id).textContent = text;
  $(id).style.color = error ? '#b42318' : '';
}
function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}
function setLoggedIn(value) {
  $('createBtn').disabled = !value;
  $('loadBtn').disabled = !value;
  $('logoutBtn').disabled = !value;
}
function setCount(n) {
  $('unreadCount').textContent = `Непрочитано: ${n}`;
}
function connectSocket() {
  if (socket) socket.disconnect();
  socket = io('http://localhost:3000', {auth: { token: token }, transports: ['websocket', 'polling']});
  $('socketState').textContent = 'Socket: подключение…';
  socket.on('connect', () => ($('socketState').textContent = 'Socket: подключён'));
  socket.on('disconnect', () => ($('socketState').textContent = 'Socket: отключён'));
  socket.on('connect_error', e => {
    $('socketState').textContent = 'Socket: ошибка авторизации';
    console.error(e.message);
  });
  socket.on('notification:new', n => {
    prependNotification(n);
    setStatus('createStatus', 'Новое уведомление получено в реальном времени.');
  });
  socket.on('notification:count', data => setCount(data.unread));
  socket.on('notification:pong', data => console.log('pong', data));
}
function renderNotification(n) {
  const article = document.createElement('article');
  article.className = 'notice' + (!n.read ? ' unread' : '');
  article.dataset.id = n.id;
  const date = new Date(n.createdAt).toLocaleString();
  article.innerHTML = `
        <div class="notice-head"><span class="tag">${n.type}</span>
          <span class="muted">${n.read ? 'Прочитано' : 'Новое'}</span>
          </div>
          <h3>${n.title}</h3>
          <p>${n.body}</p>
          <div class="notice-head">
            <small>${date}</small>${
              n.read
                ? ''
                : `
            <button type="button" class="secondary read-btn" data-id="${n.id}">
              Отметить прочитанным</button>`
            }
              </div>`;
  return article;
}
function prependNotification(n) {
  const list = $('notifications');
  const old = list.querySelector(`[data-id="${CSS.escape(n.id)}"]`);
  if (old) old.remove();
  if (list.querySelector('.empty')) list.innerHTML = '';
  list.prepend(renderNotification(n));
  while (list.children.length > 100) list.lastElementChild.remove();
}
async function loadNotifications() {
  const token = localStorage.getItem('token');

  console.log('Loading notifications; token exists:', Boolean(token));
  if (!token) return;
  try {
    const url = 'http://localhost:3000/api/notifications?limit=100&unreadOnly=' + $('filter').value;
    const r = await fetch(url, { headers: authHeaders() });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Не удалось загрузить уведомления');
    const list = $('notifications');
    list.innerHTML = '';
    if (!data.notifications.length)
      list.innerHTML = '<div class="empty">Уведомлений пока нет.</div>';
    else data.notifications.forEach(n => list.append(renderNotification(n)));
    setCount(data.unread);
     console.log('History status:', response.status);
     console.log('History response:', data);
  } catch (e) {
    setStatus('createStatus', e.message, true);
  }
}
$('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const username = $('username').value.trim();
  try {
    const r = await fetch('http://localhost:3000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Вход не выполнен');
    token = data.token;
    user = data.user;
    localStorage.setItem('token', data.token);

    console.log('Token saved:', Boolean(localStorage.getItem('token')));
    $('token').textContent = token;
    $('userInfo').textContent = `Пользователь: ${user.username} (${user.id})`;
    $('tokenWrap').classList.remove('hidden');
    setStatus('loginStatus', 'Вход выполнен.');
    setLoggedIn(true);
    connectSocket();
    await loadNotifications();
  } catch (err) {
    setStatus('loginStatus', err.message, true);
  }
});
$('createForm').addEventListener('submit', async e => {
  e.preventDefault();
  if (!token) return;
  try {
    const r = await fetch('http://localhost:3000/api/notifications', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        type: $('type').value,
        title: $('title').value,
        body: $('body').value,
      }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Не удалось создать уведомление');
    prependNotification(data);
    setStatus('createStatus', 'Уведомление сохранено и отправлено через Socket.IO.');
  } catch (err) {
    setStatus('createStatus', err.message, true);
  }
});
$('notifications').addEventListener('click', async e => {
  const btn = e.target.closest('.read-btn');
  if (!btn || !token) return;
  btn.disabled = true;
  try {
    const r = await fetch(
      `http://localhost:3000/api/notifications/${encodeURIComponent(btn.dataset.id)}/read`,
      {
        method: 'PATCH',
        headers: authHeaders(),
      }
    );
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || 'Не удалось обновить уведомление');
    await loadNotifications();
  } catch (err) {
    btn.disabled = false;
    setStatus('createStatus', err.message, true);
  }
});
$('loadBtn').addEventListener('click', loadNotifications);
$('filter').addEventListener('change', loadNotifications);
$('logoutBtn').addEventListener('click', () => {
  if (socket) socket.disconnect();
  socket = null;
  token = null;
  user = null;
  $('tokenWrap').classList.add('hidden');
  $('token').textContent = '';
  setLoggedIn(false);
  setCount(0);
  $('socketState').textContent = 'Socket: отключён';
  $('notifications').innerHTML = '<div class="empty">Сначала войдите в систему.</div>';
  setStatus('loginStatus', 'Вы вышли из системы.');
});

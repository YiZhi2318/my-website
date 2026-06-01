// ===== 导航栏滚动效果 =====
window.addEventListener('scroll', () => {
  const nav = document.getElementById('navbar');
  nav.classList.toggle('scrolled', window.scrollY > 60);

  // 高亮当前 section 对应的导航项
  const sections = document.querySelectorAll('section');
  const links = document.querySelectorAll('.nav-links a');
  let current = '';
  sections.forEach(s => {
    const top = s.offsetTop - 120;
    if (window.scrollY >= top) current = s.getAttribute('id');
  });
  links.forEach(a => {
    a.classList.toggle('active', a.getAttribute('href') === '#' + current);
  });
});

// ===== 移动端菜单 =====
function toggleMenu() {
  document.querySelector('.nav-links').classList.toggle('open');
}
document.querySelectorAll('.nav-links a').forEach(a => {
  a.addEventListener('click', () => {
    document.querySelector('.nav-links').classList.remove('open');
  });
});

// ===== 弹窗 =====
function openModal(id) {
  document.getElementById(id).classList.add('show');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  document.getElementById(id).classList.remove('show');
  document.body.style.overflow = '';
}
// 点击背景关闭
document.querySelectorAll('.modal').forEach(m => {
  m.addEventListener('click', (e) => {
    if (e.target === m) { closeModal(m.id); }
  });
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal.show').forEach(m => closeModal(m.id));
  }
});

// ===== 技能条动画（滚动进入视口时触发） =====
const skillObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.querySelectorAll('.fill').forEach(fill => {
        fill.style.width = fill.style.width; // re-trigger CSS transition
      });
    }
  });
}, { threshold: 0.5 });

const skillSection = document.querySelector('#skills');
if (skillSection) skillObserver.observe(skillSection);

// ===== 控制台彩蛋 =====
console.log('%c 廖泰扬 | 个人主页 ',
  'background: #1a3a5c; color: #e8913a; font-size: 20px; font-weight: bold; padding: 12px 24px; border-radius: 8px;');

// ======================================================================
// 📅 签到 & 💬 留言板 (数据存储在 Gitee 码云)
// ======================================================================
//
// ⚙️ 使用前需配置 Gitee Private Token（仅写入需要）：
//   1. 打开 https://gitee.com/profile/personal_access_tokens
//   2. 点「生成新令牌」→ 填写描述 → 全选权限 → 生成
//   3. 复制 token 替换下方 `__GITEE_TOKEN__`
// ======================================================================

// ⚠️ 请把 __GITEE_TOKEN__ 换成你的 Gitee 私人令牌！
//    如果还没创建，先留空也能读数据，但不能写（签到和留言不可用）
const CONFIG = {
  owner: 'Lty239583',            // Gitee 用户名
  repo: 'my-website',            // 仓库名
  branch: 'master',              // 分支名
  token: '__GITEE_TOKEN__',      // Gitee 私人令牌（用来写入数据）
};

// ---- Gitee API 基础路径 ----
const GITEE_API = `https://gitee.com/api/v5/repos/${CONFIG.owner}/${CONFIG.repo}/contents/_data`;

// ---- 工具函数 ----
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function formatTime(iso) {
  const d = new Date(iso);
  return `${d.getMonth()+1}月${d.getDate()}日 ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// UTF-8 安全的 base64
function utf8ToBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}
function base64ToUtf8(str) {
  return decodeURIComponent(escape(atob(str)));
}

// ---- 带超时的 fetch ----
async function fetchWithTimeout(url, options = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ---- 检查 Token ----
function checkToken() {
  if (!CONFIG.token || CONFIG.token === '__GITEE_TOKEN__') {
    throw new Error('请先配置 Gitee Token\n创建地址：https://gitee.com/profile/personal_access_tokens');
  }
}

// ---- Gitee 数据读取（API，base64 解码）----
async function readJSON(filename) {
  try {
    const url = `${GITEE_API}/${filename}?ref=${CONFIG.branch}&t=${Date.now()}`;
    const res = await fetchWithTimeout(url, {}, 8000);
    if (!res.ok) return [];
    const data = await res.json();
    if (data.type === 'file' && data.content) {
      return JSON.parse(base64ToUtf8(data.content));
    }
    return [];
  } catch (e) {
    if (e.name === 'AbortError') {
      console.warn('读取超时');
    } else {
      console.error('读取失败:', e);
    }
    return [];
  }
}

// ---- Gitee 数据写入（Contents API）----
async function writeJSON(filename, updater) {
  checkToken();

  // 1. 读取当前文件信息（获取 SHA）
  let sha;
  try {
    const metaRes = await fetchWithTimeout(`${GITEE_API}/${filename}?ref=${CONFIG.branch}&access_token=${CONFIG.token}`, {}, 10000);
    if (metaRes.ok) {
      const meta = await metaRes.json();
      sha = meta.sha;
    }
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('连接 Gitee 超时');
  }

  // 2. 读取现有数据
  let data = [];
  if (sha) {
    data = await readJSON(filename);
  }

  // 3. 合并数据
  const newData = await updater(data);

  // 4. 写回 Gitee
  const content = utf8ToBase64(JSON.stringify(newData, null, 2));
  const body = {
    content: content,
    message: `update ${filename}`,
    branch: CONFIG.branch,
  };
  if (sha) body.sha = sha;

  const res = await fetchWithTimeout(`${GITEE_API}/${filename}?access_token=${CONFIG.token}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }, 10000);

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`写入失败: ${err.message}`);
  }

  return newData;
}

// ---- 页面加载时刷新 ----
window.addEventListener('DOMContentLoaded', () => {
  refreshCheckin();
  refreshMessages();
  // 回车签到
  setTimeout(() => {
    const inp = document.getElementById('checkinName');
    if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') doCheckin(); });
  }, 100);
});

// ==============================
// 📅 计算连续签到天数
// ==============================
async function calcStreak(nickname, allCheckins) {
  const userDates = allCheckins
    .filter(c => c.nickname === nickname)
    .map(c => c.date)
    .sort((a, b) => b.localeCompare(a)); // 降序

  if (userDates.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < userDates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedDate = expected.toISOString().slice(0, 10);
    if (userDates[i] === expectedDate) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

// ==============================
// 📅 签到功能
// ==============================
async function refreshCheckin() {
  const today = todayStr();
  const listEl = document.getElementById('checkinList');
  const msgEl = document.getElementById('checkinMsg');

  try {
    const allData = await readJSON('checkins.json');
    const todayCheckins = allData.filter(c => c.date === today);

    if (todayCheckins.length === 0) {
      listEl.innerHTML = '<div class="gb-empty">今天还没有人签到，来当第一个吧 🎯</div>';
      msgEl.textContent = '今日已签到：0 人';
    } else {
      // 去重
      const seen = new Set();
      const unique = todayCheckins.filter(c => {
        if (seen.has(c.nickname)) return false;
        seen.add(c.nickname);
        return true;
      });

      // 计算每个人的连续签到
      const items = await Promise.all(unique.map(async c => {
        const streak = await calcStreak(c.nickname, allData);
        const badge = streak > 1 ? `<span class="streak">🔥${streak}天</span>` : '';
        return `<div class="checkin-item">✅ ${escapeHtml(c.nickname)} ${badge}</div>`;
      }));

      listEl.innerHTML = items.join('');
      msgEl.textContent = `今日已签到：${unique.length} 人`;
    }
    msgEl.className = 'checkin-msg info';
  } catch (e) {
    listEl.innerHTML = '';
    msgEl.textContent = '加载签到数据失败';
    msgEl.className = 'checkin-msg error';
  }
}

async function doCheckin() {
  const name = document.getElementById('checkinName').value.trim();
  const msgEl = document.getElementById('checkinMsg');
  if (!name) { msgEl.textContent = '请先输入昵称'; msgEl.className = 'checkin-msg error'; return; }

  msgEl.textContent = '签到中...';
  msgEl.className = 'checkin-msg info';

  try {
    const today = todayStr();

    // 写入 GitHub（writeJSON 内部会先读取现有数据再合并）
    const newData = await writeJSON('checkins.json', (data) => {
      // 检查是否已签到
      const already = data.some(c => c.nickname === name && c.date === today);
      if (already) {
        throw new Error('DUPLICATE');
      }
      return [...data, { nickname: name, date: today }];
    });

    // 计算连续签到
    const streak = await calcStreak(name, newData);
    msgEl.textContent = `✅ ${name} 签到成功！连续签到 ${streak} 天 🔥`;
    msgEl.className = 'checkin-msg success';
    document.getElementById('checkinName').value = '';
    refreshCheckin();
  } catch (e) {
    if (e.message === 'DUPLICATE') {
      msgEl.textContent = `⚠️ ${name}，你今天已经签到过了！`;
    } else {
      msgEl.textContent = '签到失败，请稍后重试';
    }
    msgEl.className = 'checkin-msg error';
  }
}

// ==============================
// 💬 留言板
// ==============================
async function refreshMessages() {
  const listEl = document.getElementById('guestbookList');

  try {
    const data = await readJSON('messages.json');
    // 按时间降序，取最近 50 条
    const sorted = (data || []).sort((a, b) => b.time.localeCompare(a.time)).slice(0, 50);

    if (sorted.length === 0) {
      listEl.innerHTML = '<div class="gb-empty">还没有留言，来写下第一条吧 📝</div>';
      return;
    }

    listEl.innerHTML = sorted.map(m => `
      <div class="gb-item">
        <div class="gb-header">
          <span class="gb-name">${escapeHtml(m.nickname)}</span>
          <span class="gb-time">${formatTime(m.time)}</span>
        </div>
        <div class="gb-content">${escapeHtml(m.content)}</div>
      </div>
    `).join('');
  } catch (e) {
    listEl.innerHTML = '<div class="gb-empty">加载留言失败 🤯</div>';
  }
}

async function postMessage() {
  const name = document.getElementById('msgName').value.trim();
  const content = document.getElementById('msgContent').value.trim();
  const btn = document.querySelector('#guestbook .btn');

  if (!name) { alert('请输入昵称'); return; }
  if (!content) { alert('请输入留言内容'); return; }

  btn.textContent = '发布中...';
  btn.disabled = true;

  try {
    await writeJSON('messages.json', (data) => [
      ...data,
      { nickname: name, content: content, time: new Date().toISOString() },
    ]);

    document.getElementById('msgName').value = '';
    document.getElementById('msgContent').value = '';
    await refreshMessages();
  } catch (e) {
    alert('发布失败，请检查网络');
  } finally {
    btn.textContent = '📝 发布留言';
    btn.disabled = false;
  }
}

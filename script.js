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
// 📅 签到 & 💬 留言板 (数据存储在 Supabase)
// ======================================================================

// ---- 初始化 Supabase 客户端 ----
const SUPABASE_URL = 'https://lniyqygziafxqxvxjzlf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuaXlxeWd6aWFmeHF4dnhqemxmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMDA0ODksImV4cCI6MjA5NTg3NjQ4OX0.8CvxZ1a3xCMsKm2JJF_X_NXqqKRDWCCtSE9Pv2RGCtQ';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
async function calcStreak(nickname) {
  const { data } = await supabase
    .from('checkins')
    .select('date')
    .eq('nickname', nickname)
    .order('date', { ascending: false });

  if (!data || data.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  for (let i = 0; i < data.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    const expectedDate = expected.toISOString().slice(0, 10);
    if (data[i].date === expectedDate) {
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
    const { data, error } = await supabase
      .from('checkins')
      .select('nickname, date')
      .eq('date', today);

    if (error) throw error;

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div class="gb-empty">今天还没有人签到，来当第一个吧 🎯</div>';
      msgEl.textContent = `今日已签到：0 人`;
    } else {
      // 去重（同一个人一天只显示一次）
      const seen = new Set();
      const unique = data.filter(c => {
        if (seen.has(c.nickname)) return false;
        seen.add(c.nickname);
        return true;
      });

      // 获取每个人的连续签到天数
      const items = await Promise.all(unique.map(async c => {
        const streak = await calcStreak(c.nickname);
        const badge = streak > 1 ? `<span class="streak">🔥${streak}天</span>` : '';
        return `<div class="checkin-item">✅ ${escapeHtml(c.nickname)} ${badge}</div>`;
      }));

      listEl.innerHTML = items.join('');
      msgEl.textContent = `今日已签到：${unique.length} 人`;
    }
    msgEl.className = 'checkin-msg info';
  } catch(e) {
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

    // 检查今天是否已签到
    const { data: existing } = await supabase
      .from('checkins')
      .select('id')
      .eq('nickname', name)
      .eq('date', today);

    if (existing && existing.length > 0) {
      msgEl.textContent = `⚠️ ${name}，你今天已经签到过了！`;
      msgEl.className = 'checkin-msg error';
      return;
    }

    // 写入签到
    const { error } = await supabase
      .from('checkins')
      .insert({ nickname: name, date: today });

    if (error) throw error;

    const streak = await calcStreak(name);
    msgEl.textContent = `✅ ${name} 签到成功！连续签到 ${streak} 天 🔥`;
    msgEl.className = 'checkin-msg success';
    document.getElementById('checkinName').value = '';
    refreshCheckin();
  } catch(e) {
    msgEl.textContent = '签到失败，请稍后重试';
    msgEl.className = 'checkin-msg error';
  }
}

// ==============================
// 💬 留言板
// ==============================
async function refreshMessages() {
  const listEl = document.getElementById('guestbookList');
  try {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('time', { ascending: false })
      .limit(50);

    if (error) throw error;

    if (!data || data.length === 0) {
      listEl.innerHTML = '<div class="gb-empty">还没有留言，来写下第一条吧 📝</div>';
      return;
    }

    listEl.innerHTML = data.map(m => `
      <div class="gb-item">
        <div class="gb-header">
          <span class="gb-name">${escapeHtml(m.nickname)}</span>
          <span class="gb-time">${formatTime(m.time)}</span>
        </div>
        <div class="gb-content">${escapeHtml(m.content)}</div>
      </div>
    `).join('');
  } catch(e) {
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
    const { error } = await supabase
      .from('messages')
      .insert({ nickname: name, content: content });

    if (error) throw error;

    document.getElementById('msgName').value = '';
    document.getElementById('msgContent').value = '';
    refreshMessages();
    alert('留言发布成功 ✅');
  } catch(e) {
    alert('发布失败，请检查网络');
  } finally {
    btn.textContent = '📝 发布留言';
    btn.disabled = false;
  }
}

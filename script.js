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

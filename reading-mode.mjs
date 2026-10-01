// Only a non-sensitive display preference is stored. No visitor data or audio.
const root = document.documentElement;
const key = 'geeknexus-large-text';
const zh = root.lang.toLowerCase().startsWith('zh');
let enabled = false;
try { enabled = localStorage.getItem(key) === 'on'; } catch { /* Storage may be blocked. */ }
const css = document.createElement('link');
css.rel = 'stylesheet';
css.href = new URL('reading-mode.css', import.meta.url).href;
document.head.append(css);
const toggle = document.createElement('button');
toggle.type = 'button';
toggle.className = 'gn-reading-toggle';
toggle.title = zh ? '切换大字阅读，偏好保存在此浏览器' : 'Toggle larger text; saved in this browser';
const status = document.createElement('span');
status.className = 'gn-reading-status';
status.setAttribute('role', 'status');
function render() {
  root.classList.toggle('gn-large-text', enabled);
  toggle.setAttribute('aria-pressed', String(enabled));
  toggle.textContent = enabled ? (zh ? '恢复标准字号' : 'Standard text') : (zh ? '大字版' : 'Larger text');
}
toggle.addEventListener('click', () => {
  enabled = !enabled;
  try { localStorage.setItem(key, enabled ? 'on' : 'off'); } catch { /* Session-only fallback. */ }
  render();
  status.textContent = enabled ? (zh ? '已开启大字版' : 'Larger text enabled') : (zh ? '已恢复标准字号' : 'Standard text restored');
});
window.addEventListener('storage', event => {
  if (event.key === key || event.key === null) { enabled = event.newValue === 'on'; render(); }
});
render();
document.body.append(toggle, status);

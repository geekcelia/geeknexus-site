(() => {
  'use strict';
  const button = document.getElementById('copy-prompt');
  const prompt = document.getElementById('agent-prompt');
  const status = document.getElementById('copy-status');
  if (!button || !prompt || !status) return;
  button.hidden = false;
  let copying = false;
  button.addEventListener('click', async () => {
    if (copying) return;
    copying = true;
    button.disabled = true;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(prompt.value);
      status.textContent = '已复制。粘贴到你的 AI 对话，再补充一个具体工作流。';
    } catch {
      prompt.focus();
      prompt.select();
      status.textContent = '浏览器未允许自动复制。已选中文本，请手动复制。';
    } finally {
      copying = false;
      button.disabled = false;
    }
  });
})();

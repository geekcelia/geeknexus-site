// No feedback is sent automatically or placed in a webmail URL.
export function feedbackDelivery({zh, subject, getBody}) {
  const t = (cn, en) => zh ? cn : en;
  const make = (tag, text, cls) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (cls) element.className = cls;
    return element;
  };
  const section = make('section', '', 'gn-feedback-delivery');
  const instructions = make('p', t(
    '先复制反馈内容，再打开 Gmail 粘贴并发送；没有 Gmail 也可以使用其他邮箱。',
    'Copy your feedback, then open Gmail, paste and send. You can also use another email service.'
  ), 'gn-status');
  const recipient = make('p', t('收件人：', 'To: ') + 'hello@geeknexus.ai');
  const actions = make('div', '', 'gn-actions');
  const copy = make('button', t('1. 复制反馈内容', '1. Copy feedback'), 'gn-primary');
  copy.type = 'button';
  const gmail = make('a', t('2. 打开 Gmail 网页版', '2. Open Gmail'), 'gn-secondary');
  gmail.href = 'https://mail.google.com/mail/?view=cm&fs=1&to=hello%40geeknexus.ai';
  gmail.target = '_blank';
  gmail.rel = 'noopener noreferrer';
  const native = make('a', t('使用系统邮件应用', 'Use your mail app'), 'gn-secondary');
  native.addEventListener('click', () => {
    status.textContent = t('如果没有打开，请使用上方 Gmail 入口，或复制内容到其他邮箱。这并不表示邮件已发送。', 'If nothing opens, use Gmail above or paste into another email service. No email has been sent by this page.');
  });
  const status = make('p', '', 'gn-status');
  status.setAttribute('role', 'status');
  const fallback = make('div');
  fallback.hidden = true;
  const label = make('label', t('手动复制以下内容', 'Copy the text below manually'));
  label.htmlFor = 'gn-feedback-copy';
  const text = make('textarea');
  text.id = label.htmlFor;
  text.readOnly = true;
  fallback.append(label, text);
  const draft = () => t('收件人：', 'To: ') + 'hello@geeknexus.ai\n' + t('主题：', 'Subject: ') + subject + '\n\n' + getBody();
  copy.addEventListener('click', async () => {
    const value = draft();
    try {
      await navigator.clipboard.writeText(value);
      if (!section.isConnected) return;
      fallback.hidden = true;
      status.textContent = t('已复制，尚未发送。请打开邮箱，粘贴内容并确认发送。', 'Copied, not sent. Open your email service, paste and confirm sending.');
    } catch {
      if (!section.isConnected) return;
      text.value = value;
      fallback.hidden = false;
      text.focus();
      text.select();
      status.textContent = t('浏览器未允许自动复制。请复制下方已选中的内容，再粘贴到邮箱。', 'Automatic copying was unavailable. Copy the selected text below and paste it into your email service.');
    }
  });
  const update = () => {
    native.href = 'mailto:hello@geeknexus.ai?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(getBody());
    if (!fallback.hidden) text.value = draft();
    status.textContent = '';
  };
  actions.append(copy, gmail, native);
  section.append(instructions, recipient, actions, status, fallback);
  update();
  return {element: section, update};
}

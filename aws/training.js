(() => {
  'use strict';

  const storageKey = 'geeknexus.aws.training.v1';
  const moduleIds = ['nova', 'evaluation', 'neuron', 'vectors', 'bedrock', 'agentcore'];
  const roleContent = {
    owner: ['老板路径', '先判断 RAG、微调和 Agent 各自解决什么问题，再用安全、成本与可观测性决定是否值得进入试点。'],
    builder: ['产品 / 技术路径', '重点学习模型评测、Neuron 优化、向量方案选择和 AgentCore 的身份、网关与可观测性边界。'],
    operator: ['业务 / 运营路径', '从 VOC 与验收标准开始，理解知识权限、工具审批、人工接管和失败降级如何进入日常流程。']
  };

  const safeRead = () => {
    try {
      const value = JSON.parse(localStorage.getItem(storageKey) || '{}');
      return value && typeof value === 'object' ? value : {};
    } catch (_) {
      return {};
    }
  };

  const safeWrite = (value) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(value));
    } catch (_) {
      // The page remains fully usable when storage is blocked.
    }
  };

  const state = safeRead();
  state.completed = Array.isArray(state.completed)
    ? state.completed.filter((id) => moduleIds.includes(id))
    : [];
  state.role = Object.hasOwn(roleContent, state.role) ? state.role : 'owner';

  const progressCount = document.querySelector('#progress-count');
  const progressFill = document.querySelector('#progress-fill');
  const progressBar = document.querySelector('.progress-track');

  function updateProgress() {
    const count = state.completed.length;
    progressCount.textContent = `${count} / ${moduleIds.length}`;
    progressFill.style.width = `${(count / moduleIds.length) * 100}%`;
    progressBar.setAttribute('aria-valuenow', String(count));
  }

  document.querySelectorAll('[data-complete]').forEach((input) => {
    input.checked = state.completed.includes(input.dataset.complete);
    input.addEventListener('change', () => {
      const id = input.dataset.complete;
      state.completed = input.checked
        ? [...new Set([...state.completed, id])]
        : state.completed.filter((item) => item !== id);
      safeWrite(state);
      updateProgress();
    });
  });

  document.querySelector('#reset-progress').addEventListener('click', () => {
    state.completed = [];
    document.querySelectorAll('[data-complete]').forEach((input) => { input.checked = false; });
    safeWrite(state);
    updateProgress();
  });

  function setRole(role) {
    state.role = role;
    safeWrite(state);
    document.querySelectorAll('.role-button').forEach((button) => {
      const active = button.dataset.role === role;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelector('#role-label').textContent = roleContent[role][0];
    document.querySelector('#role-copy').textContent = roleContent[role][1];
    document.querySelectorAll('.module-card').forEach((card) => {
      const roles = (card.dataset.priority || '').split(',');
      card.classList.toggle('priority', roles.includes(role));
    });
  }

  document.querySelectorAll('.role-button').forEach((button) => {
    button.addEventListener('click', () => setRole(button.dataset.role));
  });
  setRole(state.role);
  updateProgress();

  const answers = { q1: 'b', q2: 'b', q3: 'a', q4: 'a', q5: 'b', q6: 'b', q7: 'a', q8: 'b' };
  const quiz = document.querySelector('#quiz');
  quiz.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(quiz);
    const unanswered = Object.keys(answers).filter((key) => !data.get(key));
    const error = document.querySelector('#quiz-error');
    if (unanswered.length) {
      error.textContent = `还有 ${unanswered.length} 题未作答，请完成后提交。`;
      const first = quiz.querySelector(`input[name="${unanswered[0]}"]`);
      first?.focus();
      return;
    }
    error.textContent = '';
    const score = Object.entries(answers).reduce((sum, [key, answer]) => sum + (data.get(key) === answer ? 1 : 0), 0);
    const box = document.querySelector('#score-box');
    document.querySelector('#score').textContent = `${score} / 8`;
    document.querySelector('#score-message').textContent = score >= 7
      ? '已具备进入试点讨论的共同语言。下一步：选择一个可衡量、可回退的业务流程。'
      : score >= 5
        ? '基础判断已经建立，建议复习标记为优先的模块后再试一次。'
        : '建议先重读 RAG、评测、Guardrails 与 AgentCore 四个模块。';
    box.hidden = false;
    box.focus();
  });
})();

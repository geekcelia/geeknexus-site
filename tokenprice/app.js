(() => {
  'use strict';

  const MAX_BYTES = 2 * 1024 * 1024;
  const MAX_RECORDS = 1000;
  const DATA_KEY = 'geeknexus-tokenprice-data-v1';
  const FAVORITES_KEY = 'geeknexus-tokenprice-favorites-v1';
  const CATEGORIES = new Set(['text', 'image', 'video', 'other']);
  const $ = (id) => document.getElementById(id);
  const state = {
    data: null, bundled: null, filtered: [], family: 'all', category: 'all',
    favoriteOnly: false, favorites: new Set(), compare: new Set(), local: false,
  };

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  }

  function setText(id, value) {
    if ($(id)) $(id).textContent = String(value);
  }

  function show(id, visible) {
    const node = $(id);
    if (node) node.hidden = !visible;
  }

  function listen(id, event, fn) {
    if ($(id)) $(id).addEventListener(event, fn);
  }

  function message(text, isError = false) {
    const node = $('importStatus');
    if (!node) return;
    node.textContent = text;
    node.classList.toggle('is-error', isError);
    node.setAttribute('role', isError ? 'alert' : 'status');
  }

  function textValue(value, label, max = 200, nullable = false) {
    if (nullable && (value === null || value === undefined)) return null;
    if (typeof value !== 'string' || !value.trim() || value.length > max || /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)) {
      throw new Error(`${label} 必须是 1–${max} 字符的文本。`);
    }
    return value.trim();
  }

  function priceValue(value, label) {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1e12) {
      throw new Error(`${label} 必须是有限的非负数字，缺少价格请填 null。`);
    }
    return value;
  }

  function textList(value, label) {
    if (value === undefined) return [];
    if (!Array.isArray(value) || value.length > 20) throw new Error(`${label}需要数组，最多 20 项。`);
    return value.map((item) => textValue(item, label, 600));
  }

  function rawPrice(value, label) {
    if (value === null || value === undefined) return null;
    return typeof value === 'number' ? priceValue(value, label) : textValue(value, label, 200);
  }

  function issueEvidence(value, label) {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'object' || Array.isArray(value)) throw new Error(`${label}无效。`);
    return {
      sheet: textValue(value.sheet, `${label}工作表`, 120),
      cell: textValue(value.cell, `${label}单元格`, 80),
      value: rawPrice(value.value, `${label}原值`),
    };
  }

  function dateValue(value, label, required = false) {
    if (!required && (value === null || value === undefined)) return null;
    if (typeof value !== 'string' || value.length > 80 || !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) || !Number.isFinite(Date.parse(value))) {
      throw new Error(`${label} 必须是 ISO 日期，未知报价时间请填 null。`);
    }
    return value;
  }

  function availableId(supplier, original, used) {
    let id = original;
    if (used.has(id)) {
      const prefix = `${supplier.slice(0, 48)}::${original.slice(0, 96)}`;
      id = prefix;
      let suffix = 1;
      while (used.has(id)) id = `${prefix}-${suffix++}`;
    }
    used.add(id);
    return id;
  }

  function validateData(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !raw.source || typeof raw.source !== 'object' || Array.isArray(raw.source)) {
      throw new Error('JSON 需要 source、importedAt 和 records 数组。');
    }
    if (raw.schemaVersion !== undefined && raw.schemaVersion !== 1) throw new Error('当前仅支持 schemaVersion 1。');
    const rows = raw.records === undefined ? raw.quotes : raw.records;
    if (!Array.isArray(rows) || rows.length < 1 || rows.length > MAX_RECORDS) {
      throw new Error(`报价记录需要 1–${MAX_RECORDS} 条。`);
    }
    const source = {
      supplier: textValue(raw.source.supplier, '供应商', 120),
      fileName: textValue(raw.source.fileName, '来源文件名', 240),
      sheet: textValue(raw.source.sheet, '工作表', 120),
      quoteUpdatedAt: dateValue(raw.source.quoteUpdatedAt, '来源报价时间'),
      notes: textList(raw.source.notes, '来源备注'),
      pricePurpose: textValue(raw.source.pricePurpose, '来源价格用途', 100, true),
      supplierNameStatus: textValue(raw.source.supplierNameStatus, '供应商名称来源', 100, true),
      sha256: textValue(raw.source.sha256, '文件摘要', 80, true),
    };
    const importedAt = dateValue(raw.importedAt, '导入时间', true);
    const ids = new Set();
    const uniqueIds = new Set();
    const records = rows.map((row, index) => {
      const prefix = `第 ${index + 1} 条`;
      if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error(`${prefix}不是报价对象。`);
      const originalId = textValue(row.id, `${prefix} ID`, 160);
      const supplier = row.supplier === undefined ? source.supplier : textValue(row.supplier, `${prefix}供应商`, 120);
      const identity = JSON.stringify([supplier, originalId]);
      if (ids.has(identity)) throw new Error(`同一供应商的报价 ID 重复：${originalId}`);
      ids.add(identity);
      const id = availableId(supplier, originalId, uniqueIds);
      if (!CATEGORIES.has(row.category)) throw new Error(`${prefix} category 必须是 text、image、video 或 other。`);
      const discount = priceValue(row.discount, `${prefix}折扣`);
      if (discount !== null && discount > 10) throw new Error(`${prefix}价格系数超过允许范围。`);
      if (!Array.isArray(row.cache) || row.cache.length > 20) throw new Error(`${prefix} cache 需要数组，最多 20 项。`);
      if (!Array.isArray(row.issues) || row.issues.length > 20) throw new Error(`${prefix} issues 需要数组，最多 20 项。`);
      if (row.rawPrices !== undefined && (!row.rawPrices || typeof row.rawPrices !== 'object' || Array.isArray(row.rawPrices))) throw new Error(`${prefix} rawPrices 必须是对象。`);
      if (row.issueDetails !== undefined && (!Array.isArray(row.issueDetails) || row.issueDetails.length > 20)) throw new Error(`${prefix} issueDetails 必须是数组，最多 20 项。`);
      if (row.output != null && row.approximateOutput != null) throw new Error(`${prefix}不能同时提供确定输出价与输出约价。`);
      const sourceRow = typeof row.sourceRow === 'number'
        ? (Number.isSafeInteger(row.sourceRow) && row.sourceRow > 0 && row.sourceRow <= 1e7 ? row.sourceRow : null)
        : textValue(row.sourceRow, `${prefix}来源行`, 160, true);
      if (sourceRow === null) throw new Error(`${prefix}需要有效的来源行。`);
      return {
        id, model: textValue(row.model, `${prefix}模型`, 200),
        supplier,
        sourceFileName: row.sourceFileName === undefined ? source.fileName : textValue(row.sourceFileName, `${prefix}来源文件`, 240),
        sourceSheet: row.sourceSheet === undefined ? source.sheet : textValue(row.sourceSheet, `${prefix}来源工作表`, 120),
        sourceImportedAt: row.sourceImportedAt === undefined ? importedAt : dateValue(row.sourceImportedAt, `${prefix}来源导入时间`, true),
        sourceQuoteUpdatedAt: row.sourceQuoteUpdatedAt === undefined ? source.quoteUpdatedAt : dateValue(row.sourceQuoteUpdatedAt, `${prefix}来源报价时间`),
        sourceNotes: row.sourceNotes === undefined ? [...source.notes] : textList(row.sourceNotes, `${prefix}来源备注`),
        family: textValue(row.family, `${prefix}家族`, 100), category: row.category,
        upstream: textValue(row.upstream, `${prefix}上游`, 120, true),
        accessType: textValue(row.accessType, `${prefix}接入方式`, 120, true),
        sourceLabel: textValue(row.sourceLabel, `${prefix}来源标签`, 160, true),
        condition: textValue(row.condition, `${prefix}计费条件`, 400, true),
        currency: textValue(row.currency, `${prefix}币种`, 12),
        unit: textValue(row.unit, `${prefix}计费单位`, 120),
        input: priceValue(row.input, `${prefix}输入价格`),
        output: priceValue(row.output, `${prefix}输出价格`),
        approximateOutput: priceValue(row.approximateOutput, `${prefix}输出约价`),
        cache: row.cache.map((item, ci) => {
          if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error(`${prefix}第 ${ci + 1} 个缓存项无效。`);
          return {
            type: textValue(item.type, `${prefix}缓存类型`, 100),
            label: textValue(item.label, `${prefix}缓存名称`, 160),
            price: priceValue(item.price, `${prefix}缓存价格`),
            sourceCell: textValue(item.sourceCell, `${prefix}缓存来源单元格`, 80, true),
          };
        }),
        discount, sourceRow,
        sourceRange: textValue(row.sourceRange, `${prefix}来源范围`, 160, true),
        pricePurpose: textValue(row.pricePurpose, `${prefix}价格用途`, 100, true),
        priceStatus: textValue(row.priceStatus, `${prefix}价格状态`, 100, true),
        cacheStatus: textValue(row.cacheStatus, `${prefix}缓存状态`, 100, true),
        notes: textList(row.notes, `${prefix}备注`),
        rawPrices: {
          input: rawPrice(row.rawPrices?.input, `${prefix}输入原文`),
          output: rawPrice(row.rawPrices?.output, `${prefix}输出原文`),
        },
        quoteUpdatedAt: dateValue(row.quoteUpdatedAt, `${prefix}报价时间`),
        issues: row.issues.map((issue) => textValue(issue, `${prefix}待确认项`, 600)),
        issueDetails: (row.issueDetails || []).map((issue) => {
          if (!issue || typeof issue !== 'object' || Array.isArray(issue)) throw new Error(`${prefix}核对证据无效。`);
          return {
            type: textValue(issue.type, `${prefix}核对类型`, 100),
            source: issueEvidence(issue.source, `${prefix}核对来源`),
            other: issueEvidence(issue.other, `${prefix}核对对照`),
          };
        }),
      };
    });
    return { schemaVersion: 1, source, importedAt, records };
  }

  function latestDate(values) {
    return values.filter(Boolean).reduce((latest, value) => !latest || Date.parse(value) > Date.parse(latest) ? value : latest, null);
  }

  function quoteDate(row) { return row.quoteUpdatedAt || row.sourceQuoteUpdatedAt || null; }

  function mergeData(existing, incoming) {
    const suppliers = new Set(incoming.records.map((row) => row.supplier));
    const kept = existing ? existing.records.filter((row) => !suppliers.has(row.supplier)) : [];
    const used = new Set(kept.map((row) => row.id));
    const additions = incoming.records.map((row) => {
      // Keep IDs bounded and unique without treating one supplier's row as another's.
      const id = availableId(row.supplier, row.id, used);
      return { ...row, id };
    });
    const records = [...kept, ...additions];
    if (records.length > MAX_RECORDS) throw new Error(`合并后最多保留 ${MAX_RECORDS} 条报价，请先精简导入文件。`);
    const merged = { schemaVersion: 1, source: incoming.source, importedAt: latestDate(records.map((row) => row.sourceImportedAt)), records };
    if (new Blob([JSON.stringify(merged)]).size > MAX_BYTES) throw new Error('合并后的数据不能超过 2 MB。');
    return merged;
  }

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }

  function storageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }

  function storageRemove(key) {
    try { localStorage.removeItem(key); return true; } catch (_) { return false; }
  }

  function restoreFavorites() {
    try {
      const raw = storageGet(FAVORITES_KEY);
      if (!raw || raw.length > 300000) return;
      const values = JSON.parse(raw);
      if (Array.isArray(values) && values.length <= MAX_RECORDS) {
        state.favorites = new Set(values.filter((value) => typeof value === 'string' && value.length <= 160));
      }
    } catch (_) { /* A corrupt saved preference must not prevent loading the page. */ }
  }

  function unique(values) {
    return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }

  function setOptions(id, values, allLabel) {
    const node = $(id);
    if (!node) return;
    const previous = node.value;
    node.replaceChildren();
    const all = element('option', '', allLabel);
    all.value = 'all';
    node.append(all);
    values.forEach((value) => {
      const option = element('option', '', value);
      option.value = value;
      node.append(option);
    });
    node.value = values.includes(previous) ? previous : 'all';
  }

  function populateFilters() {
    const records = state.data.records;
    const families = unique(records.map((row) => row.family));
    if (!families.includes(state.family)) state.family = 'all';
    const tabs = $('familyTabs');
    if (tabs) {
      tabs.replaceChildren();
      ['all', ...families].forEach((family) => {
        const count = family === 'all' ? records.length : records.filter((row) => row.family === family).length;
        const button = element('button', 'family-tab', family === 'all' ? '全部品牌' : family);
        button.type = 'button';
        button.dataset.family = family;
        button.append(element('span', 'tab-count', count));
        tabs.append(button);
      });
    }
    setOptions('upstreamFilter', unique(records.map((row) => row.upstream)), '全部上游');
    setOptions('channelFilter', unique(records.map((row) => row.accessType)), '全部接入方式');
    setOptions('currencyFilter', unique(records.map((row) => row.currency)), '全部币种');
  }

  function formatDate(value, full = false) {
    if (!value) return '未提供';
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll('-', '.');
    return new Intl.DateTimeFormat('zh-CN', {
      timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
      ...(full ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
    }).format(new Date(value));
  }

  function mode() { return $('priceMode')?.value === 'base' ? 'base' : 'final'; }

  function displayedPrice(price, row, selectedMode = mode()) {
    if (price === null || price === undefined) return null;
    if (selectedMode === 'final' && row.discount !== null) return price * row.discount;
    return price;
  }

  function numberText(value) {
    return value === null || value === undefined ? '—' : new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 6 }).format(value);
  }

  function priceText(value, row, selectedMode = mode()) {
    const amount = displayedPrice(value, row, selectedMode);
    return amount === null ? '未提供' : `${numberText(amount)} ${row.currency}`;
  }

  function discountText(value) {
    if (value > 1) return `${numberText(value * 100)}%（加价）`;
    if (value === null) return '未提供';
    if (value === 1) return '原价';
    return `${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 }).format(value * 10)} 折`;
  }

  function unitText(row) {
    return { million_tokens: '百万 tokens', second: '秒', unknown: '单位待确认' }[row.unit] || row.unit;
  }

  function outputValue(row) {
    return row.output === null ? row.approximateOutput : row.output;
  }

  function outputText(row, selectedMode = mode()) {
    return `${row.output === null && row.approximateOutput !== null ? '约 ' : ''}${priceText(outputValue(row), row, selectedMode)}`;
  }

  function primaryCache(row) {
    return row.cache.find((item) => /read|hit|读取|命中/i.test(`${item.type} ${item.label}`)) || row.cache[0] || null;
  }

  function groupKey(row) {
    return [row.currency, row.unit, row.category, row.condition || ''].join('\u0000');
  }

  function getFiltered() {
    const query = ($('searchInput')?.value || '').trim().toLocaleLowerCase('zh-CN');
    const upstream = $('upstreamFilter')?.value || 'all';
    const channel = $('channelFilter')?.value || 'all';
    const currency = $('currencyFilter')?.value || 'all';
    const issueOnly = $('issueOnly')?.checked || false;
    const rows = state.data.records.filter((row) => {
      if (state.family !== 'all' && row.family !== state.family) return false;
      if (state.category !== 'all' && row.category !== state.category) return false;
      if (upstream !== 'all' && row.upstream !== upstream) return false;
      if (channel !== 'all' && row.accessType !== channel) return false;
      if (currency !== 'all' && row.currency !== currency) return false;
      if (issueOnly && !row.issues.length) return false;
      if (state.favoriteOnly && !state.favorites.has(row.id)) return false;
      const haystack = [row.model, row.family, row.upstream, row.accessType, row.sourceLabel, row.condition, row.supplier].join(' ').toLocaleLowerCase('zh-CN');
      return !query || query.split(/\s+/).every((word) => haystack.includes(word));
    });
    const sort = $('sortSelect')?.value || 'default';
    if (sort === 'name') rows.sort((a, b) => a.model.localeCompare(b.model, 'zh-CN'));
    else if (sort === 'discount') rows.sort((a, b) => (a.discount ?? Infinity) - (b.discount ?? Infinity));
    else if (['input', 'output', 'cache'].includes(sort)) {
      rows.sort((a, b) => {
        const cacheGroup = (row) => sort === 'cache' ? `\u0000${primaryCache(row)?.type || 'none'}` : '';
        const ga = groupKey(a) + cacheGroup(a), gb = groupKey(b) + cacheGroup(b);
        if (ga !== gb) return ga.localeCompare(gb, 'zh-CN');
        if (a.unit === 'unknown' || b.unit === 'unknown') return 0;
        const pa = sort === 'cache' ? primaryCache(a)?.price ?? null : sort === 'output' ? outputValue(a) : a[sort];
        const pb = sort === 'cache' ? primaryCache(b)?.price ?? null : sort === 'output' ? outputValue(b) : b[sort];
        const va = displayedPrice(pa, a), vb = displayedPrice(pb, b);
        if (va === null && vb === null) return 0;
        if (va === null) return 1;
        if (vb === null) return -1;
        return va - vb;
      });
    }
    return rows;
  }

  function rowButton(text, action, row, className = '') {
    const button = element('button', `row-action ${className}`.trim(), text);
    button.type = 'button';
    button.dataset.action = action;
    button.dataset.id = row.id;
    const actions = { favorite: '收藏', detail: '查看详情', compare: '加入或移出对比' };
    button.setAttribute('aria-label', `${actions[action] || action}：${row.model}，${row.condition || '默认条件'}`);
    return button;
  }

  function priceCell(value, row, extraClass, approximate = false) {
    const td = element('td', `price-cell ${extraClass || ''}`.trim());
    const amount = displayedPrice(value, row);
    const discountOnly = row.pricePurpose === 'discount_only' && amount === null;
    td.append(element('span', amount === null ? 'price-missing' : 'price-value price', discountOnly ? '仅折扣' : amount === null ? '—' : `${approximate ? '约 ' : ''}${numberText(amount)}`));
    td.append(element('span', 'price-unit', discountOnly ? '未提供基础单价' : `${row.currency} / ${unitText(row)}`));
    if (value !== null && mode() === 'final' && row.discount === null) td.append(element('span', 'cell-note cell-sub', '折扣未提供，显示原价'));
    return td;
  }

  function renderRow(row) {
    const tr = element('tr', 'quote-row');
    tr.dataset.id = row.id;
    const modelCell = element('td', 'model-column');
    const modelWrap = element('div', 'model-cell');
    const logo = element('span', `model-logo logo-${row.category}`, row.family.slice(0, 1).toUpperCase());
    logo.setAttribute('aria-hidden', 'true');
    const modelInfo = element('div', 'model-info');
    const name = rowButton(row.model, 'detail', row, 'model-name');
    name.classList.remove('row-action');
    modelInfo.append(name, element('span', 'model-family model-sub', row.family));
    modelWrap.append(logo, modelInfo);
    modelCell.append(modelWrap);
    const supplierCell = element('td', 'supplier-cell');
    supplierCell.append(element('span', 'supplier-name', row.supplier), element('span', 'source-label cell-sub', row.sourceLabel || '来源标签未提供'));
    const conditionCell = element('td', 'condition-cell');
    conditionCell.append(element('span', 'condition-text', row.condition || '条件未提供'));
    if (row.accessType) conditionCell.append(element('span', 'channel-label cell-sub', row.accessType));
    const discountCell = element('td', 'discount-cell');
    discountCell.append(element('span', row.discount === 1 ? 'discount-badge discount is-full' : 'discount-badge discount', discountText(row.discount)));
    const cacheCell = priceCell(primaryCache(row)?.price ?? null, row, 'cache-cell');
    const cache = primaryCache(row);
    if (cache) {
      cacheCell.append(element('span', 'cache-label cell-sub', cache.label));
      if (row.cache.length > 1) cacheCell.append(element('span', 'cell-note cell-sub', `另 ${row.cache.length - 1} 项，见详情`));
    } else cacheCell.append(element('span', 'cache-label cell-sub', '未提供缓存报价'));
    const updateCell = element('td', 'update-cell');
    updateCell.append(element('span', 'update-date', formatDate(quoteDate(row))));
    if (row.issues.length) updateCell.append(element('span', 'issue-badge', `${row.issues.length} 项待核对`));
    const actionsCell = element('td', 'actions-column');
    const actionsWrap = element('div', 'row-actions');
    const favorite = rowButton(state.favorites.has(row.id) ? '★' : '☆', 'favorite', row, 'favorite-action');
    favorite.classList.toggle('is-active', state.favorites.has(row.id));
    favorite.setAttribute('aria-pressed', String(state.favorites.has(row.id)));
    const compare = rowButton(state.compare.has(row.id) ? '✓' : '+', 'compare', row, 'compare-action icon-button');
    compare.classList.toggle('is-active', state.compare.has(row.id));
    compare.setAttribute('aria-pressed', String(state.compare.has(row.id)));
    actionsWrap.append(favorite, rowButton('↗', 'detail', row, 'detail-action icon-button'), compare);
    actionsCell.append(actionsWrap);
    tr.append(modelCell, supplierCell, conditionCell, discountCell, priceCell(row.input, row, 'input-cell'), priceCell(outputValue(row), row, 'output-cell', row.output === null && row.approximateOutput !== null), cacheCell, updateCell, actionsCell);
    return tr;
  }

  function renderHint() {
    let hint = $('sortHint');
    if (!hint) {
      hint = element('p', 'sort-hint detail-note');
      hint.id = 'sortHint';
      hint.setAttribute('aria-live', 'polite');
      const count = $('resultsCount');
      if (count?.closest('.results-toolbar')) count.closest('.results-toolbar').insertAdjacentElement('afterend', hint);
    }
    if (!hint) return;
    const messages = [mode() === 'final'
      ? '当前为按表内折扣试算的单价，尚未核实实际结算口径。'
      : '当前显示来源表中的原始单价。'];
    const sort = $('sortSelect')?.value || 'default';
    hint.hidden = !['input', 'output', 'cache'].includes(sort);
    if (['input', 'output', 'cache'].includes(sort)) {
      messages.push('价格仅在相同币种、单位、类别和计费条件内升序；不同组之间没有高低排名，单位未知的报价不排名。');
      if (sort === 'cache') messages.push('缓存优先显示读取价，并按相同缓存类型分组排序。');
    }
    hint.textContent = messages.join(' ');
  }

  function render() {
    if (!state.data) return;
    state.filtered = getFiltered();
    const body = $('resultsBody');
    if (body) {
      const fragment = document.createDocumentFragment();
      state.filtered.forEach((row) => fragment.append(renderRow(row)));
      body.replaceChildren(fragment);
    }
    setText('resultsCount', `${state.filtered.length} 条报价`);
    setText('modelCount', state.data.records.length);
    setText('brandCount', new Set(state.data.records.map((row) => row.family)).size);
    setText('supplierCount', new Set(state.data.records.map((row) => row.supplier)).size);
    setText('importDate', formatDate(latestDate(state.data.records.map((row) => row.sourceImportedAt))));
    show('emptyState', state.filtered.length === 0);
    document.querySelectorAll('[data-family]').forEach((button) => {
      const active = button.dataset.family === state.family;
      button.classList.toggle('is-active', active);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('#categoryTabs [data-category]').forEach((button) => {
      const active = button.dataset.category === state.category;
      button.classList.toggle('is-active', active);
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    const favoriteButton = $('favoriteOnly');
    if (favoriteButton) {
      favoriteButton.classList.toggle('is-active', state.favoriteOnly);
      favoriteButton.setAttribute('aria-pressed', String(state.favoriteOnly));
    }
    if ($('exportButton')) $('exportButton').disabled = !state.filtered.length;
    renderHint();
    renderCompareTray();
  }

  function applyData(data, isLocal) {
    state.data = data;
    state.local = isLocal;
    state.compare.clear();
    populateFilters();
    renderSources();
    render();
    show('loadingState', false);
    show('errorState', false);
  }

  function renderSources() {
    const data = state.data;
    const suppliers = unique(data.records.map((row) => row.supplier));
    setText('sourceName', suppliers.length === 1 ? suppliers[0] : `${suppliers.length} 家供应商`);
    setText('sourceMeta', suppliers.length === 1 ? `${data.records[0].sourceFileName} · ${data.records[0].sourceSheet} · ${state.local ? '本浏览器数据' : '初始 Excel 快照'}` : `${data.records.length} 条报价 · 逐条保留来源 · 本浏览器数据`);
    const list = $('sourcesList');
    if (!list) return;
    const fragment = document.createDocumentFragment();
    suppliers.forEach((supplier) => {
      const records = data.records.filter((row) => row.supplier === supplier);
      const card = element('article', 'source-card');
      card.append(element('span', 'source-status', state.local ? '本浏览器数据' : '初始快照'), element('h3', 'source-card-title', supplier));
      const fields = element('dl', 'source-details');
      const unknown = records.filter((row) => !quoteDate(row)).length;
      [
        ['来源文件', unique(records.map((row) => row.sourceFileName)).join('；')],
        ['工作表', unique(records.map((row) => row.sourceSheet)).join('；')],
        ['报价条目', String(records.length)],
        ['最近快照导入', formatDate(latestDate(records.map((row) => row.sourceImportedAt)), true)],
        ['最近已提供报价时间', formatDate(latestDate(records.map(quoteDate)), true)],
        ['更新时间未知', `${unknown} 条报价`],
      ].forEach(([label, value]) => fields.append(element('dt', '', label), element('dd', '', value)));
      card.append(fields, element('p', 'source-note', '这是报价快照，尚未连接供应商实时更新。报价更新时间与系统导入时间分开记录；未提供的时间保持未知。'), element('p', 'source-note', 'JSON 导入会追加新的供应商，并替换文件中所含供应商的全部现有报价；其他供应商不受影响。数据仅保存在本浏览器。'));
      unique(records.flatMap((row) => row.sourceNotes)).forEach((note) => card.append(element('p', 'source-note', note)));
      const button = element('button', 'button button-light', '管理本地数据');
      button.type = 'button';
      button.addEventListener('click', () => openDialog('dataDialog'));
      card.append(button);
      fragment.append(card);
    });
    list.replaceChildren(fragment);
    if ($('resetData')) $('resetData').disabled = !state.bundled;
  }

  function openDialog(id) {
    const dialog = $(id);
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  }

  function closeDialog(id) {
    const dialog = $(id);
    if (!dialog) return;
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  }

  function addDetail(fields, label, value) {
    const item = element('div', 'detail-item');
    item.append(element('dt', '', label), element('dd', '', value));
    fields.append(item);
  }

  function detail(row) {
    const content = $('detailContent');
    if (!content) return;
    const fragment = document.createDocumentFragment();
    const heading = element('h2', 'dialog-heading', row.model);
    heading.id = 'detailTitle';
    fragment.append(heading, element('p', 'detail-subtitle cell-sub', `${row.supplier} · ${row.family}`));
    const fields = element('dl', 'detail-grid');
    const labels = { text: '文本模型', image: '图像模型', video: '视频模型', other: '其他能力' };
    [
      ['类别', labels[row.category]], ['上游平台', row.upstream || '未提供'],
      ['接入方式', row.accessType || '未提供'], ['供应商原始标签', row.sourceLabel || '未提供'],
      ['计费条件', row.condition || '未提供'], ['币种与单位', `${row.currency} / ${unitText(row)}`],
      ['价格用途', row.pricePurpose === 'source_quote' ? '供应商来源报价' : row.pricePurpose || '未提供'],
      ['表内折扣', discountText(row.discount)],
      ['报价更新时间', formatDate(quoteDate(row), true)],
      ['系统导入时间', formatDate(row.sourceImportedAt, true)],
      ['来源', `${row.sourceFileName} / ${row.sourceSheet}!${row.sourceRange || row.sourceRow}`],
    ].forEach(([label, value]) => addDetail(fields, label, value));
    fragment.append(fields);
    const table = element('table', 'detail-price-table detail-table');
    const head = element('thead');
    const header = element('tr');
    ['计费项', '表内原价', '折后试算'].forEach((label) => header.append(element('th', '', label)));
    head.append(header);
    const body = element('tbody');
    [['输入', row.input], [row.approximateOutput !== null ? '输出（约价）' : '输出', outputValue(row)], ...row.cache.map((item) => [item.label, item.price])].forEach(([label, value]) => {
      const tr = element('tr');
      const prefix = label === '输出（约价）' ? '约 ' : '';
      tr.append(element('td', '', label), element('td', '', prefix + priceText(value, row, 'base')), element('td', '', row.discount === null ? '缺少折扣，无法试算' : prefix + priceText(value, row, 'final')));
      body.append(tr);
    });
    table.append(head, body);
    fragment.append(table, element('p', 'detail-disclaimer detail-note', row.pricePurpose === 'discount_only'
      ? '此来源仅提供折扣或阶梯折扣，未提供输入、输出与缓存的基础单价，因此页面不会制造折后单价。'
      : '试算 = 表内单价 × 表内折扣。折扣是否适用于每个计费项、真实结算口径和渠道性质仍需向供应商确认。所有价格沿用上述来源单位。'));
    if (row.rawPrices.input !== null || row.rawPrices.output !== null || row.notes.length) {
      const notes = element('div', 'detail-note');
      if (row.rawPrices.input !== null) notes.append(element('p', '', `输入原文：${row.rawPrices.input}`));
      if (row.rawPrices.output !== null) notes.append(element('p', '', `输出原文：${row.rawPrices.output}`));
      row.notes.forEach((note) => notes.append(element('p', '', note)));
      fragment.append(notes);
    }
    if (row.issues.length) {
      fragment.append(element('h3', 'detail-section-title', '需要核对'));
      const issues = element('ul', 'issue-list');
      row.issues.forEach((issue) => issues.append(element('li', '', issue)));
      fragment.append(issues);
      row.issueDetails.forEach((issue) => {
        const parts = [issue.source, issue.other].filter(Boolean).map((entry) => `${entry.sheet}!${entry.cell} = ${entry.value}`);
        if (parts.length) fragment.append(element('p', 'detail-warning', parts.join('；')));
      });
    }
    fragment.append(element('p', 'source-note detail-source', '当前仅有报价快照，没有可核实的历史变价记录。'));
    content.replaceChildren(fragment);
    $('detailDialog')?.setAttribute('aria-labelledby', 'detailTitle');
    openDialog('detailDialog');
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else if (state.favorites.size < MAX_RECORDS) state.favorites.add(id);
    const persisted = storageSet(FAVORITES_KEY, JSON.stringify([...state.favorites]));
    if (!persisted) message('浏览器未允许保存收藏；本次页面会话仍可使用。', true);
    render();
  }

  function announceCompare(text) {
    let status = $('compareStatus');
    if (!status) {
      status = element('span', 'compare-status');
      status.id = 'compareStatus';
      status.setAttribute('role', 'status');
      $('compareTray')?.append(status);
    }
    if (status) status.textContent = text;
  }

  function toggleCompare(id) {
    if (state.compare.has(id)) state.compare.delete(id);
    else if (state.compare.size < 3) state.compare.add(id);
    else {
      announceCompare('最多对比 3 条报价，请先移除一条。');
      return;
    }
    announceCompare('');
    render();
  }

  function renderCompareTray() {
    setText('compareCount', state.compare.size);
    show('compareTray', state.compare.size > 0);
    const open = $('compareOpen');
    if (open) {
      open.disabled = state.compare.size < 2;
      open.title = state.compare.size < 2 ? '至少选择两条报价' : '查看所选报价';
    }
    let names = $('compareNames');
    if (!names && $('compareTray')) {
      names = element('span', 'compare-names');
      names.id = 'compareNames';
      $('compareTray').append(names);
    }
    if (names && state.data) names.textContent = state.data.records.filter((row) => state.compare.has(row.id)).map((row) => row.model).join(' · ');
  }

  function openCompare() {
    const rows = state.data.records.filter((row) => state.compare.has(row.id));
    if (rows.length < 2) return;
    const content = $('compareContent');
    if (!content) return;
    const comparable = rows.every((row) => row.unit !== 'unknown' && groupKey(row) === groupKey(rows[0]));
    const heading = element('h2', 'dialog-heading', '报价对比');
    heading.id = 'compareTitle';
    const notice = element('p', comparable ? 'compare-notice detail-note' : 'compare-notice is-warning detail-warning', comparable
      ? '所选报价币种、单位、类别及计费条件一致，可比较同一计费项。折后价仍是试算。'
      : '所选报价的币种、单位、类别或计费条件不同，或存在单位待确认项。以下仅展示各自信息，不提供价格排名。');
    const table = element('table', 'compare-table');
    const head = element('thead');
    const hr = element('tr');
    hr.append(element('th', '', '计费项'));
    rows.forEach((row) => {
      const th = element('th');
      th.append(element('span', 'compare-model-name', row.model));
      const remove = element('button', 'icon-button', '×');
      remove.type = 'button';
      remove.setAttribute('aria-label', `从对比中移除 ${row.model}`);
      remove.addEventListener('click', () => {
        state.compare.delete(row.id);
        render();
        if (state.compare.size < 2) closeDialog('compareDialog');
        else openCompare();
      });
      th.append(remove);
      hr.append(th);
    });
    head.append(hr);
    const body = element('tbody');
    const addRow = (label, values) => {
      const tr = element('tr');
      tr.append(element('th', '', label));
      values.forEach((value) => tr.append(element('td', '', value)));
      body.append(tr);
    };
    addRow('供应商', rows.map((row) => row.supplier));
    addRow('上游 / 接入', rows.map((row) => [row.upstream, row.accessType].filter(Boolean).join(' / ') || '未提供'));
    addRow('计费条件', rows.map((row) => row.condition || '未提供'));
    addRow('币种 / 单位', rows.map((row) => `${row.currency} / ${unitText(row)}`));
    addRow('表内折扣', rows.map((row) => discountText(row.discount)));
    addRow(mode() === 'final' ? '输入（试算）' : '输入（原价）', rows.map((row) => priceText(row.input, row)));
    addRow(mode() === 'final' ? '输出（试算）' : '输出（原价）', rows.map((row) => outputText(row)));
    const cacheLabels = unique(rows.flatMap((row) => row.cache.map((item) => `${item.type}\u0000${item.label}`)));
    cacheLabels.forEach((key) => {
      const [type, label] = key.split('\u0000');
      addRow(label, rows.map((row) => {
        const item = row.cache.find((cache) => cache.type === type && cache.label === label);
        return item ? priceText(item.price, row) : '未提供';
      }));
    });
    addRow('报价更新时间', rows.map((row) => formatDate(quoteDate(row))));
    addRow('来源', rows.map((row) => `${row.sourceFileName} / ${row.sourceSheet}!${row.sourceRange || row.sourceRow}`));
    addRow('待核对', rows.map((row) => row.issues.length ? row.issues.join('；') : '暂无导入标记'));
    table.append(head, body);
    content.replaceChildren(heading, notice, table, element('p', 'source-note', '同模型名称与供应商自述渠道标签，不代表已经核实模型真实性、渠道资质或实际结算价格。'));
    $('compareDialog')?.setAttribute('aria-labelledby', 'compareTitle');
    openDialog('compareDialog');
  }

  function clearFilters() {
    state.family = 'all'; state.category = 'all'; state.favoriteOnly = false;
    if ($('searchInput')) $('searchInput').value = '';
    ['upstreamFilter', 'channelFilter', 'currencyFilter'].forEach((id) => { if ($(id)) $(id).value = 'all'; });
    if ($('sortSelect')) $('sortSelect').value = 'default';
    if ($('issueOnly')) $('issueOnly').checked = false;
    render();
  }

  function downloadFile(name, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const link = element('a');
    link.href = url;
    link.download = name;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    let text = value === null || value === undefined ? '' : String(value);
    // Quoting alone does not neutralize spreadsheet formula execution.
    if (typeof value !== 'number' && /^[\s\uFEFF]*[=+\-@\t\r\n]/.test(text)) text = `'${text}`;
    return `"${text.replaceAll('"', '""')}"`;
  }

  function exportCSV() {
    if (!state.data || !state.filtered.length) return;
    const header = ['模型', '品牌', '类别', '供应商', '原始来源标签', '上游', '接入方式', '条件', '币种', '计费单位', '显示口径', '表内折扣系数', '输入价', '输出价', '缓存项（类型/价格）', '报价更新时间', '系统导入时间', '来源文件', '工作表', '来源行', '待核对'];
    const rows = state.filtered.map((row) => [
      row.model, row.family, row.category, row.supplier, row.sourceLabel,
      row.upstream, row.accessType, row.condition, row.currency, unitText(row),
      mode() === 'final' ? '表内单价×折扣试算，非核实结算价' : '表内原价', row.discount,
      displayedPrice(row.input, row), row.approximateOutput !== null ? `约 ${displayedPrice(outputValue(row), row)}` : displayedPrice(row.output, row),
      row.cache.map((item) => `${item.label}: ${priceText(item.price, row)} / ${unitText(row)}`).join('；'),
      quoteDate(row) || '未提供', row.sourceImportedAt,
      row.sourceFileName, row.sourceSheet, row.sourceRow, row.issues.join('；'),
    ]);
    const csv = '\uFEFF' + [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
    downloadFile('geeknexus-tokenprice.csv', csv, 'text/csv;charset=utf-8');
  }

  async function importJSON(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!/\.json$/i.test(file.name)) throw new Error('仅支持 .json 文件。');
      if (file.size > MAX_BYTES) throw new Error('文件不能超过 2 MB。');
      const raw = await file.text();
      const incoming = validateData(JSON.parse(raw));
      const data = mergeData(state.data, incoming);
      const persisted = storageSet(DATA_KEY, JSON.stringify(data));
      applyData(data, true);
      const summary = `已合并本次 ${incoming.records.length} 条报价，当前共 ${data.records.length} 条、${new Set(data.records.map((row) => row.supplier)).size} 家供应商。`;
      message(persisted ? `${summary} 仅保存在本浏览器。` : `${summary} 浏览器拒绝持久化，刷新后将恢复原数据。`, !persisted);
    } catch (error) {
      message(error instanceof SyntaxError ? 'JSON 格式无法解析，请检查文件；原数据未改动。' : `${error.message} 原数据未改动。`, true);
    } finally { event.target.value = ''; }
  }

  function wireEvents() {
    document.addEventListener('keydown', (event) => {
      const target = event.target;
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey && !target.closest('input, textarea, select, [contenteditable="true"], dialog')) {
        event.preventDefault();
        $('searchInput')?.focus();
      }
    });
    listen('searchInput', 'input', render);
    ['upstreamFilter', 'channelFilter', 'currencyFilter', 'priceMode', 'sortSelect', 'issueOnly'].forEach((id) => listen(id, 'change', render));
    listen('familyTabs', 'click', (event) => {
      const button = event.target.closest('button[data-family]');
      if (button) { state.family = button.dataset.family; render(); }
    });
    listen('categoryTabs', 'click', (event) => {
      const button = event.target.closest('button[data-category]');
      if (button && (button.dataset.category === 'all' || CATEGORIES.has(button.dataset.category))) {
        state.category = button.dataset.category; render();
      }
    });
    listen('favoriteOnly', 'click', () => { state.favoriteOnly = !state.favoriteOnly; render(); });
    listen('clearFilters', 'click', clearFilters);
    listen('exportButton', 'click', exportCSV);
    listen('resultsBody', 'click', (event) => {
      const button = event.target.closest('button[data-action][data-id]');
      if (!button || !state.data) return;
      const row = state.data.records.find((item) => item.id === button.dataset.id);
      if (!row) return;
      if (button.dataset.action === 'favorite') toggleFavorite(row.id);
      else if (button.dataset.action === 'detail') detail(row);
      else if (button.dataset.action === 'compare') toggleCompare(row.id);
    });
    [['openData', () => openDialog('dataDialog')], ['closeData', () => closeDialog('dataDialog')],
      ['detailClose', () => closeDialog('detailDialog')], ['compareClose', () => closeDialog('compareDialog')],
      ['compareOpen', openCompare], ['compareClear', () => { state.compare.clear(); announceCompare(''); render(); }],
    ].forEach(([id, handler]) => listen(id, 'click', handler));
    listen('importFile', 'change', importJSON);
    if ($('importFile')) $('importFile').accept = '.json,application/json';
    listen('downloadData', 'click', () => {
      if (state.data) downloadFile('geeknexus-tokenprice-data.json', JSON.stringify(state.data, null, 2), 'application/json;charset=utf-8');
    });
    listen('resetData', 'click', () => {
      if (!state.bundled) { message('初始快照尚未加载，无法恢复。', true); return; }
      const removed = storageRemove(DATA_KEY);
      applyData(state.bundled, false);
      message(removed ? '已恢复初始 Excel 快照。收藏记录仍保留。' : '本次已恢复初始快照，但浏览器拒绝清除本地数据，刷新后可能仍显示导入内容。', !removed);
    });
    document.querySelectorAll('.nav-item[data-view]').forEach((button) => {
      button.addEventListener('click', () => {
        const raw = button.dataset.view;
        const view = raw.endsWith('View') ? raw : `${raw}View`;
        if (!['quotesView', 'sourcesView', 'guideView'].includes(view)) return;
        ['quotesView', 'sourcesView', 'guideView'].forEach((id) => show(id, id === view));
        document.querySelectorAll('.nav-item[data-view]').forEach((item) => {
          const active = item === button;
          item.classList.toggle('active', active);
          item.classList.toggle('is-active', active);
          if (active) item.setAttribute('aria-current', 'page'); else item.removeAttribute('aria-current');
        });
        setText('breadcrumbTitle', { quotesView: '模型报价', sourcesView: '报价来源', guideView: '使用说明' }[view]);
      });
    });
    ['dataDialog', 'detailDialog', 'compareDialog'].forEach((id) => listen(id, 'click', (event) => {
      if (event.target !== $(id)) return;
      const rect = $(id).getBoundingClientRect();
      if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeDialog(id);
    }));
  }

  async function initialize() {
    wireEvents();
    restoreFavorites();
    show('loadingState', true);
    show('emptyState', false);
    show('errorState', false);
    show('compareTray', false);
    let bundledError = null;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('./data/quotes.json', { signal: controller.signal, credentials: 'same-origin' });
      if (!response.ok) throw new Error(`报价数据返回 HTTP ${response.status}`);
      const raw = await response.text();
      if (new Blob([raw]).size > MAX_BYTES) throw new Error('初始报价数据超过大小限制');
      state.bundled = validateData(JSON.parse(raw));
    } catch (error) { bundledError = error; }
    finally { clearTimeout(timeout); }
    let savedData = null;
    const saved = storageGet(DATA_KEY);
    if (saved) {
      try {
        if (new Blob([saved]).size > MAX_BYTES) throw new Error('保存数据超过大小限制');
        savedData = validateData(JSON.parse(saved));
      } catch (_) {
        storageRemove(DATA_KEY);
        message('本地保存的数据格式无效，已尝试恢复初始快照。', true);
      }
    }
    if (savedData) {
      applyData(savedData, true);
      message(bundledError ? '已加载本浏览器报价；初始快照暂时不可用。' : '已加载本浏览器保存的报价。');
    } else if (state.bundled) applyData(state.bundled, false);
    else {
      show('loadingState', false);
      show('errorState', true);
      setText('errorState', `报价快照加载失败。${bundledError?.message || '请稍后刷新重试。'} 你仍可通过“管理数据”导入合规 JSON。`);
      if ($('exportButton')) $('exportButton').disabled = true;
      message('初始数据尚未加载；可以导入已有 JSON。', true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();

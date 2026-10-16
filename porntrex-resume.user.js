// ==UserScript==
// @name         Porntrex — continuar por perfil
// @namespace    porntrex.continuar.local
// @version      1.4.1
// @description  Retoma a paginação de cada perfil automaticamente, sem painel na página.
// @author       adestrador
// @license      MIT
// @homepageURL  https://github.com/adestrador/porntrex-resume
// @supportURL   https://github.com/adestrador/porntrex-resume/issues
// @updateURL    https://raw.githubusercontent.com/adestrador/porntrex-resume/main/porntrex-resume.user.js
// @downloadURL  https://raw.githubusercontent.com/adestrador/porntrex-resume/main/porntrex-resume.user.js
// @match        https://www.porntrex.com/members/*/videos/*
// @match        https://porntrex.com/members/*/videos/*
// @run-at       document-start
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @noframes
// ==/UserScript==

(() => {
  'use strict';
  const win = window;
  const doc = document;
  let message = 'Iniciando…';
  function show(text) { message = text; }
  function command(caption, action) {
    if (typeof GM === 'undefined' || typeof GM.registerMenuCommand !== 'function') return;
    try { GM.registerMenuCommand(caption, action); }
    catch (error) { console.warn('[Continuar por perfil] Comando indisponível.', error); }
  }
  // Nenhum elemento é acrescentado à página. O estado fica apenas no menu da extensão.
  command('Consultar posição salva', () => win.alert(message));

  function deadline(promise, label) {
    return new Promise((resolve, reject) => {
      const timer = win.setTimeout(() => reject(new Error(label + ' não respondeu em 8 segundos')), 8000);
      Promise.resolve(promise).then(value => {
        win.clearTimeout(timer); resolve(value);
      }, error => { win.clearTimeout(timer); reject(error); });
    });
  }

  async function initialize() {
    const URLType = win.URL;
    if (typeof URLType !== 'function') throw new Error('O navegador não disponibilizou a API URL');
    const original = new URLType(win.location.href);
    const member = original.pathname.match(/^\/members\/(\d+)\/videos\/?$/);
    if (!member) { show('Abra a lista de vídeos de um perfil'); return; }
    if (original.searchParams.get('mode') === 'async') return;
    if (typeof GM === 'undefined' || typeof GM.getValue !== 'function' || typeof GM.setValue !== 'function') {
      throw new Error('As permissões GM.getValue / GM.setValue não estão disponíveis. Confira o cabeçalho do script');
    }
    const PARAM = 'from_uploaded_videos';
    const KEY = 'porntrex-continuar-v1:' + member[1];
    const BACKUP = 'porntrex-continuar-backup-v1:' + member[1];
    const filters = ['is_private', 'sort_by'];
    const validPosition = value => typeof value === 'string' && /^\d{1,9}$/.test(value);
    function decode(raw) {
      try {
        const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if (!value || !validPosition(value.position)) return null;
        return { position: value.position,
          is_private: typeof value.is_private === 'string' ? value.is_private : '0,1',
          sort_by: typeof value.sort_by === 'string' ? value.sort_by : '',
          updated: Number.isFinite(value.updated) ? value.updated : 0 };
      } catch { return null; }
    }
    let local;
    try { local = decode(win.localStorage.getItem(BACKUP)); } catch { local = null; }
    let stored;
    try { stored = decode(await deadline(GM.getValue(KEY, 'null'), 'Leitura dos dados salvos')); }
    catch (error) { if (!local) throw error; }
    let record = local && (!stored || local.updated > stored.updated) ? local : stored;
    function backup(state) {
      try { win.localStorage.setItem(BACKUP, JSON.stringify(state)); return true; }
      catch { return false; }
    }

    function directURL(state) {
      const url = new URLType(win.location.href);
      for (const key of ['mode', 'function', 'block_id', '_']) url.searchParams.delete(key);
      url.searchParams.set(PARAM, state.position);
      for (const key of filters) {
        if (typeof state[key] === 'string') url.searchParams.set(key, state[key]);
        else url.searchParams.delete(key);
      }
      return url;
    }
    // Uma aba restaurada pode conter uma URL antiga, inclusive com número de página.
    // A posição guardada tem prioridade; o menu permite escolher outra posição.
    if (record && (original.searchParams.get(PARAM) !== record.position ||
        filters.some(key => original.searchParams.has(key) && original.searchParams.get(key) !== record[key]))) {
      show('Retomando a posição ' + record.position + '…');
      win.location.replace(directURL(record).href);
      return;
    }
    record = record || {
      position: validPosition(original.searchParams.get(PARAM)) ? original.searchParams.get(PARAM) : '1',
      is_private: original.searchParams.get('is_private') ?? '0,1',
      sort_by: original.searchParams.get('sort_by') ?? '', updated: Date.now()
    };
    let writeQueue = Promise.resolve();
    function persist(state, updateAddress = true) {
      state = { ...state, updated: Math.max(Date.now(), (record.updated || 0) + 1) };
      record = state;
      // Esta cópia é gravada no momento da mudança, antes da API assíncrona.
      const localOK = backup(state);
      show('Salvando posição ' + state.position + '…');
      writeQueue = writeQueue.then(async () => {
        try {
          await deadline(GM.setValue(KEY, JSON.stringify(state)), 'Gravação da posição');
          if (record.updated === state.updated) show('Posição salva: ' + state.position + '\nGravação confirmada.');
        } catch (error) {
          if (record.updated === state.updated) show(localOK ? 'Posição guardada na cópia local: ' + state.position : 'Falha ao salvar: ' + error.message);
        }
      });
      if (updateAddress) {
        try { win.history.replaceState(win.history.state, '', directURL(state).href); }
        catch (error) { console.warn('[Continuar por perfil] Falha ao atualizar a URL.', error); }
      }
      return writeQueue;
    }
    let navigating = false;
    async function navigate(state) {
      if (navigating) return;
      navigating = true;
      await persist(state, false);
      win.location.assign(directURL(state).href);
    }
    command('Ir para uma posição…', () => {
      const value = win.prompt('Digite o valor da paginação para este perfil:', record.position);
      if (value === null) return;
      const position = value.trim();
      if (!validPosition(position)) { win.alert('Digite um número inteiro entre 0 e 999999999.'); return; }
      navigate({ ...record, position });
    });
    command('Voltar ao início', () => navigate({ ...record, position: '1' }));
    await persist(record, false);

    function parameters(node) {
      const result = new Map();
      const href = node.getAttribute('href');
      if (href) {
        try {
          const url = new URLType(href, original.href);
          if (url.origin === original.origin && url.pathname === original.pathname) {
            for (const key of [PARAM, ...filters, 'block_id']) if (url.searchParams.has(key)) result.set(key, url.searchParams.get(key));
          }
        } catch {}
      }
      const data = node.getAttribute('data-parameters') || '';
      const pattern = /(?:^|[;&])\s*(from_uploaded_videos|is_private|sort_by|block_id)\s*[:=]\s*([^;&]*)/g;
      for (const match of data.matchAll(pattern)) {
        let value = match[2].trim();
        try { value = decodeURIComponent(value.replace(/\+/g, ' ')); } catch {}
        result.set(match[1], value);
      }
      return result;
    }
    // Botões de paginação conhecidos passam a carregar uma URL numerada.
    // A gravação é confirmada antes de começar esse carregamento.
    doc.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      let target = event.target;
      if (target && target.nodeType === 3) target = target.parentElement;
      const node = target && typeof target.closest === 'function' ? target.closest('a,button,[data-parameters]') : null;
      if (!node || node.disabled || node.getAttribute('aria-disabled') === 'true') return;
      const params = parameters(node);
      const position = params.get(PARAM);
      if (!validPosition(position)) return;
      const block = params.get('block_id') || node.getAttribute('data-block-id');
      if (block && block !== 'list_videos_uploaded_videos') return;
      const state = { ...record, position };
      for (const key of filters) if (params.has(key)) state[key] = params.get(key);
      event.preventDefault();
      event.stopImmediatePropagation();
      navigate(state).catch(error => { navigating = false; show('Falha na navegação: ' + error.message); });
    }, true);

    let lastStart = -1;
    const seen = new Set();
    function observed(entry) {
      if (navigating) return;
      if (!['xmlhttprequest', 'fetch'].includes(entry.initiatorType)) return;
      if (entry.responseStatus && (entry.responseStatus < 200 || entry.responseStatus >= 300)) return;
      let url;
      try { url = new URLType(entry.name, win.location.href); } catch { return; }
      if (url.origin !== original.origin || url.pathname !== original.pathname) return;
      const params = url.searchParams;
      if (params.get('function') !== 'get_block' || params.get('block_id') !== 'list_videos_uploaded_videos') return;
      const token = entry.startTime + ':' + entry.name;
      if (seen.has(token)) return;
      seen.add(token);
      if (seen.size > 500) seen.delete(seen.values().next().value);
      let position = params.get(PARAM);
      if (!validPosition(position)) {
        if (!filters.some(key => params.has(key) && params.get(key) !== record[key])) return;
        position = '1';
      }
      if (entry.startTime < lastStart) return;
      lastStart = entry.startTime;
      const state = { ...record, position, updated: Date.now() };
      for (const key of filters) if (params.has(key)) state[key] = params.get(key);
      persist(state);
    }
    let monitoring = false;
    try {
      if (typeof win.PerformanceObserver === 'function') {
        const observer = new win.PerformanceObserver(list => {
          try { for (const entry of list.getEntries()) observed(entry); }
          catch (error) { show('Falha ao acompanhar a paginação: ' + error.message); }
        });
        observer.observe({ type: 'resource', buffered: true });
        monitoring = true;
      }
    } catch (error) { console.warn('[Continuar por perfil] Observador indisponível.', error); }
    // Consulta periódica serve de alternativa caso o observador não funcione no sandbox.
    try {
      if (win.performance && typeof win.performance.getEntriesByType === 'function') {
        const poll = () => {
          try { for (const entry of win.performance.getEntriesByType('resource')) observed(entry); }
          catch (error) { show('Falha ao acompanhar a paginação: ' + error.message); }
        };
        poll(); win.setInterval(poll, 1000);
        monitoring = true;
      }
    } catch (error) { console.warn('[Continuar por perfil] Consulta de requisições indisponível.', error); }
    if (!monitoring) show('Script ativo, mas sem acesso à paginação automática');
  }
  initialize().catch(error => {
    show('Falha ao iniciar: ' + (error.message || String(error)));
    console.error('[Continuar por perfil]', error);
  });
})();

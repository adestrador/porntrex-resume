const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const code = fs.readFileSync(path.join(__dirname, '..', 'porntrex-resume.user.js'), 'utf8');
const base = 'https://www.porntrex.com/members/123456/videos/';
const key = 'porntrex-continuar-v1:123456';
const backupKey = 'porntrex-continuar-backup-v1:123456';
const flush = () => new Promise(setImmediate);
const record = (position, updated = 100) => ({ position, is_private: '0,1', sort_by: '', updated });

function fixture() {
  const storage = new Map();
  const local = new Map();
  function boot(href) {
    let observer, hold = false;
    const commands = new Map();
    const listeners = new Map();
    const alerts = [];
    const win = {
      URL,
      location: {
        href,
        replace(url) { this.redirect = url; },
        assign(url) { this.target = url; }
      },
      history: {
        state: { preserved: true },
        replaceState(state, title, url) {
          assert.equal(state.preserved, true);
          win.location.href = url;
        }
      },
      setTimeout() { return 1; }, clearTimeout() {}, setInterval() { return 2; },
      localStorage: {
        getItem(k) { return local.get(k) ?? null; },
        setItem(k, value) { local.set(k, value); }
      },
      performance: { getEntriesByType() { return []; } },
      PerformanceObserver: class {
        constructor(callback) { observer = callback; }
        observe() {}
      },
      alert(text) { alerts.push(text); },
      prompt() { return '12'; }
    };
    const GM = {
      async getValue(k, fallback) { return storage.get(k) ?? fallback; },
      setValue(k, value) {
        assert.equal(typeof value, 'string');
        if (hold) return new Promise(() => {});
        storage.set(k, value);
        return Promise.resolve();
      },
      registerMenuCommand(caption, callback) { commands.set(caption, callback); }
    };
    // Não oferece criação de elementos: a execução precisa continuar sem painel.
    const document = { addEventListener(name, callback) { listeners.set(name, callback); } };
    vm.runInNewContext(code, { window: win, document, GM, console });
    return {
      win, commands, alerts,
      holdWrites() { hold = true; },
      emit(position, extra = {}) {
        observer({ getEntries: () => [{
          name: base + '?mode=async&function=get_block&block_id=list_videos_uploaded_videos&from_uploaded_videos=' + position,
          initiatorType: 'xmlhttprequest', responseStatus: 200, startTime: 10, ...extra
        }] });
      },
      click(attributes, extra = {}) {
        const node = {
          nodeType: 1,
          closest() { return this; },
          getAttribute(name) { return attributes[name] ?? null; }
        };
        const event = {
          button: 0, target: node,
          preventDefault() { this.prevented = true; },
          stopImmediatePropagation() { this.stopped = true; }, ...extra
        };
        listeners.get('click')(event);
        return event;
      }
    };
  }
  return { storage, local, boot };
}

test('retoma a posição guardada mesmo quando a aba contém a URL antiga da primeira página', async () => {
  const f = fixture();
  f.storage.set(key, JSON.stringify(record('60')));
  const tab = f.boot(base + '?from_uploaded_videos=1&is_private=0%2C1&sort_by=');
  await flush();
  assert.equal(new URL(tab.win.location.redirect).searchParams.get('from_uploaded_videos'), '60');
  assert.equal(JSON.parse(f.storage.get(key)).position, '60');
});

test('salva a paginação AJAX, atualiza a URL e mantém os comandos fora da página', async () => {
  const f = fixture();
  const tab = f.boot(base + '?from_uploaded_videos=4');
  await flush();
  tab.emit('05'); await flush();
  assert.equal(JSON.parse(f.storage.get(key)).position, '05');
  assert.equal(new URL(tab.win.location.href).searchParams.get('from_uploaded_videos'), '05');
  assert.equal(tab.commands.size, 3);
  tab.commands.get('Consultar posição salva')();
  assert.match(tab.alerts[0], /Posição salva: 05/);
});

test('grava a cópia local antes da API e recupera após interrupção da execução', async () => {
  const f = fixture();
  const tab = f.boot(base + '?from_uploaded_videos=60');
  await flush(); tab.holdWrites();
  const event = tab.click({
    href: '#', 'data-block-id': 'list_videos_uploaded_videos',
    'data-parameters': 'is_private:0,1;sort_by:;from_uploaded_videos:61'
  });
  assert.equal(event.prevented, true);
  assert.equal(JSON.parse(f.local.get(backupKey)).position, '61');
  await flush();
  assert.equal(tab.win.location.target, undefined);
  assert.equal(JSON.parse(f.storage.get(key)).position, '60');
  const restarted = f.boot(base + '?from_uploaded_videos=1&is_private=0%2C1');
  await flush();
  assert.equal(new URL(restarted.win.location.redirect).searchParams.get('from_uploaded_videos'), '61');
});

test('espera a gravação antes de navegar pelo botão reconhecido', async () => {
  const f = fixture();
  const tab = f.boot(base); await flush();
  tab.click({ 'data-parameters': 'from_uploaded_videos:2;is_private:0%2C1;sort_by:post_date' });
  assert.equal(tab.win.location.target, undefined);
  await flush();
  assert.equal(new URL(tab.win.location.target).searchParams.get('from_uploaded_videos'), '2');
  assert.equal(JSON.parse(f.storage.get(key)).sort_by, 'post_date');
});

test('separa perfis e permite voltar ao início pelo menu', async () => {
  const f = fixture();
  const tab = f.boot(base + '?from_uploaded_videos=60'); await flush();
  const other = f.boot('https://www.porntrex.com/members/654321/videos/'); await flush();
  assert.equal(other.win.location.redirect, undefined);
  assert.equal(JSON.parse(f.storage.get(key)).position, '60');
  tab.commands.get('Voltar ao início')(); await flush();
  assert.equal(JSON.parse(f.storage.get(key)).position, '1');
  assert.equal(new URL(tab.win.location.target).searchParams.get('from_uploaded_videos'), '1');
});

test('ignora erro HTTP, respostas antigas, cliques em vídeos e outros blocos', async () => {
  const f = fixture();
  const tab = f.boot(base + '?from_uploaded_videos=4'); await flush();
  tab.emit('5'); await flush();
  tab.emit('6', { responseStatus: 500, startTime: 20 });
  tab.emit('3', { startTime: 1 }); await flush();
  assert.equal(JSON.parse(f.storage.get(key)).position, '5');
  assert.equal(tab.click({ href: '/videos/exemplo/' }).prevented, undefined);
  assert.equal(tab.click({ 'data-parameters': 'from_uploaded_videos:9', 'data-block-id': 'outro_bloco' }).prevented, undefined);
  assert.equal(tab.click({ 'data-parameters': 'from_uploaded_videos:9' }, { ctrlKey: true }).prevented, undefined);
});

import './styles.css';

type FileItem = { file: File; name: string; category: string; reason: string };
const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="shell">
    <header class="topbar">
      <a class="brand" href="#" aria-label="LazyDesk AI home"><span class="brand-mark">L</span><span>LazyDesk <em>AI</em></span></a>
      <div class="local-pill"><span></span> Local-first by design</div>
    </header>
    <main>
      <section class="hero">
        <div class="eyebrow"><span class="spark">✳</span> YOUR DIGITAL RESET</div>
        <h1>Less sorting.<br><span>More living.</span></h1>
        <p class="lede">A calmer downloads folder starts here. Pick files, let your local AI suggest where they belong, and stay in control of every change.</p>
        <div class="hero-actions">
          <button id="choose" class="btn primary">Choose files <span aria-hidden="true">↗</span></button>
          <button id="demo" class="btn secondary">Try sample workspace</button>
          <input id="file-input" type="file" multiple hidden />
        </div>
        <div class="trust-row"><span>⌁</span> Files stay on your device <i></i> No account needed <i></i> Review before moving</div>
      </section>

      <section class="workspace" aria-label="File organization workspace">
        <div class="workspace-head">
          <div><div class="section-kicker">WORKSPACE</div><h2>Your digital desk</h2></div>
          <div class="model-status"><span class="status-dot" id="status-dot"></span><span id="model-status">Sample mode</span></div>
        </div>
        <div class="connect-panel">
          <div class="connect-icon">✳</div>
          <div class="connect-copy"><strong>Bring your own local AI</strong><p>Run Ollama on this computer for private, model-powered suggestions.</p></div>
          <div class="connect-controls"><input id="model" value="qwen2.5:1.5b" aria-label="Ollama model name" /><button id="connect" class="btn small">Check Ollama</button></div>
        </div>
        <div class="toolbar">
          <div class="file-count"><strong id="count">0 files</strong><span id="subcount">Ready when you are</span></div>
          <div class="filters" role="group" aria-label="Filter files">
            <button class="filter active" data-filter="All">All</button>
            <button class="filter" data-filter="Documents">Docs</button>
            <button class="filter" data-filter="Images">Images</button>
            <button class="filter" data-filter="Other">Other</button>
          </div>
        </div>
        <div id="file-list" class="file-list">
          <div class="empty-state"><div class="empty-art"><span>▤</span><span>▧</span><span>▱</span></div><strong>Your files, finally in their place.</strong><p>Choose a few files or load the sample workspace to see how it works.</p></div>
        </div>
        <div class="workspace-foot"><span><b>✦</b> Suggestions are reversible. Nothing moves automatically.</span><button id="organize" class="btn primary" disabled>Suggest organization <span>→</span></button></div>
      </section>

      <section class="how">
        <div><div class="section-kicker">A GENTLER WORKFLOW</div><h2>Three steps.<br>One less chore.</h2></div>
        <div class="steps">
          <article><span>01</span><strong>Gather</strong><p>Select the files you keep putting off sorting.</p></article>
          <article><span>02</span><strong>Ask local AI</strong><p>Ollama suggests categories from filenames, without uploading your files.</p></article>
          <article><span>03</span><strong>Stay in control</strong><p>Review suggestions before using the included folder plan on your own computer.</p></article>
        </div>
      </section>
      <footer><span>LazyDesk AI</span><span>Open tools. Your files. Your choice.</span></footer>
    </main>
    <div id="toast" class="toast" role="status" aria-live="polite"></div>
  </div>`;

const input = app.querySelector<HTMLInputElement>('#file-input')!;
const fileList = app.querySelector<HTMLDivElement>('#file-list')!;
const count = app.querySelector<HTMLElement>('#count')!;
const subcount = app.querySelector<HTMLElement>('#subcount')!;
const organize = app.querySelector<HTMLButtonElement>('#organize')!;
const toast = app.querySelector<HTMLDivElement>('#toast')!;
let items: FileItem[] = [];
let filter = 'All';
let sampleMode = true;
let ollamaReady = false;
let toastTimer: number | undefined;

function notify(message: string) {
  toast.textContent = message;
  toast.classList.add('visible');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => toast.classList.remove('visible'), 3200);
}
function categoryFor(name: string) {
  const ext = name.split('.').pop()?.toLowerCase() || '';
  if (
    [
      'pdf',
      'doc',
      'docx',
      'txt',
      'rtf',
      'odt',
      'ppt',
      'pptx',
      'xls',
      'xlsx',
      'csv',
    ].includes(ext)
  )
    return 'Documents';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'heic'].includes(ext))
    return 'Images';
  if (['mp3', 'wav', 'mp4', 'mov', 'zip', 'rar', '7z'].includes(ext))
    return 'Media & archives';
  return 'Other';
}
function iconFor(category: string) {
  return category === 'Documents'
    ? '▤'
    : category === 'Images'
      ? '▧'
      : category === 'Media & archives'
        ? '◫'
        : '◩';
}
function render() {
  count.textContent = items.length + (items.length === 1 ? ' file' : ' files');
  subcount.textContent = items.length
    ? items.filter(x => x.reason !== 'Waiting for suggestions').length +
      ' reviewed'
    : 'Ready when you are';
  organize.disabled = items.length === 0;
  const visible = items.filter(
    x =>
      filter === 'All' ||
      (filter === 'Other'
        ? !['Documents', 'Images'].includes(x.category)
        : x.category === filter)
  );
  if (!visible.length) {
    fileList.innerHTML =
      '<div class="empty-state compact"><strong>No files in this view.</strong><p>Try another filter or add more files.</p></div>';
    return;
  }
  fileList.innerHTML = visible
    .map(item => {
      const idx = items.indexOf(item);
      const size =
        item.file.size < 1024 * 1024
          ? Math.max(1, Math.round(item.file.size / 1024)) + ' KB'
          : (item.file.size / 1024 / 1024).toFixed(1) + ' MB';
      return (
        '<div class="file-row"><div class="file-icon">' +
        iconFor(item.category) +
        '</div><div class="file-meta"><strong title="' +
        escapeHtml(item.name) +
        '">' +
        escapeHtml(item.name) +
        '</strong><span>' +
        size +
        ' · ' +
        item.category +
        '</span></div><div class="suggestion"><span>Suggested folder</span><select data-index="' +
        idx +
        '" aria-label="Suggested category for ' +
        escapeHtml(item.name) +
        '">' +
        ['Documents', 'Images', 'Media & archives', 'Other', 'Review']
          .map(
            c =>
              '<option ' +
              (item.category === c ? 'selected' : '') +
              '>' +
              c +
              '</option>'
          )
          .join('') +
        '</select></div></div>'
      );
    })
    .join('');
  fileList
    .querySelectorAll<HTMLSelectElement>('select[data-index]')
    .forEach(sel =>
      sel.addEventListener('change', () => {
        const item = items[Number(sel.dataset.index)];
        if (item) {
          item.category = sel.value;
          item.reason = 'Reviewed by you';
          render();
        }
      })
    );
}
function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    char =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        char
      ]!
  );
}
function addFiles(files: File[]) {
  const existing = new Set(items.map(x => x.name));
  for (const file of files) {
    if (existing.has(file.name)) continue;
    items.push({
      file,
      name: file.name,
      category: categoryFor(file.name),
      reason: 'Waiting for suggestions',
    });
  }
  sampleMode = false;
  render();
}
input.addEventListener('change', () => {
  addFiles(Array.from(input.files || []));
  input.value = '';
});
app.querySelector('#choose')!.addEventListener('click', () => input.click());
app.querySelector('#demo')!.addEventListener('click', () => {
  const samples = [
    ['lecture-notes-week-4.pdf', 'Documents', 184000],
    ['weekend-hike.jpg', 'Images', 2420000],
    ['project-budget.xlsx', 'Documents', 72000],
    ['voice-memo.m4a', 'Media & archives', 830000],
    ['scan-2026-10-21.pdf', 'Documents', 340000],
    ['untitled-final-final.png', 'Images', 1250000],
  ] as const;
  items = samples.map(([name, category, size]) => ({
    file: new File(['sample file preview'], name, {
      type: 'application/octet-stream',
      lastModified: Date.now(),
    }),
    name,
    category,
    reason: 'Sample suggestion',
  }));
  // Demo sizes are represented by harmless sample files; no actual files are changed.
  sampleMode = true;
  render();
  notify('Sample workspace loaded. No files were moved or uploaded.');
});
app.querySelectorAll<HTMLButtonElement>('.filter').forEach(btn =>
  btn.addEventListener('click', () => {
    filter = btn.dataset.filter || 'All';
    app
      .querySelectorAll('.filter')
      .forEach(b => b.classList.toggle('active', b === btn));
    render();
  })
);
app
  .querySelector<HTMLButtonElement>('#connect')!
  .addEventListener('click', async () => {
    const status = app.querySelector<HTMLElement>('#model-status')!;
    const dot = app.querySelector<HTMLElement>('#status-dot')!;
    status.textContent = 'Checking local Ollama…';
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (!response.ok) throw new Error('Ollama did not respond');
      const data = (await response.json()) as {
        models?: Array<{ name: string }>;
      };
      const wanted =
        app.querySelector<HTMLInputElement>('#model')!.value.trim() ||
        'qwen2.5:1.5b';
      const found = (data.models || []).some(
        m => m.name === wanted || m.name.startsWith(wanted + ':')
      );
      if (!found)
        throw new Error(
          'Model not found. Pull ' + wanted + ' in Ollama first.'
        );
      ollamaReady = true;
      status.textContent = 'Local Ollama connected';
      dot.classList.add('ready');
      notify('Connected to Ollama. Your model is ready.');
    } catch {
      ollamaReady = false;
      status.textContent = 'Ollama not connected';
      dot.classList.remove('ready');
      notify(
        'Could not reach Ollama. Start Ollama and allow this site in OLLAMA_ORIGINS, or use sample mode.'
      );
    }
  });
organize.addEventListener('click', async () => {
  if (sampleMode) {
    items = items.map(x => ({ ...x, reason: 'Sample suggestion' }));
  }
  organize.disabled = true;
  organize.textContent = 'Thinking…';
  try {
    if (!ollamaReady) throw new Error('not connected');
    const model =
      app.querySelector<HTMLInputElement>('#model')!.value.trim() ||
      'qwen2.5:1.5b';
    const names = items.map(x => x.name);
    const prompt =
      'Categorize each filename into exactly one category: Documents, Images, Media & archives, or Other. Return only a JSON array of objects with keys name and category. Preserve exact filenames. Filenames: ' +
      JSON.stringify(names);
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false, format: 'json' }),
    });
    if (!response.ok) throw new Error('model request failed');
    const data = (await response.json()) as { response: string };
    const parsed = JSON.parse(data.response) as
      | { name: string; category: string }[]
      | { files: { name: string; category: string }[] };
    const rows = Array.isArray(parsed) ? parsed : parsed.files;
    if (!Array.isArray(rows)) throw new Error('unexpected model response');
    for (const row of rows) {
      const item = items.find(x => x.name === row.name);
      if (
        item &&
        ['Documents', 'Images', 'Media & archives', 'Other'].includes(
          row.category
        )
      ) {
        item.category = row.category;
        item.reason = 'Suggested by local ' + model;
      }
    }
    notify('Local AI suggestions are ready. Review each folder before acting.');
  } catch {
    items = items.map(x => ({
      ...x,
      reason:
        x.reason === 'Waiting for suggestions'
          ? 'Suggested from file extension'
          : x.reason,
    }));
    notify(
      'Using safe filename-based suggestions. Connect Ollama to enable local model suggestions.'
    );
  } finally {
    organize.textContent = 'Suggest organization →';
    render();
  }
});
render();

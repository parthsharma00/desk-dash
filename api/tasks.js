// GET  /api/tasks  -> { items: [{ id, kind, title, due, done, status, priority, subject, type }] }
// POST /api/tasks  { id, kind: 'task'|'assignment', done: boolean } -> { ok: true }
const NOTION = 'https://api.notion.com/v1';
const VERSION = '2022-06-28';

const TASKS_DB = process.env.TASKS_DB || '25dc767c-48ba-807b-b490-ce88c5515920';
const ASSIGNMENTS_DB = process.env.ASSIGNMENTS_DB || 'ba59c1cf-5680-48e0-a8ac-537e8a7be635';

async function notion(path, opts = {}) {
  const r = await fetch(NOTION + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + process.env.NOTION_TOKEN,
      'Notion-Version': VERSION,
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  if (!r.ok) {
    const t = await r.text();
    const e = new Error('Notion ' + r.status + ': ' + t.slice(0, 200));
    e.status = r.status;
    throw e;
  }
  return r.json();
}

const text = (p) => (p && p.title ? p.title.map((t) => t.plain_text).join('') : '');
const sel = (p) => (p && p.select ? p.select.name : undefined);

async function queryAll(db, body) {
  const out = [];
  let cursor;
  do {
    const j = await notion('/databases/' + db + '/query', {
      method: 'POST',
      body: JSON.stringify({ ...body, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) }),
    });
    out.push(...j.results);
    cursor = j.has_more ? j.next_cursor : null;
  } while (cursor && out.length < 300);
  return out;
}

function mapTask(pg) {
  const p = pg.properties;
  const status = p['Status'] && p['Status'].status ? p['Status'].status.name : '';
  return {
    id: pg.id,
    kind: 'task',
    title: text(p['Task name']) || 'Untitled',
    due: p['Due date'] && p['Due date'].date ? p['Due date'].date.start.slice(0, 10) : null,
    done: status === 'Done',
    status,
    priority: sel(p['prio']),
  };
}

function mapAssignment(pg) {
  const p = pg.properties;
  const status = sel(p['Status']) || '';
  return {
    id: pg.id,
    kind: 'assignment',
    title: text(p['Name']) || 'Untitled',
    due: p['Due Date'] && p['Due Date'].date ? p['Due Date'].date.start.slice(0, 10) : null,
    done: status === 'Done',
    status,
    subject: sel(p['Subject']),
    type: sel(p['Type']),
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-dash-key, content-type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (!process.env.DASH_KEY || req.headers['x-dash-key'] !== process.env.DASH_KEY) {
    return res.status(401).json({ error: 'Wrong or missing dashboard key.' });
  }
  if (!process.env.NOTION_TOKEN) {
    return res.status(500).json({ error: 'NOTION_TOKEN is not set on the server.' });
  }

  try {
    if (req.method === 'GET') {
      // Hide anything done more than a day ago is handled client-side; fetch everything not done plus recent.
      const [tasks, asg] = await Promise.all([
        queryAll(TASKS_DB, { filter: { property: 'Status', status: { does_not_equal: 'Done' } } }),
        queryAll(ASSIGNMENTS_DB, { filter: { property: 'Status', select: { does_not_equal: 'Done' } } }),
      ]);
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).json({ items: [...tasks.map(mapTask), ...asg.map(mapAssignment)] });
    }

    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
      const { id, kind, done } = body;
      if (!id || typeof done !== 'boolean' || !['task', 'assignment'].includes(kind)) {
        return res.status(400).json({ error: 'Send { id, kind, done }.' });
      }
      const properties =
        kind === 'task'
          ? { Status: { status: { name: done ? 'Done' : 'Not started' } } }
          : { Status: { select: { name: done ? 'Done' : 'Not started' } } };
      await notion('/pages/' + id, { method: 'PATCH', body: JSON.stringify({ properties }) });
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Use GET or POST.' });
  } catch (e) {
    return res.status(e.status === 401 || e.status === 404 ? 502 : 500).json({ error: String(e.message || e) });
  }
};

module.exports._test = { mapTask, mapAssignment };

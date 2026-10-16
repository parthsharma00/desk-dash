// GET /api/calendar -> { events: [{ id, title, start, end, allDay, location }] } for the next 7 days
const ical = require('node-ical');

const DAYS = 7;

function expand(events, from, to) {
  const out = [];
  for (const ev of Object.values(events)) {
    if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;
    const allDay = ev.datetype === 'date';
    const dur = (ev.end ? +new Date(ev.end) : +new Date(ev.start) + 36e5) - +new Date(ev.start);
    const push = (start, id, over) => {
      const s = new Date(start);
      const e = new Date(+s + dur);
      if (e < from || s > to) return;
      out.push({
        id,
        title: (over && over.summary) || ev.summary || 'Busy',
        start: s.toISOString(),
        end: e.toISOString(),
        allDay,
        location: ((over && over.location) || ev.location || '').toString().split('\n')[0],
      });
    };
    if (ev.rrule) {
      const dates = ev.rrule.between(new Date(+from - dur), to, true);
      for (const d of dates) {
        const key = d.toISOString().slice(0, 10);
        if (ev.exdate && Object.values(ev.exdate).some((x) => new Date(x).toISOString().slice(0, 10) === key)) continue;
        const over = ev.recurrences && ev.recurrences[key];
        push(over ? over.start : d, ev.uid + '@' + key, over);
      }
    } else {
      push(ev.start, ev.uid);
    }
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'x-dash-key, content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!process.env.DASH_KEY || req.headers['x-dash-key'] !== process.env.DASH_KEY) {
    return res.status(401).json({ error: 'Wrong or missing dashboard key.' });
  }
  if (!process.env.ICS_URL) return res.status(200).json({ events: [] });
  try {
    const data = await ical.async.fromURL(process.env.ICS_URL);
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(+from + DAYS * 864e5);
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
    return res.status(200).json({ events: expand(data, from, to) });
  } catch (e) {
    return res.status(502).json({ error: 'Could not read the calendar link: ' + String(e.message || e) });
  }
};

module.exports._expand = expand;

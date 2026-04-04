import { Redis } from '@upstash/redis';

const kv = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const PIN = '3344';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — barcha dinamik maqolalarni qaytaradi
  if (req.method === 'GET') {
    const keys = await kv.keys('article:*');
    if (!keys.length) return res.status(200).json([]);
    const articles = await Promise.all(keys.map(k => kv.get(k)));
    articles.sort((a, b) => a.num - b.num);
    return res.status(200).json(articles);
  }

  // POST — yangi maqola qo'shadi (PIN tekshiruvi bilan)
  if (req.method === 'POST') {
    const { pin, title, tags, authors, abstract, findings, journal, region, impact } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title majburiy' });
    }

    if (pin !== PIN) {
      return res.status(403).json({ error: "Noto'g'ri PIN kod" });
    }

    // Raqam: 4 ta statik maqola bor, shundan keyin boshlanadi
    const counter = await kv.incr('article_counter');
    const num = counter + 4;
    const id = `article:${num}`;

    const article = {
      num,
      title: title.trim(),
      tags: (tags || '').trim(),
      authors: (authors || '').trim(),
      abstract: (abstract || '').trim(),
      findings: Array.isArray(findings)
        ? findings.filter(f => f.trim())
        : (findings || '').split('\n').map(f => f.trim()).filter(Boolean),
      journal: (journal || '').trim(),
      region: (region || '').trim(),
      impact: (impact || '').trim(),
    };

    await kv.set(id, article);
    return res.status(201).json({ success: true, article });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

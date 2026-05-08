// 언러닝컴퍼니 홈페이지 문의 폼 → Notion DB 전송 함수
// 환경변수 필요: NOTION_TOKEN, ALLOWED_ORIGIN

const NOTION_API = "https://api.notion.com/v1/pages";
const NOTION_VERSION = "2022-06-28";
const DATABASE_ID = "8fc3736f-83b2-4e1f-bf7b-86ea2ea1e76a";

const ALLOWED_ORIGINS = [
  "https://bropumpkin.github.io",
  ...(process.env.ALLOWED_ORIGIN ? [process.env.ALLOWED_ORIGIN] : []),
];

function setCors(req, res) {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(req, res);
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { org, tel, email, message, agreed } = req.body || {};

    if (!org || !tel || !email || !message) {
      return res.status(400).json({ error: "필수 항목이 누락됐습니다." });
    }
    if (!agreed) {
      return res.status(400).json({ error: "개인정보 수집 동의가 필요합니다." });
    }
    if (typeof org !== "string" || org.length > 200) return res.status(400).json({ error: "단체명 형식 오류" });
    if (typeof message !== "string" || message.length > 2000) return res.status(400).json({ error: "문의 내용 형식 오류" });

    const notionRes = await fetch(NOTION_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: DATABASE_ID },
        properties: {
          "단체명/기업명":      { title:        [{ type: "text", text: { content: org } }] },
          "담당자 전화번호":    { phone_number: tel },
          "담당자 이메일":      { email:        email },
          "문의 내용":          { rich_text:    [{ type: "text", text: { content: message } }] },
          "개인정보 수집 동의": { checkbox:     !!agreed },
          "상태":               { select:       { name: "신규" } },
        },
      }),
    });

    if (!notionRes.ok) {
      const detail = await notionRes.text();
      console.error("Notion API error:", notionRes.status, detail);
      return res.status(502).json({ error: "Notion 연동 오류" });
    }

    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("Handler error:", e);
    return res.status(500).json({ error: "서버 오류가 발생했습니다." });
  }
}

const API_BASE = "https://thailandformats.com/api/v1";

interface ApiHoliday {
  title: string;
  start_date: string;
  end_date: string;
  type: string;
  alcohol_ban: boolean;
  details: string;
  slug: string;
}

const SLUG_TO_THAI: Record<string, string> = {
  "new-years-day": "วันขึ้นปีใหม่",
  "special-public-holiday": "วันหยุดพิเศษ",
  "makha-bucha-day": "วันมาฆบูชา",
  "chakri-memorial-day": "วันจักรี",
  "songkran-festival": "วันสงกรานต์",
  "national-labour-day": "วันแรงงานแห่งชาติ",
  "coronation-day": "วันฉัตรมงคล",
  "visakha-bucha-day": "วันวิสาขบูชา",
  "substitution-for-visakha-bucha-day": "ชดเชยวันวิสาขบูชา",
  "hm-queen-suthidas-birthday": "วันเฉลิมพระชนมพรรษาสมเด็จพระนางเจ้าสุทิดา",
  "substitution-for-buddhist-lent-day": "ชดเชยวันอาสาฬหบูชา",
  "hm-king-maha-vajiralongkorns-birthday": "วันเฉลิมพระชนมพรรษาพระบาทสมเด็จพระเจ้าอยู่หัว",
  "asanha-bucha-day": "วันอาสาฬหบูชา",
  "buddhist-lent-day": "วันเข้าพรรษา",
  "hm-queen-sirikit-the-queen-mothers-birthday-mothers-day":
    "วันเฉลิมพระชนมพรรษาสมเด็จพระบรมราชชนนีพันปีหลวง / วันแม่แห่งชาติ",
  "hm-king-bhumibol-adulyadej-the-great-memorial-day":
    "วันคล้ายวันสวรรคตพระบาทสมเด็จพระบรมชนกาธิเบศร",
  "chulalongkorn-memorial-day": "วันปิยมหาราช",
  "hm-king-bhumibol-adulyadejs-birthday-national-day-fathers-day":
    "วันคล้ายวันพระบรมราชสมภพพระบาทสมเด็จพระบรมชนกาธิเบศร / วันพ่อแห่งชาติ",
  "substitution-for-hm-king-bhumibol-adulyadejs-birthday":
    "ชดเชยวันคล้ายวันพระบรมราชสมภพฯ",
  "constitution-day": "วันรัฐธรรมนูญ",
  "new-years-eve": "วันสิ้นปี",
};

function thaiName(slug: string, fallback: string): string {
  return SLUG_TO_THAI[slug] || fallback;
}

export async function fetchThaiHolidays(
  year: number
): Promise<{ date: string; name: string }[]> {
  const res = await fetch(`${API_BASE}/holidays/${year}`, {
    next: { revalidate: 86400 },
  });

  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }

  const data = await res.json();
  const holidays: ApiHoliday[] = data.holidays || [];

  const result: { date: string; name: string }[] = [];

  for (const h of holidays) {
    const name = thaiName(h.slug, h.title);

    if (h.start_date === h.end_date) {
      result.push({ date: h.start_date, name });
    } else {
      const start = new Date(h.start_date);
      const end = new Date(h.end_date);
      const d = new Date(start);
      while (d <= end) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        result.push({ date: dateStr, name });
        d.setDate(d.getDate() + 1);
      }
    }
  }

  return result;
}

# מכ״ם מגפות ישראל + יחידת לימוד "מגפות וחיסונים"

אתר סטטי (מתאים ל-GitHub Pages) עם שני חלקים:

| חלק | קובץ | מה יש בו |
|---|---|---|
| **מכ״ם המגפות** | `index.html` | התפרצויות עדכניות מארגון הבריאות העולמי, הערכת סיכון לישראל, כיסוי חיסוני בישראל ונתוני קורונה |
| **חקר מגפות** | `disease.html` | כל מחלה: פרופיל, גרף דיווחים לפי שנה מ-1996, מדינות ומידע מ-MedlinePlus |
| **יחידת לימוד** | `learn/index.html` | 5 פרקים לכיתות י'–י"א: מגפה, קווי הגנה, היסטוריה וחיסונים, עם בחנים שנבדקים אוטומטית וסימולציות |
| **תיק חקירה** | `learn/research.html` | עבודה בקבוצות: שמירה אוטומטית, מצב מצגת וייצוא ל-PDF |
| **מדריך למורה** | `learn/teacher.html` | מערך שיעורים, מחוון ומפתח תשובות |

## מקורות מידע (חינמיים, בלי מפתח API)

- **WHO Disease Outbreak News**: נקרא ישירות מהדפדפן, בזמן אמת.
- **disease.sh**: נקרא ישירות מהדפדפן, בזמן אמת.
- **WHO GHO** ו-**MedlinePlus**: לא מאפשרים קריאה מהדפדפן (CORS). לכן GitHub Action רץ כל יום (`.github/workflows/update-data.yml`), מריץ את `scripts/update_data.py` ושומר את הנתונים בתיקייה `data/`.

## העלאה ל-GitHub Pages

1. יוצרים מאגר חדש ב-GitHub ודוחפים אליו את התיקייה.
2. **Settings → Pages**: בוחרים *Deploy from a branch*, ואז `main` ו-`/ (root)`.
3. **Settings → Actions → General → Workflow permissions**: בוחרים *Read and write permissions*, כדי שהעדכון היומי יוכל לשמור נתונים.
4. אפשר להריץ את העדכון ידנית בלשונית **Actions**, דרך *Update data* ואז *Run workflow*.

## עבודה מקומית

```bash
python -m http.server 8787
```
ואז פותחים את http://localhost:8787 בדפדפן.

- רענון הנתונים: `python scripts/update_data.py`
- בנייה מחדש של קובצי ה-PDF (דורש Chrome או Edge): `python scripts/build_pdfs.py`

## קבצים חשובים לעריכה

- `data/kb.json`: מאגר הידע על המחלות (דרכי הדבקה, חיסונים, מצב בישראל) והתרגומים של שמות המדינות.
- `learn/quiz-data.js`: שאלות הבחנים.
- `learn/research.js`: שאלות תיק החקירה (`SECTIONS`) ותיק הדוגמה (`EXAMPLE`).

הערכת הסיכון במכ״ם היא מודל לימודי פשוט, ולא הערכה רשמית של משרד הבריאות.

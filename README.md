💵Nibble is a web app designed to facilitate Nibbles and Nook's food ordering system.

Tech Stack:
- NextJS, React, and TypeScript on the frontend
- Python, FastAPI on the backend
- PostgreSQL on Supabase for the database

## Running

**Backend (FastAPI)**  
From the project root:
```bash
cd backend
pip install -r requirements.txt
```
Create a `.env` file (see `backend/.env.example`) and set your **Supabase** database URL. In the Supabase dashboard: **Project Settings → Database → Connection string → URI**. Copy it and put it in `backend/.env` as `DATABASE_URL`. Then:
```bash
uvicorn main:app --reload
# or: python main.py
```
API runs at `http://localhost:8000`. Orders are saved to Supabase (Postgres) and proof files to `backend/uploads/`. If `DATABASE_URL` is not set, orders are only printed and not stored.

**Database connection failing?**  
If you see `getaddrinfo failed` or the app can’t reach the DB: Supabase’s **direct** connection (`db.xxx.supabase.co`) uses **IPv6** by default. Many Windows networks or DNS setups don’t resolve that correctly. **Fix:** use the **Session pooler** instead. In the Supabase dashboard open **Connect** (or **Project Settings → Database**), choose **Session** (not Direct), and copy the **Connection string (URI)**. It will look like `postgresql://postgres.xxxxx:[PASSWORD]@aws-0-XX.pooler.supabase.com:5432/postgres`. Put that in `backend/.env` as `DATABASE_URL`. The pooler host is IPv4-friendly and usually works from Windows.

**Frontend (Next.js)**  
From the project root:
```bash
npm install
npm run dev
```
Open `http://localhost:3000`. Set `NEXT_PUBLIC_API_URL` if the API is not at `http://localhost:8000`.

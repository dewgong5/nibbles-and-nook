import json
import os
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from database import Order, OrderItem, get_session_factory, init_db

load_dotenv()

# Item ID -> price in cents (for storing in order_items)
ITEM_PRICE_CENTS = {
    "pork-bakmie": 1400,
    "earl-grey-tiramisu": 1200,
    "chestnut-tiramisu": 1200,
    "choipan": 1300,
}

UPLOAD_DIR = Path(__file__).resolve().parent / "uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    if os.getenv("DATABASE_URL"):
        try:
            await init_db()
        except Exception as e:
            print("WARNING: Could not connect to database:", e)
            print("App will start anyway; orders will not be saved until the DB is reachable.")
    yield


app = FastAPI(title="Nibbles & nOOk API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def sanitize_filename(name: str) -> str:
    keep = "".join(c for c in name if c.isalnum() or c in "._- ")
    return keep.strip() or "proof"


@app.post("/api/order")
async def submit_order(
    personal: str = Form(...),
    quantities: str = Form(...),
    proof: UploadFile = File(...),
):
    personal_data = json.loads(personal)
    quantities_data = json.loads(quantities)
    file_content = await proof.read()

    if not os.getenv("DATABASE_URL"):
        print("=" * 60)
        print("NEW ORDER (no DATABASE_URL — not saved to DB)")
        print("Personal:", personal_data)
        print("Quantities:", quantities_data)
        print("Proof file:", proof.filename, f"({len(file_content)} bytes)")
        print("=" * 60)
        return {"ok": True}

    order_id = str(uuid.uuid4())
    proof_filename = proof.filename or "proof"
    safe_name = sanitize_filename(proof_filename)
    order_upload_dir = UPLOAD_DIR / order_id
    order_upload_dir.mkdir(parents=True, exist_ok=True)
    proof_path = order_upload_dir / safe_name
    proof_path.write_bytes(file_content)
    proof_stored = f"{order_id}/{safe_name}"

    try:
        session_factory = get_session_factory()
        async with session_factory() as session:
            order = Order(
                id=order_id,
                customer_name=personal_data["name"],
                customer_email=personal_data["email"],
                customer_phone=personal_data["phone"],
                proof_original_filename=proof_filename,
                proof_file_path=proof_stored,
            )
            session.add(order)

            for item_id, qty in quantities_data.items():
                if qty <= 0 or item_id not in ITEM_PRICE_CENTS:
                    continue
                session.add(
                    OrderItem(
                        order_id=order_id,
                        item_id=item_id,
                        quantity=qty,
                        unit_price_cents=ITEM_PRICE_CENTS[item_id],
                    )
                )

            await session.commit()
    except Exception:
        if proof_path.exists():
            proof_path.unlink(missing_ok=True)
        raise

    print("=" * 60)
    print("NEW ORDER SAVED:", order_id)
    print("Personal:", personal_data)
    print("Quantities:", quantities_data)
    print("Proof:", proof_stored)
    print("=" * 60)
    return {"ok": True, "order_id": order_id}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

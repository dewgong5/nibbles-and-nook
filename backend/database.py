import os
import ssl
from datetime import datetime
from urllib.parse import parse_qs, urlencode, urlparse, urlunparse
from uuid import uuid4
from sqlalchemy import String, Integer, DateTime, ForeignKey
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

# Expect DATABASE_URL like postgresql://user:pass@host:5432/dbname
# We use asyncpg; convert to postgresql+asyncpg. Supabase requires SSL (asyncpg needs connect_args).
def get_database_url() -> str:
    url = os.getenv("DATABASE_URL", "")
    if not url:
        return ""
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    # Strip sslmode from URL; we pass ssl via connect_args for asyncpg
    if "?" in url and "sslmode=" in url:
        parsed = urlparse(url)
        qs = parse_qs(parsed.query)
        qs.pop("sslmode", None)
        new_query = urlencode(qs, doseq=True)
        url = urlunparse(parsed._replace(query=new_query))
    return url


def _is_supabase_url() -> bool:
    return "supabase" in os.getenv("DATABASE_URL", "")


class Base(DeclarativeBase):
    pass


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    customer_name: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_email: Mapped[str] = mapped_column(String(255), nullable=False)
    customer_phone: Mapped[str] = mapped_column(String(64), nullable=False)
    proof_original_filename: Mapped[str] = mapped_column(String(512), nullable=False)
    proof_file_path: Mapped[str] = mapped_column(String(1024), nullable=False)

    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    order_id: Mapped[str] = mapped_column(String(36), ForeignKey("orders.id", ondelete="CASCADE"), nullable=False)
    item_id: Mapped[str] = mapped_column(String(64), nullable=False)  # e.g. pork-bakmie
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price_cents: Mapped[int] = mapped_column(Integer, nullable=False)  # price at order time

    order: Mapped["Order"] = relationship(back_populates="order_items")


# Lazy init so DATABASE_URL can be set after import
_engine = None
_session_factory = None


def get_engine():
    global _engine
    if _engine is None:
        url = get_database_url()
        if not url:
            raise ValueError("DATABASE_URL environment variable is not set")
        # Supabase (and pooler) require SSL; asyncpg needs it via connect_args.
        # Pooler cert chain can fail verify on some Windows setups; use context that skips verify.
        connect_args = {}
        if _is_supabase_url():
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl"] = ctx
        _engine = create_async_engine(url, echo=False, connect_args=connect_args)
    return _engine


def get_session_factory():
    global _session_factory
    if _session_factory is None:
        _session_factory = async_sessionmaker(get_engine(), class_=AsyncSession, expire_on_commit=False)
    return _session_factory


async def init_db():
    """Create all tables if they don't exist."""
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def get_session() -> AsyncSession:
    return get_session_factory()()

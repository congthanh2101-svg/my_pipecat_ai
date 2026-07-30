"""
CRM Database — SQLite cho Customer, Order, Product, FAQ
========================================================
Tạo và quản lý CSDL nội bộ để bot tra cứu thông tin khách hàng,
đơn hàng, sản phẩm và câu hỏi thường gặp mà không cần kết nối
đến hệ thống CRM thật bên ngoài.

Seed data được tạo lần đầu khi DB chưa tồn tại.

Cách dùng:
    from crm_db import CRMDB, get_crm_db
    db = get_crm_db()
    customer = db.get_customer_by_phone("0901234567")
"""

import os
import sqlite3
from pathlib import Path
from datetime import datetime, timezone
from loguru import logger

# ---------------------------------------------------------------------------
# Default DB path (tạo trong thư mục data/ cạnh bot)
# ---------------------------------------------------------------------------
_DB_DIR = Path(__file__).parent / "data"
_DB_PATH = os.getenv("CRM_DB_PATH", str(_DB_DIR / "crm.db"))


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------
_SCHEMA_SQL = """
CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT DEFAULT '',
    address TEXT DEFAULT '',
    debt REAL DEFAULT 0.0,
    total_spent REAL DEFAULT 0.0,
    loyalty_points INTEGER DEFAULT 0,
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id INTEGER NOT NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    amount REAL NOT NULL,
    status TEXT DEFAULT 'pending',
    order_date TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT DEFAULT '',
    price REAL NOT NULL,
    stock INTEGER DEFAULT 0,
    description TEXT DEFAULT '',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faq (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT DEFAULT '',
    source TEXT DEFAULT 'manual',
    created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq(category);
"""


# ---------------------------------------------------------------------------
# Seed data
# ---------------------------------------------------------------------------
_SEED_CUSTOMERS = [
    ("0901234567", "Nguyễn Văn An", "an.nguyen@email.com", "123 Lê Lợi, Q1, HCM", 0, 45000000, 1200, ""),
    ("0909876543", "Trần Thị Bình", "binh.tran@email.com", "456 Nguyễn Huệ, Q1, HCM", 2500000, 12000000, 500, "Nợ 2.5tr từ tháng 6"),
    ("0912345678", "Lê Văn Cường", "cuong.le@email.com", "789 CMT8, Tân Bình, HCM", 0, 89000000, 2500, ""),
    ("0933445566", "Phạm Thị Dung", "dung.pham@email.com", "101 Hoàng Diệu, Q4, HCM", 1500000, 35000000, 800, "Khách hàng VIP"),
    ("0977889900", "Hoàng Văn Em", "em.hoang@email.com", "202 Hai Bà Trưng, Đà Lạt", 0, 5500000, 150, ""),
    ("0905112233", "Đỗ Thị Phương", "phuong.do@email.com", "303 Nguyễn Đình Chiểu, Q3, HCM", 500000, 28000000, 900, ""),
    ("0988776655", "Mai Văn Giàu", "giau.mai@email.com", "404 Lý Tự Trọng, Q1, HCM", 0, 150000000, 5000, "Khách hàng thân thiết"),
    ("0911223344", "Vũ Thị Hạnh", "hanh.vu@email.com", "505 Trần Hưng Đạo, Q5, HCM", 0, 7200000, 200, ""),
]

_SEED_ORDERS = [
    (1, "iPhone 15 Pro Max 256GB", 1, 34990000, "delivered", "2026-05-15"),
    (1, "Apple Watch Series 9", 1, 10990000, "shipped", "2026-07-20"),
    (2, "Samsung Galaxy S24 Ultra", 1, 28990000, "delivered", "2026-04-10"),
    (2, "Tai nghe Galaxy Buds3 Pro", 1, 4990000, "pending", "2026-07-25"),
    (3, "MacBook Pro 14\" M3 Pro", 1, 45990000, "delivered", "2026-06-01"),
    (3, "USB-C Hub 7-in-1", 2, 890000, "delivered", "2026-06-01"),
    (3, "AirPods Pro 2", 1, 6990000, "shipped", "2026-07-18"),
    (4, "Laptop Dell XPS 15", 1, 38990000, "delivered", "2026-03-20"),
    (4, "Chuột Logitech MX Master 3S", 1, 2490000, "delivered", "2026-07-10"),
    (5, "Điện thoại Nokia 105", 1, 550000, "delivered", "2026-07-01"),
    (6, "iPad Air M2 11\"", 1, 18990000, "delivered", "2026-05-25"),
    (6, "Ốp lưng iPad", 1, 450000, "pending", "2026-07-28"),
    (7, "Laptop Asus ROG Zephyrus G16", 1, 55990000, "delivered", "2026-02-14"),
    (7, "Màn hình Samsung Odyssey G7 32\"", 1, 17990000, "delivered", "2026-04-20"),
    (7, "Bàn phím cơ Keychron Q3", 1, 3990000, "delivered", "2026-06-15"),
    (7, "Loa Bose SoundLink Max", 1, 12990000, "pending", "2026-07-22"),
    (8, "Google Pixel 8a", 1, 12990000, "delivered", "2026-07-05"),
    (1, "Sạc dự phòng Anker 20000mAh", 1, 990000, "pending", "2026-07-27"),
]

_SEED_PRODUCTS = [
    # Điện thoại
    ("iPhone 16 Pro Max 256GB", "Điện thoại", 34990000, 15, "Apple A18 Pro, 256GB, Titan tự nhiên, Chính hãng VN"),
    ("Samsung Galaxy S25 Ultra", "Điện thoại", 30990000, 12, "Snapdragon 8 Gen 4, 256GB, S Pen, Chính hãng VN"),
    ("Google Pixel 9 Pro", "Điện thoại", 22990000, 8, "Tensor G4, 128GB, Camera 50MP, Chính hãng"),
    ("Xiaomi 14T Pro", "Điện thoại", 15990000, 20, "Dimensity 9300+, 256GB, Leica camera, Chính hãng"),
    ("OPPO Find X8", "Điện thoại", 19990000, 10, "Dimensity 9400, 256GB, Camera Hasselblad"),
    # Laptop/Tablet
    ("MacBook Air M4 13\"", "Laptop", 29990000, 10, "Apple M4, 16GB/256GB, Midnight, Chính hãng VN"),
    ("Laptop Dell XPS 16", "Laptop", 45990000, 5, "Intel Ultra 9, 32GB/1TB, OLED 4K, Nhập khẩu"),
    ("Laptop Lenovo ThinkPad X1 Carbon Gen 12", "Laptop", 42990000, 7, "Intel Ultra 7, 16GB/512GB, Business"),
    ("iPad Pro M4 13\"", "Máy tính bảng", 32990000, 6, "Apple M4, 256GB, Ultra Retina XDR, WiFi+Cellular"),
    ("Samsung Galaxy Tab S10 Ultra", "Máy tính bảng", 27990000, 8, "MediaTek Dimensity 9300+, 256GB, S Pen"),
    # Phụ kiện
    ("AirPods Pro 3", "Phụ kiện", 7990000, 25, "Apple H3 chip, ANC, USB-C, Chính hãng VN"),
    ("Apple Watch Ultra 3", "Phụ kiện", 21990000, 10, "49mm Titan, GPS+Cellular, Chính hãng VN"),
    ("Tai nghe Sony WH-1000XM6", "Phụ kiện", 8990000, 15, "ANC, 40h pin, USB-C, Chính hãng"),
    ("Sạc dự phòng Anker Prime 27650mAh", "Phụ kiện", 2490000, 30, "27650mAh, 250W, PowerIQ 4.0, Chính hãng"),
    ("Loa JBL Flip 7", "Phụ kiện", 3990000, 20, "Bluetooth 5.4, 16h pin, Chống nước IP68"),
]

_SEED_FAQ = [
    ("Làm sao để đổi trả sản phẩm?", "Quý khách có thể đổi trả trong vòng 7 ngày kể từ ngày nhận hàng. Sản phẩm phải còn nguyên hộp, chưa qua sử dụng. Vui lòng gọi 1900 1234 5678 để được hướng dẫn.", "Chính sách"),
    ("Thời gian giao hàng bao lâu?", "Giao hàng nội thành HCM trong 2-4 giờ. Các tỉnh thành khác từ 1-3 ngày làm việc. Miễn phí giao hàng cho đơn trên 5 triệu.", "Vận chuyển"),
    ("Có hỗ trợ trả góp không?", "Có. Quý khách có thể mua trả góp qua thẻ tín dụng VISA, Mastercard, JCB hoặc qua các công ty tài chính như Home Credit, FE Credit. Lãi suất từ 0%.", "Thanh toán"),
    ("Sản phẩm có bảo hành không?", "Tất cả sản phẩm chính hãng đều được bảo hành 12 tháng tại trung tâm bảo hành chính hãng. Một số sản phẩm đặc biệt có thời gian bảo hành dài hơn.", "Bảo hành"),
    ("Làm sao để kiểm tra tình trạng đơn hàng?", "Quý khách có thể gọi 1900 1234 5678 hoặc cung cấp số điện thoại đã đặt hàng, nhân viên sẽ kiểm tra giúp.", "Đơn hàng"),
    ("Có giảm giá cho khách hàng thân thiết không?", "Có. Khách hàng tích luỹ từ 500 điểm loyalty sẽ được giảm 5% cho đơn hàng tiếp theo. Khách VIP (trên 5000 điểm) được giảm 10%.", "Khuyến mãi"),
    ("Tôi muốn thanh toán bằng chuyển khoản được không?", "Được. Quý khách có thể chuyển khoản qua ngân hàng Techcombank, VPBank hoặc Vietcombank. Thông tin tài khoản sẽ được gửi qua SMS.", "Thanh toán"),
    ("Có xuất hoá đơn VAT không?", "Có. Chúng tôi xuất hoá đơn VAT cho tất cả đơn hàng theo yêu cầu của quý khách. Vui lòng cung cấp thông tin công ty khi đặt hàng.", "Hoá đơn"),
    ("Làm sao để liên hệ bảo hành?", "Quý khách mang sản phẩm đến trực tiếp cửa hàng hoặc gửi qua đường bưu điện kèm hoá đơn mua hàng. Hotline bảo hành: 1900 1234 5678 (nhánh 2).", "Bảo hành"),
    ("Tôi quên mật khẩu tài khoản website?", "Quý khách vui lòng gọi hotline 1900 1234 5678, nhân viên sẽ hỗ trợ lấy lại mật khẩu sau khi xác thực thông tin.", "Tài khoản"),
]


# ---------------------------------------------------------------------------
# CRMDB Class
# ---------------------------------------------------------------------------
class CRMDB:
    """Quản lý CSDL nội bộ: customers, orders, products, FAQ.

    Tự động tạo bảng + seed data khi khởi tạo lần đầu.
    Dùng connection mới mỗi truy vấn (SQLite WAL mode cho concurrent safety).
    """

    def __init__(self, db_path: str = _DB_PATH):
        self._db_path = db_path
        _DB_DIR.mkdir(parents=True, exist_ok=True)
        self._init_db()

    def _get_conn(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self._db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn

    def _init_db(self):
        """Tạo bảng và seed data nếu chưa có."""
        with self._get_conn() as conn:
            conn.executescript(_SCHEMA_SQL)
            # Kiểm tra nếu đã có data
            count = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
            if count == 0:
                self._seed(conn)
                logger.info(f"📦 CRM seeded: {len(_SEED_CUSTOMERS)} customers, "
                           f"{len(_SEED_ORDERS)} orders, {len(_SEED_PRODUCTS)} products, "
                           f"{len(_SEED_FAQ)} FAQs")
            else:
                logger.info(f"📦 CRM ready: {count} customers, "
                           f"{conn.execute('SELECT COUNT(*) FROM products').fetchone()[0]} products")

    def _seed(self, conn: sqlite3.Connection):
        """Insert dữ liệu mẫu."""
        conn.executemany(
            "INSERT INTO customers (phone, name, email, address, debt, total_spent, loyalty_points, note) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", _SEED_CUSTOMERS
        )
        conn.executemany(
            "INSERT INTO orders (customer_id, product_name, quantity, amount, status, order_date) "
            "VALUES (?, ?, ?, ?, ?, ?)", _SEED_ORDERS
        )
        conn.executemany(
            "INSERT INTO products (name, category, price, stock, description) "
            "VALUES (?, ?, ?, ?, ?)", _SEED_PRODUCTS
        )
        conn.executemany(
            "INSERT INTO faq (question, answer, category) VALUES (?, ?, ?)", _SEED_FAQ
        )

    # ------------------------------------------------------------------
    # Customer queries
    # ------------------------------------------------------------------
    def get_customer_by_phone(self, phone: str) -> dict | None:
        """Tra cứu khách hàng theo số điện thoại."""
        with self._get_conn() as conn:
            row = conn.execute(
                "SELECT * FROM customers WHERE phone = ?", (phone.strip(),)
            ).fetchone()
            return dict(row) if row else None

    def search_customers(self, query: str, limit: int = 5) -> list[dict]:
        """Tìm khách hàng theo tên hoặc số điện thoại (LIKE)."""
        with self._get_conn() as conn:
            pattern = f"%{query}%"
            rows = conn.execute(
                "SELECT * FROM customers WHERE phone LIKE ? OR name LIKE ? LIMIT ?",
                (pattern, pattern, limit),
            ).fetchall()
            return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Order queries
    # ------------------------------------------------------------------
    def get_orders_by_phone(self, phone: str, limit: int = 10) -> list[dict]:
        """Tra cứu đơn hàng theo số điện thoại khách hàng."""
        with self._get_conn() as conn:
            rows = conn.execute(
                """SELECT o.* FROM orders o
                   JOIN customers c ON o.customer_id = c.id
                   WHERE c.phone = ?
                   ORDER BY o.order_date DESC LIMIT ?""",
                (phone.strip(), limit),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_orders_by_customer_id(self, customer_id: int, limit: int = 10) -> list[dict]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM orders WHERE customer_id = ? ORDER BY order_date DESC LIMIT ?",
                (customer_id, limit),
            ).fetchall()
            return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # Product queries
    # ------------------------------------------------------------------
    def search_products(self, query: str, limit: int = 10) -> list[dict]:
        """Tìm kiếm sản phẩm theo tên hoặc danh mục."""
        with self._get_conn() as conn:
            pattern = f"%{query}%"
            rows = conn.execute(
                "SELECT * FROM products WHERE name LIKE ? OR category LIKE ? OR description LIKE ? LIMIT ?",
                (pattern, pattern, pattern, limit),
            ).fetchall()
            return [dict(r) for r in rows]

    def get_products_by_category(self, category: str) -> list[dict]:
        with self._get_conn() as conn:
            rows = conn.execute(
                "SELECT * FROM products WHERE category = ? ORDER BY price", (category,)
            ).fetchall()
            return [dict(r) for r in rows]

    # ------------------------------------------------------------------
    # FAQ queries
    # ------------------------------------------------------------------
    def search_faq(self, query: str, limit: int = 5) -> list[dict]:
        """Tìm kiếm câu hỏi thường gặp theo từ khoá."""
        with self._get_conn() as conn:
            pattern = f"%{query}%"
            rows = conn.execute(
                "SELECT * FROM faq WHERE question LIKE ? OR answer LIKE ? OR category LIKE ? LIMIT ?",
                (pattern, pattern, pattern, limit),
            ).fetchall()
            return [dict(r) for r in rows]

    def add_faq(self, question: str, answer: str, category: str = "", source: str = "call") -> int:
        """Thêm câu hỏi mới vào FAQ. Trả về ID."""
        with self._get_conn() as conn:
            cur = conn.execute(
                "INSERT INTO faq (question, answer, category, source) VALUES (?, ?, ?, ?)",
                (question.strip(), answer.strip(), category, source),
            )
            conn.commit()
            logger.info(f"📝 FAQ added: '{question[:60]}' (id={cur.lastrowid})")
            return cur.lastrowid

    # ------------------------------------------------------------------
    # Stats
    # ------------------------------------------------------------------
    def stats(self) -> dict:
        with self._get_conn() as conn:
            return {
                "customers": conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0],
                "orders": conn.execute("SELECT COUNT(*) FROM orders").fetchone()[0],
                "products": conn.execute("SELECT COUNT(*) FROM products").fetchone()[0],
                "faq": conn.execute("SELECT COUNT(*) FROM faq").fetchone()[0],
            }


# ---------------------------------------------------------------------------
# Singleton
# ---------------------------------------------------------------------------
_crm_db: CRMDB | None = None


def get_crm_db() -> CRMDB:
    """Get or create singleton CRMDB."""
    global _crm_db
    if _crm_db is None:
        _crm_db = CRMDB()
    return _crm_db

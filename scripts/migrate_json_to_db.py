"""
Chuyển dữ liệu từ todos.json sang database.
Chạy:
    python scripts/migrate_json_to_db.py
Yêu cầu: đã cấu hình DATABASE_URL (hoặc dùng SQLite mặc định) và đã chạy: flask db upgrade
"""

import json
import os
import sys
from datetime import datetime, timezone

# Add parent directory to path so we can import app
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app import app, db, Todo

DATA_FILE = os.path.join(os.path.dirname(__file__), "..", "todos.json")


def iso_or_none(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(value)
    except Exception:
        return None


def main():
    if not os.path.exists(DATA_FILE):
        print("Không tìm thấy todos.json, bỏ qua.")
        return

    with app.app_context():
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            try:
                items = json.load(f)
            except Exception as e:
                print("Lỗi đọc JSON:", e)
                return

        inserted = 0
        for it in items:
            title = (it.get("title") or it.get("text") or "").strip()
            if not title:
                continue
            completed = bool(it.get("completed", False))
            priority = (it.get("priority") or "medium").strip().lower()
            if priority not in {"low", "medium", "high"}:
                priority = "medium"

            created_at = iso_or_none(it.get("created_at")) or datetime.now(timezone.utc)
            updated_at = iso_or_none(it.get("updated_at"))

            exists = (
                db.session.query(Todo.id)
                .filter(Todo.title == title, Todo.created_at == created_at)
                .first()
            )
            if exists:
                continue

            todo = Todo(
                title=title,
                completed=completed,
                priority=priority,
                created_at=created_at,
                updated_at=updated_at,
            )
            db.session.add(todo)
            inserted += 1

        db.session.commit()
        print(f"Đã nhập {inserted} mục từ todos.json.")


if __name__ == "__main__":
    main()
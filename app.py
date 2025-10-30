import os
from datetime import datetime, timezone
from flask import Flask, render_template, request, jsonify, abort
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from sqlalchemy import inspect

app = Flask(__name__)

# Database configuration: default to SQLite, override with DATABASE_URL
app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv("DATABASE_URL", "sqlite:///todos.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
migrate = Migrate(app, db)


class Todo(db.Model):
    __tablename__ = "todos"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(500), nullable=False)
    completed = db.Column(db.Boolean, nullable=False, default=False, index=True)
    priority = db.Column(db.String(10), nullable=False, default="medium", index=True)  # low|medium|high
    created_at = db.Column(db.DateTime(timezone=True), nullable=False, default=lambda: datetime.now(timezone.utc), index=True)
    updated_at = db.Column(db.DateTime(timezone=True), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "text": self.title,  # Use "text" for backward compatibility with frontend
            "title": self.title,  # Also include "title" for new API consumers
            "completed": self.completed,
            "priority": self.priority,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


# Auto-create database tables if they don't exist (for dev convenience)
with app.app_context():
    auto = str(os.getenv("AUTO_CREATE_DB", "1")).lower() not in {"0", "false", "no"}
    if auto:
        insp = inspect(db.engine)
        tables = set(insp.get_table_names())
        if "todos" not in tables:
            db.create_all()


@app.route("/")
def index():
    return render_template("index.html")


@app.get("/api/todos")
def api_list():
    todos = Todo.query.order_by(Todo.created_at.desc(), Todo.id.desc()).all()
    return jsonify([t.to_dict() for t in todos])


@app.post("/api/todos")
def api_create():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or data.get("text") or "").strip()
    priority = (data.get("priority") or "medium").strip().lower()

    if not title:
        return jsonify({"error": "Title is required"}), 400

    if priority not in {"low", "medium", "high"}:
        return jsonify({"error": "Priority must be one of: low, medium, high"}), 400

    todo = Todo(title=title, completed=False, priority=priority)
    db.session.add(todo)
    db.session.commit()
    return jsonify(todo.to_dict()), 201


@app.put("/api/todos/<int:todo_id>")
def api_update(todo_id):
    data = request.get_json(silent=True) or {}
    todo = Todo.query.get(todo_id)
    if not todo:
        abort(404)

    if "title" in data or "text" in data:
        new_title = (data.get("title") or data.get("text") or "").strip()
        if not new_title:
            return jsonify({"error": "Title cannot be empty"}), 400
        todo.title = new_title

    if "completed" in data:
        todo.completed = bool(data["completed"])

    if "priority" in data:
        new_priority = str(data["priority"]).strip().lower()
        if new_priority not in {"low", "medium", "high"}:
            return jsonify({"error": "Priority must be one of: low, medium, high"}), 400
        todo.priority = new_priority

    todo.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify(todo.to_dict())


@app.delete("/api/todos/<int:todo_id>")
def api_delete(todo_id):
    todo = Todo.query.get(todo_id)
    if not todo:
        abort(404)

    db.session.delete(todo)
    db.session.commit()
    return "", 204


@app.post("/api/todos/clear-completed")
def clear_completed():
    deleted = Todo.query.filter_by(completed=True).delete(synchronize_session=False)
    db.session.commit()
    return jsonify({"message": f"Cleared {deleted} completed todos.", "deleted": deleted})


@app.get("/api/todos/stats")
def get_stats():
    total = db.session.query(db.func.count(Todo.id)).scalar() or 0
    completed = db.session.query(db.func.count(Todo.id)).filter(Todo.completed.is_(True)).scalar() or 0
    active = total - completed

    priority_counts = dict.fromkeys(["low", "medium", "high"], 0)
    rows = (
        db.session.query(Todo.priority, db.func.count(Todo.id))
        .group_by(Todo.priority)
        .all()
    )
    for p, c in rows:
        if p in priority_counts:
            priority_counts[p] = c

    return jsonify(
        {
            "total": total,
            "completed": completed,
            "active": active,
            "priority_counts": priority_counts,
        }
    )

if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000) # Chỉ định cổng 5000    app.run(debug=True)

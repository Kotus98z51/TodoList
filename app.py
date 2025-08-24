from flask import Flask, render_template, request, jsonify
import json
import os
from datetime import datetime

app = Flask(__name__)

# Data file path
DATA_FILE = 'todos.json'

def load_todos():
    """Load todos from JSON file"""
    if os.path.exists(DATA_FILE):
        try:
            with open(DATA_FILE, 'r') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError):
            return []
    return []

def save_todos(todos):
    """Save todos to JSON file"""
    with open(DATA_FILE, 'w') as f:
        json.dump(todos, f, indent=2)

def get_next_id(todos):
    """Get the next available ID"""
    if not todos:
        return 1
    return max(todo['id'] for todo in todos) + 1

@app.route('/')
def index():
    """Serve the main page"""
    return render_template('index.html')

@app.route('/api/todos', methods=['GET'])
def get_todos():
    """Get all todos"""
    todos = load_todos()
    return jsonify(todos)

@app.route('/api/todos', methods=['POST'])
def create_todo():
    """Create a new todo"""
    data = request.get_json()
    
    if not data or not data.get('text', '').strip():
        return jsonify({'error': 'Todo text is required'}), 400
    
    todos = load_todos()
    
    new_todo = {
        'id': get_next_id(todos),
        'text': data['text'].strip(),
        'completed': False,
        'priority': data.get('priority', 'medium'),
        'created_at': datetime.now().isoformat()
    }
    
    todos.append(new_todo)
    save_todos(todos)
    
    return jsonify(new_todo), 201

@app.route('/api/todos/<int:todo_id>', methods=['PUT'])
def update_todo(todo_id):
    """Update a todo"""
    data = request.get_json()
    todos = load_todos()
    
    todo = next((t for t in todos if t['id'] == todo_id), None)
    if not todo:
        return jsonify({'error': 'Todo not found'}), 404
    
    # Update fields if provided
    if 'text' in data:
        if not data['text'].strip():
            return jsonify({'error': 'Todo text cannot be empty'}), 400
        todo['text'] = data['text'].strip()
    
    if 'completed' in data:
        todo['completed'] = bool(data['completed'])
    
    if 'priority' in data:
        if data['priority'] in ['low', 'medium', 'high']:
            todo['priority'] = data['priority']
    
    todo['updated_at'] = datetime.now().isoformat()
    
    save_todos(todos)
    return jsonify(todo)

@app.route('/api/todos/<int:todo_id>', methods=['DELETE'])
def delete_todo(todo_id):
    """Delete a todo"""
    todos = load_todos()
    
    todo_index = next((i for i, t in enumerate(todos) if t['id'] == todo_id), None)
    if todo_index is None:
        return jsonify({'error': 'Todo not found'}), 404
    
    deleted_todo = todos.pop(todo_index)
    save_todos(todos)
    
    return jsonify({'message': 'Todo deleted successfully', 'todo': deleted_todo})

@app.route('/api/todos/clear-completed', methods=['POST'])
def clear_completed():
    """Clear all completed todos"""
    todos = load_todos()
    initial_count = len(todos)
    
    todos = [todo for todo in todos if not todo['completed']]
    save_todos(todos)
    
    cleared_count = initial_count - len(todos)
    return jsonify({'message': f'{cleared_count} completed todos cleared'})

@app.route('/api/todos/stats', methods=['GET'])
def get_stats():
    """Get todo statistics"""
    todos = load_todos()
    
    total = len(todos)
    completed = len([t for t in todos if t['completed']])
    active = total - completed
    
    priority_counts = {
        'high': len([t for t in todos if t['priority'] == 'high']),
        'medium': len([t for t in todos if t['priority'] == 'medium']),
        'low': len([t for t in todos if t['priority'] == 'low'])
    }
    
    return jsonify({
        'total': total,
        'completed': completed,
        'active': active,
        'priority_counts': priority_counts
    })

if __name__ == '__main__':
    app.run(debug=True)
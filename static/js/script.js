// Todo List Application JavaScript
class TodoApp {
    constructor() {
        this.todos = [];
        this.currentFilter = 'all';
        this.editingTodoId = null;
        
        this.initializeElements();
        this.bindEvents();
        this.loadTodos();
    }

    initializeElements() {
        // Form elements
        this.addTodoForm = document.getElementById('add-todo-form');
        this.todoInput = document.getElementById('todo-input');
        this.prioritySelect = document.getElementById('priority-select');
        
        // Filter elements
        this.filterButtons = document.querySelectorAll('.filter-btn');
        this.clearCompletedBtn = document.getElementById('clear-completed-btn');
        
        // List elements
        this.todoList = document.getElementById('todo-list');
        this.emptyState = document.getElementById('empty-state');
        this.loadingIndicator = document.getElementById('loading-indicator');
        
        // Stats elements
        this.totalCount = document.getElementById('total-count');
        this.activeCount = document.getElementById('active-count');
        this.completedCount = document.getElementById('completed-count');
        
        // Modal elements
        this.editModal = document.getElementById('edit-modal');
        this.editTodoForm = document.getElementById('edit-todo-form');
        this.editTodoText = document.getElementById('edit-todo-text');
        this.editPrioritySelect = document.getElementById('edit-priority-select');
        this.closeEditModal = document.getElementById('close-edit-modal');
        this.cancelEdit = document.getElementById('cancel-edit');
        
        // Notification container
        this.notificationContainer = document.getElementById('notification-container');
    }

    bindEvents() {
        // Add todo form
        this.addTodoForm.addEventListener('submit', (e) => this.handleAddTodo(e));
        
        // Filter buttons
        this.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilterChange(e));
        });
        
        // Clear completed button
        this.clearCompletedBtn.addEventListener('click', () => this.handleClearCompleted());
        
        // Edit modal events
        this.editTodoForm.addEventListener('submit', (e) => this.handleEditTodo(e));
        this.closeEditModal.addEventListener('click', () => this.closeModal());
        this.cancelEdit.addEventListener('click', () => this.closeModal());
        
        // Close modal on backdrop click
        this.editModal.addEventListener('click', (e) => {
            if (e.target === this.editModal) {
                this.closeModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
        
        // Input validation
        this.todoInput.addEventListener('input', () => this.validateInput(this.todoInput));
        this.editTodoText.addEventListener('input', () => this.validateInput(this.editTodoText));
    }

    handleKeyboardShortcuts(e) {
        // Escape key to close modal
        if (e.key === 'Escape' && !this.editModal.classList.contains('hidden')) {
            this.closeModal();
        }
        
        // Ctrl/Cmd + Enter to focus add todo input
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.todoInput.focus();
        }
    }

    validateInput(input) {
        const value = input.value.trim();
        const isValid = value.length > 0 && value.length <= 200;
        
        input.style.borderColor = isValid ? 'var(--border-color)' : 'var(--error-color)';
        
        return isValid;
    }

    async loadTodos() {
        try {
            this.showLoading(true);
            
            const response = await fetch('/api/todos');
            if (!response.ok) {
                throw new Error('Failed to load todos');
            }
            
            this.todos = await response.json();
            this.renderTodos();
            this.updateStats();
            
        } catch (error) {
            console.error('Error loading todos:', error);
            this.showNotification('error', 'Error', 'Failed to load todos. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }

    async handleAddTodo(e) {
        e.preventDefault();
        
        const text = this.todoInput.value.trim();
        const priority = this.prioritySelect.value;
        
        if (!this.validateInput(this.todoInput)) {
            this.showNotification('error', 'Invalid Input', 'Please enter a valid todo (1-200 characters).');
            return;
        }
        
        try {
            const response = await fetch('/api/todos', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, priority }),
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to add todo');
            }
            
            const newTodo = await response.json();
            this.todos.push(newTodo);
            
            // Reset form
            this.todoInput.value = '';
            this.prioritySelect.value = 'medium';
            this.todoInput.style.borderColor = 'var(--border-color)';
            
            this.renderTodos();
            this.updateStats();
            this.showNotification('success', 'Success', 'Todo added successfully!');
            
        } catch (error) {
            console.error('Error adding todo:', error);
            this.showNotification('error', 'Error', error.message);
        }
    }

    async handleToggleComplete(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;
        
        try {
            const response = await fetch(`/api/todos/${todoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ completed: !todo.completed }),
            });
            
            if (!response.ok) {
                throw new Error('Failed to update todo');
            }
            
            const updatedTodo = await response.json();
            const index = this.todos.findIndex(t => t.id === todoId);
            this.todos[index] = updatedTodo;
            
            this.renderTodos();
            this.updateStats();
            
            const action = updatedTodo.completed ? 'completed' : 'activated';
            this.showNotification('success', 'Updated', `Todo ${action}!`);
            
        } catch (error) {
            console.error('Error updating todo:', error);
            this.showNotification('error', 'Error', 'Failed to update todo. Please try again.');
        }
    }

    openEditModal(todoId) {
        const todo = this.todos.find(t => t.id === todoId);
        if (!todo) return;
        
        this.editingTodoId = todoId;
        this.editTodoText.value = todo.text;
        this.editPrioritySelect.value = todo.priority;
        this.editModal.classList.remove('hidden');
        this.editTodoText.focus();
    }

    closeModal() {
        this.editModal.classList.add('hidden');
        this.editingTodoId = null;
        this.editTodoText.style.borderColor = 'var(--border-color)';
    }

    async handleEditTodo(e) {
        e.preventDefault();
        
        if (!this.editingTodoId) return;
        
        const text = this.editTodoText.value.trim();
        const priority = this.editPrioritySelect.value;
        
        if (!this.validateInput(this.editTodoText)) {
            this.showNotification('error', 'Invalid Input', 'Please enter a valid todo (1-200 characters).');
            return;
        }
        
        try {
            const response = await fetch(`/api/todos/${this.editingTodoId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ text, priority }),
            });
            
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to update todo');
            }
            
            const updatedTodo = await response.json();
            const index = this.todos.findIndex(t => t.id === this.editingTodoId);
            this.todos[index] = updatedTodo;
            
            this.closeModal();
            this.renderTodos();
            this.updateStats();
            this.showNotification('success', 'Success', 'Todo updated successfully!');
            
        } catch (error) {
            console.error('Error updating todo:', error);
            this.showNotification('error', 'Error', error.message);
        }
    }

    async handleDeleteTodo(todoId) {
        if (!confirm('Are you sure you want to delete this todo?')) {
            return;
        }
        
        try {
            const response = await fetch(`/api/todos/${todoId}`, {
                method: 'DELETE',
            });
            
            if (!response.ok) {
                throw new Error('Failed to delete todo');
            }
            
            this.todos = this.todos.filter(t => t.id !== todoId);
            
            this.renderTodos();
            this.updateStats();
            this.showNotification('success', 'Deleted', 'Todo deleted successfully!');
            
        } catch (error) {
            console.error('Error deleting todo:', error);
            this.showNotification('error', 'Error', 'Failed to delete todo. Please try again.');
        }
    }

    handleFilterChange(e) {
        const filter = e.target.dataset.filter;
        
        // Update active filter button
        this.filterButtons.forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        
        this.currentFilter = filter;
        this.renderTodos();
    }

    async handleClearCompleted() {
        const completedCount = this.todos.filter(t => t.completed).length;
        
        if (completedCount === 0) {
            this.showNotification('warning', 'No Completed Todos', 'There are no completed todos to clear.');
            return;
        }
        
        if (!confirm(`Are you sure you want to clear ${completedCount} completed todo${completedCount > 1 ? 's' : ''}?`)) {
            return;
        }
        
        try {
            const response = await fetch('/api/todos/clear-completed', {
                method: 'POST',
            });
            
            if (!response.ok) {
                throw new Error('Failed to clear completed todos');
            }
            
            const result = await response.json();
            this.todos = this.todos.filter(t => !t.completed);
            
            this.renderTodos();
            this.updateStats();
            this.showNotification('success', 'Cleared', result.message);
            
        } catch (error) {
            console.error('Error clearing completed todos:', error);
            this.showNotification('error', 'Error', 'Failed to clear completed todos. Please try again.');
        }
    }

    getFilteredTodos() {
        switch (this.currentFilter) {
            case 'active':
                return this.todos.filter(t => !t.completed);
            case 'completed':
                return this.todos.filter(t => t.completed);
            default:
                return this.todos;
        }
    }

    renderTodos() {
        const filteredTodos = this.getFilteredTodos();
        
        if (filteredTodos.length === 0) {
            this.todoList.innerHTML = '';
            this.emptyState.classList.remove('hidden');
            return;
        }
        
        this.emptyState.classList.add('hidden');
        
        this.todoList.innerHTML = filteredTodos.map(todo => `
            <li class="todo-item ${todo.completed ? 'completed' : ''}" data-todo-id="${todo.id}">
                <div class="todo-content">
                    <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" 
                         onclick="app.handleToggleComplete(${todo.id})">
                    </div>
                    
                    <div class="todo-main">
                        <div class="todo-text">${this.escapeHtml(todo.text)}</div>
                        <div class="todo-meta">
                            <span class="priority-badge ${todo.priority}">${todo.priority}</span>
                            <span class="todo-date">
                                Created: ${this.formatDate(todo.created_at)}
                            </span>
                        </div>
                    </div>
                    
                    <div class="todo-actions">
                        <button class="todo-action-btn edit" 
                                onclick="app.openEditModal(${todo.id})"
                                title="Edit todo">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="todo-action-btn delete" 
                                onclick="app.handleDeleteTodo(${todo.id})"
                                title="Delete todo">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </li>
        `).join('');
    }

    updateStats() {
        const total = this.todos.length;
        const completed = this.todos.filter(t => t.completed).length;
        const active = total - completed;
        
        this.totalCount.textContent = total;
        this.activeCount.textContent = active;
        this.completedCount.textContent = completed;
        
        // Update clear completed button visibility
        this.clearCompletedBtn.style.display = completed > 0 ? 'flex' : 'none';
    }

    showLoading(show) {
        if (show) {
            this.loadingIndicator.classList.remove('hidden');
            this.todoList.classList.add('hidden');
            this.emptyState.classList.add('hidden');
        } else {
            this.loadingIndicator.classList.add('hidden');
            this.todoList.classList.remove('hidden');
        }
    }

    showNotification(type, title, message) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-icon">
                <i class="${iconMap[type]}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${this.escapeHtml(title)}</div>
                <div class="notification-message">${this.escapeHtml(message)}</div>
            </div>
        `;
        
        this.notificationContainer.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.add('fade-out');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.remove();
                    }
                }, 300);
            }
        }, 5000);
        
        // Click to dismiss
        notification.addEventListener('click', () => {
            notification.classList.add('fade-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new TodoApp();
});
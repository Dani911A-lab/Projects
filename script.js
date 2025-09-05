const STORAGE_KEY = "tasky_data_v6";

let state = {
  lists: [],
  currentListId: null,
  archived: [],
  viewingArchived: false
};

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      state = JSON.parse(raw);
      if (!state.lists) state.lists = [];
      if (!state.archived) state.archived = [];
    } catch (e) {
      console.error("Error cargando state:", e);
    }
  } else {
    const defaultList = { id: genId('l'), name: "Mis tareas", tasks: [], emoji: "📌" };
    state.lists = [defaultList];
    state.currentListId = defaultList.id;
    state.archived = [];
    saveState();
  }
}

function genId(prefix = 'id') {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function findList(id) {
  return state.lists.find(l => l.id === id);
}

const emojiCategories = {
  "Oficina": ["👨‍💼","👩‍💼","🧑‍💼","👥","🔒","⭐","🚨","🏢","💼","📁","📂","🗂️","📊","📈","📉","📝","✒️","🧾","📚","📌","📎"],
  "Agrícola": ["🌱","🌿","🌾","🌻","🍌","🍎","🍐","🍇","🍒","🥦","🌽","🌳","🌴","🐄","🐖","🐓","🐑","💧","🛠️","🏚️"],
  "Finanzas": ["🏚️","💰","💵","💳","💸","🪙","📦","⚖️","🧮"],
  "Logística": ["🚛","🚜","✈️","⛽","🛢️","💡"]
};

let activePicker = null;

function showEmojiPicker(btn, list) {
  if (activePicker) activePicker.remove();

  const picker = document.createElement("div");
  picker.className = "emoji-picker";

  for (const [category, emojis] of Object.entries(emojiCategories)) {
    const title = document.createElement("div");
    title.textContent = category;
    title.className = "category-title";
    picker.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "emoji-grid";

    emojis.forEach(emoji => {
      const span = document.createElement("span");
      span.textContent = emoji;
      span.addEventListener("click", (e) => {
        e.stopPropagation();
        list.emoji = emoji;
        saveState();
        render();
        picker.remove();
        activePicker = null;
      });
      grid.appendChild(span);
    });

    picker.appendChild(grid);
  }

  document.body.appendChild(picker);
  activePicker = picker;

  const rect = btn.getBoundingClientRect();
  picker.style.top = rect.bottom + window.scrollY + "px";
  picker.style.left = rect.left + window.scrollX + "px";

  setTimeout(() => {
    window.addEventListener("click", closePickerOnClickOutside);
  }, 0);

  function closePickerOnClickOutside(e) {
    if (!picker.contains(e.target) && e.target !== btn) {
      picker.remove();
      activePicker = null;
      window.removeEventListener("click", closePickerOnClickOutside);
    }
  }
}

/* ---------- Render ---------- */
const listContainer = document.getElementById('list-container');
const currentListTitle = document.getElementById('current-list-title');
const tasksEl = document.getElementById('tasks');
const emptyStateEl = document.getElementById('empty-state');
const taskInput = document.getElementById('task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const addListBtn = document.getElementById('add-list-btn');
const clearCompletedBtn = document.getElementById('clear-completed');

const listTpl = document.getElementById('list-item-tpl');
const taskTpl = document.getElementById('task-item-tpl');

function renderLists() {
  listContainer.innerHTML = '';

  state.lists.forEach(list => {
    const node = listTpl.content.firstElementChild.cloneNode(true);
    const renameBtn = node.querySelector('.rename-list');
    const deleteBtn = node.querySelector('.delete-list');
    const emojiBtn = node.querySelector('.list-select');
    const nameSpan = node.querySelector('.list-name');

    emojiBtn.textContent = list.emoji || '📌';

    emojiBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      showEmojiPicker(emojiBtn, list);
    });

    nameSpan.textContent = list.name;
    if (!state.viewingArchived && list.id === state.currentListId) node.classList.add('active');

    node.addEventListener('click', (e) => {
      if (e.target === renameBtn || e.target === deleteBtn || e.target === emojiBtn) return;
      state.currentListId = list.id;
      state.viewingArchived = false;
      saveState();
      render();
    });

    renameBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const nuevo = prompt('Nuevo nombre de la lista:', list.name);
      if (nuevo !== null) {
        list.name = nuevo.trim() || list.name;
        saveState();
        render();
      }
    });

    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!confirm(`Eliminar la lista "${list.name}" y sus ${list.tasks.length} tareas?`)) return;
      state.lists = state.lists.filter(l => l.id !== list.id);
      if (state.currentListId === list.id) state.currentListId = state.lists.length ? state.lists[0].id : null;
      saveState();
      render();
    });

    listContainer.appendChild(node);
  });

  const archivedBtn = document.createElement('button');
  archivedBtn.className = 'archived-btn';
  archivedBtn.innerHTML = `<i class="fa-regular fa-folder"></i> Tareas Archivadas <span class="archived-count">${state.archived.length}</span>`;
  archivedBtn.addEventListener('click', () => {
    state.viewingArchived = true;
    render();
  });
  listContainer.appendChild(archivedBtn);
}

function renderTasks() {
  tasksEl.innerHTML = '';

  let tasksToRender = [];
  let title = 'Selecciona una lista';
  const isArchived = state.viewingArchived;

  if (isArchived) {
    tasksToRender = state.archived;
    title = 'Tareas Archivadas';
  } else {
    const list = findList(state.currentListId);
    if (!list) {
      currentListTitle.textContent = title;
      return;
    }
    tasksToRender = list.tasks;
    title = list.name;
  }

  currentListTitle.textContent = title;

  if (tasksToRender.length === 0) {
    emptyStateEl.style.display = 'block';
    if (!isArchived) {
      emptyStateEl.innerHTML = `
        <img src="newproject.png" alt="Nueva lista" style="width:120px; display:block; margin:0 auto;">
        <span class="empty-message">Empecemos un nuevo proyecto ✨</span>
      `;
    } else {
      emptyStateEl.innerHTML = '';
    }
  } else {
    emptyStateEl.style.display = 'none';
  }

  tasksToRender.forEach(task => {
    const node = buildTaskNode(task, findList(task.listId) || {tasks: []}, false);
    tasksEl.appendChild(node);
  });

  // ✅ Activar drag & drop suave aquí
  if (!isArchived) {
    enableDragAndDrop();
  }
}

function buildTaskNode(task, list, isSubtask) {
  const node = taskTpl.content.firstElementChild.cloneNode(true);
  const checkbox = node.querySelector('.task-checkbox');
  const content = node.querySelector('.task-content');
  const editBtn = node.querySelector('.edit-task');
  const deleteBtn = node.querySelector('.delete-task');

  const subBtn = document.createElement("button");
  subBtn.textContent = "➕";
  subBtn.title = "Agregar sub-tarea";
  subBtn.classList.add("subtask-btn");
  node.querySelector(".task-actions").prepend(subBtn);

  content.textContent = task.text;
  node.dataset.taskId = task.id;

  if (task.done) {
    checkbox.checked = true;
    content.classList.add('completed');
    node.classList.add("completed");
  }

  checkbox.addEventListener('change', () => {
    task.done = checkbox.checked;

    if (!isSubtask) {
      const listRef = findList(task.listId) || list;

      if (task.done && !state.archived.some(t => t.id === task.id)) {
        state.archived.unshift({ ...task, listId: listRef.id });
        listRef.tasks = listRef.tasks.filter(t => t.id !== task.id);
      } else if (!task.done) {
        const archivedIndex = state.archived.findIndex(t => t.id === task.id);
        if (archivedIndex > -1) {
          const originalList = findList(state.archived[archivedIndex].listId);
          if (originalList) originalList.tasks.unshift(state.archived[archivedIndex]);
          state.archived.splice(archivedIndex, 1);
        }
      }
    }

    saveState();
    render();
  });

  deleteBtn.addEventListener('click', () => {
    if (!confirm('Eliminar tarea?')) return;
    if (isSubtask) {
      const parent = findParentTask(list, task.id);
      if (parent) parent.subtasks = parent.subtasks.filter(t => t.id !== task.id);
    } else {
      const listRef = findList(task.listId) || list;
      listRef.tasks = listRef.tasks.filter(t => t.id !== task.id);
      const archivedIndex = state.archived.findIndex(t => t.id === task.id);
      if (archivedIndex > -1) state.archived.splice(archivedIndex, 1);
    }
    saveState();
    render();
  });

  editBtn.addEventListener('click', () => {
    content.contentEditable = "true";
    content.focus();
  });
  content.addEventListener('blur', () => {
    finishEdit(content, task, list, isSubtask);
  });
  content.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      content.blur();
    }
  });

  subBtn.addEventListener('click', () => {
    if (!task.subtasks) task.subtasks = [];
    const text = prompt("Nueva sub-tarea:");
    if (text) {
      task.subtasks.push({ id: genId('st'), text: text.trim(), done: false, subtasks: [] });
      saveState();
      render();
    }
  });

  if (task.subtasks && task.subtasks.length) {
    const ul = document.createElement("ul");
    ul.classList.add("subtasks");
    task.subtasks.forEach(st => {
      const stNode = buildTaskNode(st, list, true);
      stNode.classList.add("subtask-item");
      ul.appendChild(stNode);
    });
    node.appendChild(ul);
  }

  return node;
}

function findParentTask(list, subtaskId) {
  function recurse(tasks) {
    for (const t of tasks) {
      if (t.subtasks?.some(st => st.id === subtaskId)) return t;
      const deeper = recurse(t.subtasks || []);
      if (deeper) return deeper;
    }
    return null;
  }
  return recurse(list.tasks);
}

function finishEdit(contentEl, task, list, isSubtask) {
  contentEl.contentEditable = "false";
  const nuevo = contentEl.textContent.trim();
  if (!nuevo) {
    if (isSubtask) {
      const parent = findParentTask(list, task.id);
      if (parent) parent.subtasks = parent.subtasks.filter(t => t.id !== task.id);
    } else {
      const listRef = findList(task.listId) || list;
      listRef.tasks = listRef.tasks.filter(t => t.id !== task.id);
      const archivedIndex = state.archived.findIndex(t => t.id === task.id);
      if (archivedIndex > -1) state.archived.splice(archivedIndex,1);
    }
  } else {
    task.text = nuevo;
  }
  saveState();
  renderTasks();
}

function render() {
  renderLists();
  renderTasks();
}

/* ---------- Acciones UI ---------- */
addListBtn.addEventListener('click', () => {
  const name = prompt('Nombre de la nueva lista:', 'Nueva lista');
  if (name === null) return;
  const list = { id: genId('l'), name: name.trim() || 'Lista', tasks: [], emoji: "📌" };
  state.lists.push(list);
  state.currentListId = list.id;
  state.viewingArchived = false;
  saveState();
  render();
});

addTaskBtn.addEventListener('click', addTaskFromInput);
taskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addTaskFromInput();
});

function addTaskFromInput() {
  const text = taskInput.value.trim();
  if (!text) return;
  const list = findList(state.currentListId);
  if (!list) {
    alert('Seleccione o cree una lista primero.');
    return;
  }
  const task = { id: genId('t'), text, done: false, subtasks: [], listId: list.id };
  list.tasks.unshift(task);
  taskInput.value = '';
  saveState();
  render();
}

clearCompletedBtn.addEventListener('click', () => {
  const list = findList(state.currentListId);
  if (!list) return;
  list.tasks = list.tasks.filter(t => !t.done);
  saveState();
  render();
});

/* ---------- Drag & Drop con SortableJS ---------- */
function enableDragAndDrop() {
  new Sortable(tasksEl, {
    animation: 150,
    ghostClass: 'dragging',
    onEnd: function (evt) {
      const list = findList(state.currentListId);
      if (!list) return;

      const [movedTask] = list.tasks.splice(evt.oldIndex, 1);
      list.tasks.splice(evt.newIndex, 0, movedTask);

      saveState();
    }
  });
}

/* ---------- Inicializar ---------- */
loadState();
render();

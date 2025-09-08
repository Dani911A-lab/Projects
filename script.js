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
  "Agrícola": ["🌱","🌿","🌾","🌻","🍌","🌽","🐄","🐖","🐓","🐑","💧","🛠️","🏚️"],
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

  // 🔹 Agregar siempre al body para evitar clipping
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

/* ---------- Botón Tareas Archivadas ---------- */
function renderArchivedButton() {
  const sidebarFooter = document.querySelector('.sidebar-footer');
  if (!sidebarFooter) return;

  // Seleccionamos el botón existente o lo creamos si no existe
  let archivedBtn = sidebarFooter.querySelector('.archived-btn');
  if (!archivedBtn) {
    archivedBtn = document.createElement('button');
    archivedBtn.className = 'archived-btn';
    archivedBtn.type = 'button';
    sidebarFooter.appendChild(archivedBtn);
  }

  // ✅ Agregar click listener (solo una vez)
  archivedBtn.onclick = () => {
    state.viewingArchived = true;
    render();
  };

 archivedBtn.innerHTML = `
  <i class="fa fa-archive"></i> 
  Tareas Archivadas 
  <span class="archived-count">${state.archived.length}</span>
`;
}

/* ---------- Renderizar listas ---------- */
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
      state.viewingArchived = false; // volver a lista normal
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

  // Renderiza botón de archivadas siempre al final
  renderArchivedButton();
}

/* ---------- Renderizar tareas ---------- */
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
        <img src="newproject.png" alt="Nueva lista" style="width:300px; display:block; margin:0 auto;">
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

  const calendarBtn = document.createElement("button");
  calendarBtn.innerHTML = "📅";
  calendarBtn.title = "Asignar fecha";
  calendarBtn.classList.add("calendar-btn");

  // Insertamos botones en orden: +, editar, calendario, eliminar
  const actions = node.querySelector(".task-actions");
  actions.innerHTML = ""; // Limpiamos por seguridad
  actions.appendChild(subBtn);
  actions.appendChild(editBtn);
  actions.appendChild(calendarBtn);
  actions.appendChild(deleteBtn);

  content.textContent = task.text;
  node.dataset.taskId = task.id;

  // Badge de fecha
  function updateDateBadge() {
  let badge = node.querySelector(".task-date-badge");
  if (!task.dueDate) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "task-date-badge";
    badge.style.fontSize = "11px";
    badge.style.padding = "2px 6px";
    badge.style.marginLeft = "8px";
    badge.style.borderRadius = "6px";
    badge.style.fontWeight = "bold";
    badge.style.boxShadow = "inset 0 0 4px rgba(0,0,0,0.1)";
    badge.style.backdropFilter = "blur(2px)";
    actions.insertBefore(badge, deleteBtn); // lo ponemos antes del botón eliminar
  }

  badge.textContent = task.dueDate;

  const today = new Date();
  const due = new Date(task.dueDate);
  const diffDays = Math.ceil((due - today) / (1000 * 60 * 60 * 24));

  if (diffDays > 5) {
    badge.style.backgroundColor = "#4CAF50"; // verde
    badge.style.color = "#fff";
  } else if (diffDays >= 3) {
    badge.style.backgroundColor = "#FFC107"; // amarillo pastel
    badge.style.color = "#222";              // texto oscuro
  } else if (diffDays >= 1) {
    badge.style.backgroundColor = "#ef5800ff"; // naranja
    badge.style.color = "#fff";
  } else {
    badge.style.backgroundColor = "#F44336"; // rojo
    badge.style.color = "#fff";
  }
}

if (task.dueDate) updateDateBadge();

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

  calendarBtn.addEventListener("click", () => {
    const currentDate = task.dueDate || "";
    const dateInput = document.createElement("input");
    dateInput.type = "date";
    dateInput.value = currentDate;
    dateInput.style.marginLeft = "6px";

    actions.insertBefore(dateInput, deleteBtn);
    dateInput.focus();

    dateInput.addEventListener("change", () => {
      task.dueDate = dateInput.value;
      saveState();
      updateDateBadge();
      dateInput.remove();
    });

    dateInput.addEventListener("blur", () => dateInput.remove());
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

/* ---------- Context Menu Personalizado ---------- */
let customMenu = null;
document.addEventListener("contextmenu", (e) => {
  e.preventDefault(); // 🔹 Bloquear menú nativo

  const taskItem = e.target.closest(".task-item");
  if (!taskItem) {
    if (customMenu) customMenu.remove();
    return;
  }

  if (customMenu) customMenu.remove();

  customMenu = document.createElement("div");
  customMenu.className = "custom-context-menu";
  customMenu.innerHTML = `<div class="menu-item">⿻ Duplicar tarea.</div>`;

  document.body.appendChild(customMenu);

  customMenu.style.top = e.pageY + "px";
  customMenu.style.left = e.pageX + "px";

  // Acción duplicar
  customMenu.querySelector(".menu-item").addEventListener("click", () => {
    const taskId = taskItem.dataset.taskId;
    duplicateTask(taskId);
    customMenu.remove();
    customMenu = null;
  });
});

// Ocultar menú al hacer click fuera
document.addEventListener("click", () => {
  if (customMenu) {
    customMenu.remove();
    customMenu = null;
  }
});

/* ---------- Función duplicar ---------- */
function duplicateTask(taskId) {
  const list = findList(state.currentListId);
  if (!list) return;

  const original = list.tasks.find(t => t.id === taskId);
  if (!original) return;

  function deepCloneTask(task) {
    return {
      id: genId("t"),
      text: task.text,
      done: false, // las copias siempre arrancan sin completar
      listId: task.listId,
      subtasks: (task.subtasks || []).map(st => deepCloneTask(st))
    };
  }

  const copy = deepCloneTask(original);
  list.tasks.unshift(copy);
  saveState();
  render();
}


/* ---------- Inicializar ---------- */
loadState();
render();

// --- Initial Default State / LocalStorage Loading ---
const STORAGE_KEY = 'smart_pantry_items_v1';

// Default initial mock items (Agar user pehli baar visit kare)
const defaultItems = [
  {
    id: '1',
    name: 'Full Cream Milk',
    category: 'Dairy',
    location: 'Refrigerator',
    quantity: 1,
    unit: 'L',
    expiryDate: getOffsetDateString(1) // 1 din baad expire hoga (Warning)
  },
  {
    id: '2',
    name: 'Fresh Spinach (Palak)',
    category: 'Vegetables',
    location: 'Refrigerator',
    quantity: 500,
    unit: 'g',
    expiryDate: getOffsetDateString(0) // Aaj expire hoga (Warning)
  },
  {
    id: '3',
    name: 'Basmati Rice',
    category: 'Grains',
    location: 'Main Pantry',
    quantity: 5,
    unit: 'kg',
    expiryDate: getOffsetDateString(60) // Safe
  },
  {
    id: '4',
    name: 'Greek Yogurt',
    category: 'Dairy',
    location: 'Refrigerator',
    quantity: 2,
    unit: 'pcs',
    expiryDate: getOffsetDateString(-2) // Already expired
  }
];

let pantryList = JSON.parse(localStorage.getItem(STORAGE_KEY)) || defaultItems;

// DOM Elements
const pantryGrid = document.getElementById('pantry-grid');
const emptyState = document.getElementById('empty-state');
const visibleCount = document.getElementById('visible-count');
const modalOverlay = document.getElementById('item-modal');
const itemForm = document.getElementById('item-form');
const modalTitle = document.getElementById('modal-title');

// Inputs & Filters
const searchInput = document.getElementById('search-input');
const filterCategory = document.getElementById('filter-category');
const filterStatus = document.getElementById('filter-status');
const sortBy = document.getElementById('sort-by');

// Stats DOM
const statTotal = document.getElementById('stat-total');
const statFresh = document.getElementById('stat-fresh');
const statExpiring = document.getElementById('stat-expiring');
const statExpired = document.getElementById('stat-expired');
const expiryBanner = document.getElementById('expiry-banner');
const expiryBannerText = document.getElementById('expiry-banner-text');

// Form Inputs
const inputId = document.getElementById('item-id');
const inputName = document.getElementById('item-name');
const inputCategory = document.getElementById('item-category');
const inputLocation = document.getElementById('item-location');
const inputQty = document.getElementById('item-qty');
const inputUnit = document.getElementById('item-unit');
const inputExpiry = document.getElementById('item-expiry');

// --- Helper Functions ---
function getOffsetDateString(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
}

function saveToLocalStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(pantryList));
}

// Calculate remaining days & status
function calculateExpiry(expiryDateStr) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expDate = new Date(expiryDateStr);
  expDate.setHours(0, 0, 0, 0);

  const diffTime = expDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'expired',
      label: `Expired ${Math.abs(diffDays)} day(s) ago`,
      badgeClass: 'badge-expired',
      days: diffDays
    };
  } else if (diffDays === 0) {
    return {
      status: 'warning',
      label: 'Expires Today!',
      badgeClass: 'badge-warning',
      days: diffDays
    };
  } else if (diffDays <= 3) {
    return {
      status: 'warning',
      label: `Expiring in ${diffDays} day(s)`,
      badgeClass: 'badge-warning',
      days: diffDays
    };
  } else {
    return {
      status: 'fresh',
      label: `${diffDays} days left`,
      badgeClass: 'badge-fresh',
      days: diffDays
    };
  }
}

// --- Render Pantry Grid & Update Dashboard ---
function renderPantry() {
  const query = searchInput.value.toLowerCase().trim();
  const catFilter = filterCategory.value;
  const statusFilter = filterStatus.value;
  const sortMode = sortBy.value;

  // Global counts for metrics
  let totalCount = pantryList.length;
  let freshCount = 0;
  let warningCount = 0;
  let expiredCount = 0;

  pantryList.forEach(item => {
    const { status } = calculateExpiry(item.expiryDate);
    if (status === 'fresh') freshCount++;
    if (status === 'warning') warningCount++;
    if (status === 'expired') expiredCount++;
  });

  // Update Top Stats
  statTotal.textContent = totalCount;
  statFresh.textContent = freshCount;
  statExpiring.textContent = warningCount;
  statExpired.textContent = expiredCount;

  // Banner Logic
  if (expiredCount > 0) {
    expiryBanner.className = 'alert-banner danger';
    expiryBannerText.textContent = `Warning: You have ${expiredCount} expired item(s) in your pantry!`;
    expiryBanner.classList.remove('hidden');
  } else if (warningCount > 0) {
    expiryBanner.className = 'alert-banner';
    expiryBannerText.textContent = `Notice: ${warningCount} item(s) are expiring in the next 3 days!`;
    expiryBanner.classList.remove('hidden');
  } else {
    expiryBanner.classList.add('hidden');
  }

  // Filter items
  let filtered = pantryList.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(query);
    const matchesCat = catFilter === 'All' || item.category === catFilter;
    const { status } = calculateExpiry(item.expiryDate);
    const matchesStatus = statusFilter === 'All' || status === statusFilter;

    return matchesSearch && matchesCat && matchesStatus;
  });

  // Sort items
  filtered.sort((a, b) => {
    if (sortMode === 'expiry-asc') return new Date(a.expiryDate) - new Date(b.expiryDate);
    if (sortMode === 'expiry-desc') return new Date(b.expiryDate) - new Date(a.expiryDate);
    if (sortMode === 'name-asc') return a.name.localeCompare(b.name);
    if (sortMode === 'qty-asc') return a.quantity - b.quantity;
  });

  visibleCount.textContent = filtered.length;
  pantryGrid.innerHTML = '';

  if (filtered.length === 0) {
    emptyState.classList.remove('hidden');
    return;
  }
  emptyState.classList.add('hidden');

  filtered.forEach(item => {
    const expiryInfo = calculateExpiry(item.expiryDate);
    const card = document.createElement('div');
    card.className = 'pantry-card';

    card.innerHTML = `
      <div>
        <div class="card-top">
          <span class="badge ${expiryInfo.badgeClass}">
            <i class="fa-solid ${expiryInfo.status === 'expired' ? 'fa-ban' : 'fa-clock'}"></i>
            ${expiryInfo.label}
          </span>
          <span class="card-meta"><i class="fa-solid fa-location-dot"></i> ${item.location}</span>
        </div>

        <h3 class="card-title">${item.name}</h3>
        <p class="card-meta"><i class="fa-solid fa-tag"></i> ${item.category}</p>

        <div class="card-details">
          <div class="detail-row">
            <span class="detail-label">Quantity:</span>
            <strong>${item.quantity} ${item.unit}</strong>
          </div>
          <div class="detail-row">
            <span class="detail-label">Expiry Date:</span>
            <span>${item.expiryDate}</span>
          </div>
        </div>
      </div>

      <div class="card-actions">
        <button class="btn btn-edit" onclick="editItem('${item.id}')">
          <i class="fa-solid fa-pen"></i> Edit
        </button>
        <button class="btn btn-danger-outline" onclick="deleteItem('${item.id}')">
          <i class="fa-solid fa-trash"></i> Delete
        </button>
      </div>
    `;

    pantryGrid.appendChild(card);
  });
}

// --- CRUD Actions ---

// Open Modal for Add
window.openModal = function() {
  itemForm.reset();
  inputId.value = '';
  modalTitle.textContent = 'Add New Pantry Item';
  inputExpiry.value = getOffsetDateString(7); // default 7 din aage
  modalOverlay.classList.remove('hidden');
};

// Close Modal
window.closeModal = function() {
  modalOverlay.classList.add('hidden');
};

// Form Submit (Add or Edit)
itemForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const id = inputId.value;
  const name = inputName.value.trim();
  const category = inputCategory.value;
  const location = inputLocation.value;
  const quantity = parseFloat(inputQty.value);
  const unit = inputUnit.value;
  const expiryDate = inputExpiry.value;

  if (id) {
    // Edit existing
    pantryList = pantryList.map(item => 
      item.id === id ? { id, name, category, location, quantity, unit, expiryDate } : item
    );
  } else {
    // Add new
    const newItem = {
      id: Date.now().toString(),
      name,
      category,
      location,
      quantity,
      unit,
      expiryDate
    };
    pantryList.unshift(newItem);
  }

  saveToLocalStorage();
  renderPantry();
  closeModal();
});

// Edit Item
window.editItem = function(id) {
  const item = pantryList.find(i => i.id === id);
  if (!item) return;

  inputId.value = item.id;
  inputName.value = item.name;
  inputCategory.value = item.category;
  inputLocation.value = item.location;
  inputQty.value = item.quantity;
  inputUnit.value = item.unit;
  inputExpiry.value = item.expiryDate;

  modalTitle.textContent = 'Edit Item';
  modalOverlay.classList.remove('hidden');
};

// Delete Item
window.deleteItem = function(id) {
  if (confirm('Kya aap sure hain is item ko delete karna chahte hain?')) {
    pantryList = pantryList.filter(item => item.id !== id);
    saveToLocalStorage();
    renderPantry();
  }
};

// Event Listeners for Filters
searchInput.addEventListener('input', renderPantry);
filterCategory.addEventListener('change', renderPantry);
filterStatus.addEventListener('change', renderPantry);
sortBy.addEventListener('change', renderPantry);

// Initial Load
renderPantry();
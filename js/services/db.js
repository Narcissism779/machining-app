// === 数据库服务层（IndexedDB 本地存储） ===

function openDB() {
  return new Promise(function(resolve, reject) {
    var req = indexedDB.open('MachiningDB', 1);
    req.onupgradeneeded = function(e) {
      var db = e.target.result;
      if (!db.objectStoreNames.contains('processingTypes')) {
        db.createObjectStore('processingTypes', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('orders')) {
        db.createObjectStore('orders', { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains('dailyPlans')) {
        db.createObjectStore('dailyPlans', { keyPath: 'date' });
      }
      if (!db.objectStoreNames.contains('checkins')) {
        var store = db.createObjectStore('checkins', { keyPath: 'id', autoIncrement: true });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    req.onsuccess = function(e) { resolve(e.target.result); };
    req.onerror = function(e) { reject(e.target.error); };
  });
}

function getAllFromStore(storeName) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var store = tx.objectStore(storeName);
      var req = store.getAll();
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function getFromStore(storeName, key) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var store = tx.objectStore(storeName);
      var req = store.get(key);
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function addToStore(storeName, data) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var store = tx.objectStore(storeName);
      var req = store.add(data);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function putInStore(storeName, data) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var store = tx.objectStore(storeName);
      var req = store.put(data);
      req.onsuccess = function() { resolve(req.result); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function deleteFromStore(storeName, key) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readwrite');
      var store = tx.objectStore(storeName);
      var req = store.delete(key);
      req.onsuccess = function() { resolve(); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function getByIndex(storeName, indexName, value) {
  return openDB().then(function(db) {
    return new Promise(function(resolve, reject) {
      var tx = db.transaction(storeName, 'readonly');
      var store = tx.objectStore(storeName);
      var index = store.index(indexName);
      var req = index.getAll(value);
      req.onsuccess = function() { resolve(req.result || []); };
      req.onerror = function() { reject(req.error); };
    });
  });
}

function getTodayStr() {
  var d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}

function nowStr() {
  return new Date().toISOString();
}

var PRESET_TYPES = [
  { name: '车削', sortOrder: 1, isPreset: true },
  { name: '铣削', sortOrder: 2, isPreset: true },
  { name: '磨削', sortOrder: 3, isPreset: true },
  { name: '钻孔', sortOrder: 4, isPreset: true },
  { name: '线切割', sortOrder: 5, isPreset: true },
  { name: '刨削', sortOrder: 6, isPreset: true },
  { name: '镗削', sortOrder: 7, isPreset: true },
  { name: '其他', sortOrder: 99, isPreset: true }
];

var ProcessingTypeService = {
  async initPresetTypes() {
    var existing = await getAllFromStore('processingTypes');
    if (existing.length === 0) {
      for (var t of PRESET_TYPES) {
        await addToStore('processingTypes', t);
      }
    }
  },
  async getAll() {
    var types = await getAllFromStore('processingTypes');
    types.sort(function(a, b) { return (a.sortOrder || 99) - (b.sortOrder || 99); });
    return types;
  },
  async add(name) {
    var all = await getAllFromStore('processingTypes');
    var maxOrder = all.reduce(function(m, t) { return Math.max(m, t.sortOrder || 0); }, 0);
    return await addToStore('processingTypes', { name: name, sortOrder: maxOrder + 1, isPreset: false });
  },
  async remove(id) {
    await deleteFromStore('processingTypes', id);
  }
};

var OrderService = {
  async getAll(statusFilter) {
    var orders = await getAllFromStore('orders');
    if (statusFilter && statusFilter !== 'all') {
      orders = orders.filter(function(o) { return o.status === statusFilter; });
    }
    orders.sort(function(a, b) {
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });
    return orders;
  },
  async getById(id) {
    return await getFromStore('orders', Number(id));
  },
  async create(data) {
    var now = nowStr();
    var order = {
      orderNumber: data.orderNumber || '',
      processingType: data.processingType || '',
      quantity: Number(data.quantity) || 0,
      customerName: data.customerName || '',
      material: data.material || '',
      unitPrice: Number(data.unitPrice) || 0,
      deliveryDate: data.deliveryDate || '',
      notes: data.notes || '',
      status: data.status || 'pending',
      createdAt: now,
      updatedAt: now
    };
    return await addToStore('orders', order);
  },
  async update(id, data) {
    var existing = await getFromStore('orders', Number(id));
    if (!existing) throw new Error('订单不存在');
    var updated = { ...existing, ...data, id: Number(id), updatedAt: nowStr() };
    if (data.createdAt) updated.createdAt = data.createdAt;
    await putInStore('orders', updated);
  },
  async remove(id) {
    await deleteFromStore('orders', Number(id));
  }
};

var DailyPlanService = {
  async getByDate(dateStr) {
    return await getFromStore('dailyPlans', dateStr || getTodayStr());
  },
  async create(dateStr, items) {
    var plan = { date: dateStr, items: items || [], createdAt: nowStr(), updatedAt: nowStr() };
    await putInStore('dailyPlans', plan);
    return plan;
  },
  async updateItemCompletion(dateStr, orderId, completedQty) {
    var plan = await getFromStore('dailyPlans', dateStr);
    if (!plan) return;
    plan.items = (plan.items || []).map(function(item) {
      if (item.orderId === orderId || item.orderId === Number(orderId)) {
        return { ...item, completedQuantity: (item.completedQuantity || 0) + Number(completedQty) };
      }
      return item;
    });
    plan.updatedAt = nowStr();
    await putInStore('dailyPlans', plan);
  },
  async addItem(dateStr, item) {
    var plan = await getFromStore('dailyPlans', dateStr);
    if (!plan) return;
    var items = plan.items || [];
    var idx = items.findIndex(function(i) {
      return i.orderId === item.orderId || i.orderId === Number(item.orderId);
    });
    if (idx >= 0) {
      items[idx].plannedQuantity += Number(item.plannedQuantity);
    } else {
      items.push({
        orderId: item.orderId,
        orderNumber: item.orderNumber,
        processingType: item.processingType,
        plannedQuantity: Number(item.plannedQuantity),
        completedQuantity: 0
      });
    }
    plan.items = items;
    plan.updatedAt = nowStr();
    await putInStore('dailyPlans', plan);
  },
  async removeItem(dateStr, orderId) {
    var plan = await getFromStore('dailyPlans', dateStr);
    if (!plan) return;
    plan.items = (plan.items || []).filter(function(i) {
      return i.orderId !== orderId && i.orderId !== Number(orderId);
    });
    plan.updatedAt = nowStr();
    await putInStore('dailyPlans', plan);
  },
  async getMonthPlans(yearMonth) {
    var all = await getAllFromStore('dailyPlans');
    return all.filter(function(p) { return p.date && p.date.startsWith(yearMonth); })
              .sort(function(a, b) { return a.date.localeCompare(b.date); });
  }
};

var CheckinService = {
  async getByDate(dateStr) {
    var all = await getByIndex('checkins', 'date', dateStr || getTodayStr());
    all.sort(function(a, b) { return (b.createdAt || '').localeCompare(a.createdAt || ''); });
    return all;
  },
  async add(dateStr, orderId, orderNumber, processingType, quantity, notes, unitPrice, unitCost) {
    return await addToStore('checkins', {
      date: dateStr,
      orderId: orderId,
      orderNumber: orderNumber,
      processingType: processingType,
      quantity: Number(quantity),
      notes: notes || '',
      unitPrice: Number(unitPrice) || 0,
      unitCost: Number(unitCost) || 0,
      createdAt: nowStr()
    });
  },
  async getStatsByMonth(yearMonth) {
    var all = await getAllFromStore('checkins');
    return all.filter(function(c) { return c.date && c.date.startsWith(yearMonth); })
              .sort(function(a, b) { return a.date.localeCompare(b.date); });
  },
  async getStatsByWeek(startDate, endDate) {
    var all = await getAllFromStore('checkins');
    return all.filter(function(c) {
      return c.date && c.date >= startDate && c.date <= endDate;
    }).sort(function(a, b) { return a.date.localeCompare(b.date); });
  }
};
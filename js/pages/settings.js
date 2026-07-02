// === 设置页面 ===
var SettingsPage = Vue.defineComponent({
  template: `
    <div>
      <div class="app-header">
        <h1>⚙️ 设置</h1>
      </div>

      <div class="page-content">
        <div class="settings-section">
          <div class="section-label">加工类型管理</div>
          <div class="type-list">
            <div v-for="t in types" :key="t.id" class="type-item">
              <span class="ti-name">{{ t.name }}</span>
              <span class="ti-badge">{{ t.isPreset ? '预设' : '自定义' }}</span>
              <button class="ti-del" @click="removeType(t.id)" v-if="!t.isPreset">✕</button>
            </div>
          </div>
          <div class="add-type-row">
            <input class="form-input" v-model="newTypeName" placeholder="输入新加工类型" @keyup.enter="addType">
            <button class="btn btn-primary" @click="addType" :disabled="!newTypeName.trim()">添加</button>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-label">数据管理</div>
          <div class="settings-list">
            <div class="settings-item" @click="exportData">
              <div class="si-icon">📤</div>
              <div class="si-content">
                <div class="si-title">导出数据</div>
                <div class="si-desc">下载所有数据备份 (JSON)</div>
              </div>
              <div class="si-arrow">›</div>
            </div>
            <div class="settings-item" @click="importData">
              <div class="si-icon">📥</div>
              <div class="si-content">
                <div class="si-title">导入数据</div>
                <div class="si-desc">从备份文件恢复数据</div>
              </div>
              <div class="si-arrow">›</div>
            </div>
            <div class="settings-item" style="color:var(--danger)" @click="clearData">
              <div class="si-icon">🗑️</div>
              <div class="si-content">
                <div class="si-title" style="color:var(--danger)">清除所有数据</div>
                <div class="si-desc">删除全部订单和打卡记录</div>
              </div>
              <div class="si-arrow">›</div>
            </div>
          </div>
        </div>

        <div class="settings-section">
          <div class="section-label">关于</div>
          <div class="settings-list">
            <div class="settings-item">
              <div class="si-icon">ℹ️</div>
              <div class="si-content">
                <div class="si-title">机床加工订单管理</div>
                <div class="si-desc">版本 1.0.0</div>
              </div>
            </div>
            <div class="settings-item">
              <div class="si-icon">💾</div>
              <div class="si-content">
                <div class="si-title">数据存储</div>
                <div class="si-desc">本机存储 · 无需联网</div>
              </div>
            </div>
          </div>
        </div>

        <div class="card" style="margin-top:8px">
          <div class="card-title">📖 使用说明</div>
          <div style="font-size:13px;color:var(--gray-600);line-height:1.8">
            <p>1. <strong>新建订单</strong> → 在订单页记录加工类型和数量</p>
            <p>2. <strong>每日计划</strong> → 选择今天要做的订单，设定目标数量</p>
            <p>3. <strong>打卡完成</strong> → 每做完一批，在计划页打卡记录</p>
            <p>4. <strong>查看统计</strong> → 在统计页查看完成趋势</p>
            <p style="margin-top:8px;color:var(--gray-400)">所有数据保存在本机，定期用导出功能备份到手机</p>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    var types = Vue.ref([]);
    var newTypeName = Vue.ref('');
    var reminderEnabled = Vue.ref(false);
    var reminderHour = Vue.ref(8);
    var reminderMinute = Vue.ref(0);
    var notifPerm = Vue.ref('default');

    function loadReminderSettings() {
      var s = Reminder.loadSettings();
      reminderEnabled.value = s.enabled;
      reminderHour.value = s.hour;
      reminderMinute.value = s.minute;
      if ('Notification' in window) notifPerm.value = Notification.permission;
    }

    function toggleReminder() {
      reminderEnabled.value = !reminderEnabled.value;
      Reminder.saveSettings({ enabled: reminderEnabled.value, hour: reminderHour.value, minute: reminderMinute.value });
    }

    function pickTime() {
      // 简单时间选择：点击循环切换小时
      reminderHour.value = (reminderHour.value + 1) % 24;
      if (reminderHour.value === 0) {
        reminderHour.value = 8;
        reminderMinute.value = (reminderMinute.value + 15) % 60;
      }
      Reminder.saveSettings({ enabled: reminderEnabled.value, hour: reminderHour.value, minute: reminderMinute.value });
    }

    async function testNotification() {
      if (!('Notification' in window)) { alert('当前浏览器不支持通知'); return; }
      if (Notification.permission === 'denied') { alert('通知已被禁用，请在系统设置中开启'); return; }
      if (Notification.permission === 'default') {
        var r = await Reminder.requestPermission();
        notifPerm.value = r;
        if (r !== 'granted') { alert('需要允许通知权限才能使用提醒功能'); return; }
      }
      Reminder.send('⏰ 提醒测试' + (reminderEnabled.value ? ' (已开启)' : ''), '现在是 ' + reminderHour.value + ':' + String(reminderMinute.value).padStart(2,'0') + '，这是每日提醒的测试通知');
    }

    async function loadTypes() {
      try { types.value = await ProcessingTypeService.getAll(); }
      catch (err) { console.error(err); }
    }
    Vue.onMounted(function() {
      loadTypes();
      loadReminderSettings();
    });

    async function addType() {
      var name = newTypeName.value.trim();
      if (!name) return;
      var exists = types.value.some(function(t) { return t.name === name; });
      if (exists) { alert('该类型已存在'); return; }
      try {
        await ProcessingTypeService.add(name);
        newTypeName.value = '';
        loadTypes();
      } catch (err) { console.error(err); }
    }

    async function removeType(id) {
      if (!confirm('确定删除该加工类型？')) return;
      try { await ProcessingTypeService.remove(id); loadTypes(); }
      catch (err) { console.error(err); }
    }

    // 数据导出
    function exportData() {
      openDB().then(function(db) {
        var stores = ['processingTypes', 'orders', 'dailyPlans', 'checkins'];
        var tx = db.transaction(stores, 'readonly');
        var results = {};
        var pending = stores.length;
        stores.forEach(function(name) {
          var req = tx.objectStore(name).getAll();
          req.onsuccess = function() {
            results[name] = req.result;
            pending--;
            if (pending === 0) {
              var blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = '加工订单备份_' + getTodayStr() + '.json';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          };
        });
      });
    }

    // 数据导入
    function importData() {
      var input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = function(e) {
        var file = e.target.files[0];
        if (!file) return;
        if (!confirm('导入将覆盖当前所有数据，确定继续？')) return;
        var reader = new FileReader();
        reader.onload = function(ev) {
          try {
            var data = JSON.parse(ev.target.result);
            openDB().then(function(db) {
              var stores = ['processingTypes', 'orders', 'dailyPlans', 'checkins'];
              var pending = stores.length;
              stores.forEach(function(name) {
                if (!data[name]) { pending--; return; }
                var tx = db.transaction(name, 'readwrite');
                var store = tx.objectStore(name);
                store.clear();
                (data[name] || []).forEach(function(item) { store.add(item); });
                pending--;
              });
              // 等待完成
              setTimeout(function() {
                alert('数据导入完成！');
                loadTypes();
              }, 500);
            });
          } catch (err) {
            alert('导入失败：文件格式错误');
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    function clearData() {
      if (!confirm('确定清除所有数据？此操作不可恢复！')) return;
      if (!confirm('再次确认：真的要删除所有订单和打卡记录吗？')) return;
      openDB().then(function(db) {
        var stores = ['orders', 'dailyPlans', 'checkins'];
        stores.forEach(function(name) {
          var tx = db.transaction(name, 'readwrite');
          tx.objectStore(name).clear();
        });
        alert('数据已清除');
        loadTypes();
      });
    }

    return { types, newTypeName, addType, removeType, exportData, importData, clearData };
  }
});
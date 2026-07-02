// === 主应用入口 ===
var routes = [
  { path: '/', component: DashboardPage, meta: { showTab: true, tabLabel: '首页', tabIcon: '📊' } },
  { path: '/orders', component: OrdersPage, meta: { showTab: true, tabLabel: '订单', tabIcon: '📋' } },
  { path: '/orders/add', component: OrderDetailPage },
  { path: '/orders/:id', component: OrderDetailPage },
  { path: '/daily-plan', component: DailyPlanPage, meta: { showTab: true, tabLabel: '打卡', tabIcon: '📝' } },
  { path: '/statistics', component: StatisticsPage, meta: { showTab: true, tabLabel: '统计', tabIcon: '📈' } },
  { path: '/settings', component: SettingsPage, meta: { showTab: true, tabLabel: '设置', tabIcon: '⚙️' } },
  { path: '/:pathMatch(.*)*', redirect: '/' }
];

var router = VueRouter.createRouter({
  history: VueRouter.createWebHashHistory(),
  routes
});

var TabBar = Vue.defineComponent({
  template: `
    <div class="tab-bar" v-if="showTabs">
      <button v-for="tab in tabs" :key="tab.path" class="tab-item" :class="{ active: currentPath === tab.path }"
              @click="navigate(tab.path)">
        <span class="tab-icon">{{ tab.icon }}</span>
        <span>{{ tab.label }}</span>
      </button>
    </div>
  `,
  setup() {
    var route = VueRouter.useRoute();
    var r = VueRouter.useRouter();
    var tabs = [
      { path: '/', icon: '📊', label: '首页' },
      { path: '/orders', icon: '📋', label: '订单' },
      { path: '/daily-plan', icon: '📝', label: '打卡' },
      { path: '/statistics', icon: '📈', label: '统计' },
      { path: '/settings', icon: '⚙️', label: '设置' }
    ];
    var showTabs = Vue.computed(function() { return route.meta && route.meta.showTab; });
    var currentPath = Vue.computed(function() { return route.path; });
    function navigate(path) { if (route.path !== path) r.push(path); }
    return { tabs, showTabs, currentPath, navigate };
  }
});

var app = Vue.createApp({
  template: '<div><router-view /><TabBar /></div>'
});

app.component('TabBar', TabBar);
app.use(router);

// 初始化预设加工类型 & 挂载 App

// === 语音输入工具 ===
var VoiceInput = {
  isSupported: false,
  checkSupport: function() {
    this.isSupported = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    return this.isSupported;
  },
  start: function(options) {
    var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { if (options.onError) options.onError('当前浏览器不支持语音识别'); return null; }
    var recog = new SR();
    recog.lang = 'zh-CN';
    recog.continuous = false;
    recog.interimResults = true;
    recog.maxAlternatives = 1;

    recog.onresult = function(e) {
      var text = '';
      for (var i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) {
          text += e.results[i][0].transcript;
        }
      }
      if (text && options.onResult) options.onResult(text.trim());
    };
    recog.onerror = function(e) {
      var msg = e.error === 'no-speech' ? '没有检测到语音' :
                e.error === 'aborted' ? '已取消' :
                e.error === 'not-allowed' ? '请允许麦克风权限' :
                '语音识别失败: ' + e.error;
      if (options.onError) options.onError(msg);
    };
    recog.onend = function() {
      if (options.onEnd) options.onEnd();
    };
    try { recog.start(); } catch(err) {
      if (options.onError) options.onError('启动失败: ' + err.message);
    }
    return recog;
  }
};
VoiceInput.checkSupport();


// === 每日提醒工具 ===
var Reminder = {
  // 设置存储（使用 localStorage）
  saveSettings: function(s) {
    try { localStorage.setItem('reminderSettings', JSON.stringify(s)); } catch(e) {}
  },
  loadSettings: function() {
    try {
      var d = localStorage.getItem('reminderSettings');
      return d ? JSON.parse(d) : { enabled: false, hour: 8, minute: 0 };
    } catch(e) { return { enabled: false, hour: 8, minute: 0 }; }
  },
  // 请求通知权限
  requestPermission: async function() {
    if (!('Notification' in window)) return 'unsupported';
    var result = await Notification.requestPermission();
    return result;
  },
  // 发送通知
  send: function(title, body) {
    if (!('Notification' in window) || Notification.denied) return false;
    try {
      var n = new Notification(title, { body: body, icon: 'assets/icons/icon-512.svg' });
      setTimeout(function() { n.close(); }, 10000);
      return true;
    } catch(e) { return false; }
  },
  // 检查是否应该发送今日提醒
  checkToday: async function() {
    if (!('Notification' in window) || Notification.permission !== 'granted') return false;
    var s = this.loadSettings();
    if (!s.enabled) return false;
    var now = new Date();
    var today = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0') + '-' + String(now.getDate()).padStart(2,'0');
    // 检查今日是否已经提醒过
    var sentKey = 'reminderSent_' + today;
    if (localStorage.getItem(sentKey)) return false;
    // 检查是否到了提醒时间
    var minutesSinceMidnight = now.getHours() * 60 + now.getMinutes();
    var targetMinutes = s.hour * 60 + s.minute;
    if (minutesSinceMidnight < targetMinutes) return false;
    // 检查今日是否有计划
    try {
      var plan = await DailyPlanService.getByDate(today);
      if (plan && plan.items && plan.items.length > 0) {
        // 有计划，检查是否完成了
        var total = plan.items.reduce(function(s, i) { return s + (Number(i.plannedQuantity) || 0); }, 0);
        var done = plan.items.reduce(function(s, i) { return s + (Number(i.completedQuantity) || 0); }, 0);
        if (done >= total) return false; // 已完成
        this.send('🔧 加工提醒', '今天还有 ' + (total - done) + ' 件未完成，加油！');
      } else {
        this.send('📝 加工提醒', '今天的计划还没设置，快去安排工作吧！');
      }
      localStorage.setItem(sentKey, '1');
      return true;
    } catch(e) { return false; }
  }
};

router.isReady().then(function() {
  app.mount('#app');
  // 启动后检查提醒
  setTimeout(function() { Reminder.checkToday(); }, 3000);
  ProcessingTypeService.initPresetTypes().catch(function(err) {
    console.warn('初始化加工类型失败:', err);
  });
});
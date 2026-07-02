// === 首页仪表盘 ===
var DashboardPage = Vue.defineComponent({
  template: `
    <div>
      <div class="app-header">
        <h1>📊 {{ greeting }}</h1>
        <span style="font-size:13px;opacity:.8">📅 {{ todayStr }}</span>
      </div>

      <div class="page-content">
              <!-- 每日提醒条 -->
      <div class="reminder-bar" :class="reminder.type" v-if="reminder.show" @click="reminder.action">
        <span class="reminder-icon">{{ reminder.icon }}</span>
        <span class="reminder-text">{{ reminder.text }}</span>
        <span class="reminder-arrow" v-if="reminder.action">›</span>
      </div>

        <!-- 今日进度 -->
        <div class="card today-progress">
          <div class="flex justify-between items-center" style="margin-bottom:8px">
            <span class="card-title" style="margin:0">今日计划打卡</span>
            <span style="font-size:13px;color:var(--gray-500)">{{ todayStr }}</span>
          </div>
          <div class="progress-info">
            <span>已完成 {{ todayCompleted }} 件</span>
            <span>计划 {{ todayPlanned }} 件</span>
          </div>
          <div class="progress-bar" style="margin-bottom:6px">
            <div class="progress-fill" :class="{ complete: progressPercent >= 100 }"
                 :style="{ width: progressPercent + '%' }"></div>
          </div>
          <div class="text-center" style="font-size:13px;color:var(--gray-500)">
            <template v-if="progressPercent >= 100">✅ 今日目标已完成！</template>
            <template v-else>还差 {{ todayPlanned - todayCompleted }} 件完成目标</template>
          </div>
        </div>

        <!-- 统计卡片 -->
        <div class="stats-grid">
          <div class="stat-card stat-primary">
            <div class="stat-value">{{ stats.pendingOrders }}</div>
            <div class="stat-label">待处理订单</div>
          </div>
          <div class="stat-card stat-success">
            <div class="stat-value">{{ stats.monthCompleted }}</div>
            <div class="stat-label">本月完成</div>
          </div>
          <div class="stat-card stat-warning">
            <div class="stat-value">{{ stats.inProgressOrders }}</div>
            <div class="stat-label">进行中</div>
          </div>
          <div class="stat-card" style="border:2px solid #f59e0b">
            <div class="stat-value" style="color:#b45309;font-size:22px">¥{{ stats.todayProfit }}</div>
            <div class="stat-label">今日利润</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{{ stats.totalOrders }}</div>
            <div class="stat-label">全部订单</div>
          </div>
        </div>

        <!-- 快捷操作 -->
        <div class="dashboard-section">
          <div class="section-title">快捷操作</div>
          <div style="display:flex;gap:8px">
            <button class="btn btn-primary btn-block" @click="$router.push('/daily-plan')">📝 今日打卡</button>
            <button class="btn btn-outline btn-block" @click="$router.push('/orders/add')">➕ 新建订单</button>
          </div>
        </div>

        <!-- 最近订单 -->
        <div class="dashboard-section">
          <div class="section-title">最近订单</div>
          <div v-if="recentOrders.length === 0" class="empty-state">
            <div class="empty-icon">📋</div>
            <p>还没有订单，点击上方新建</p>
          </div>
          <div v-for="o in recentOrders" :key="o.id" class="order-item" @click="$router.push('/orders/' + o.id)">
            <div class="order-icon" :class="o.status">{{ statusIcon(o.status) }}</div>
            <div class="order-info">
              <div class="order-number">{{ o.orderNumber || '未编号' }}</div>
              <div class="order-meta">{{ o.processingType }} · {{ o.customerName || '无客户' }}</div>
            </div>
            <div class="order-qty">
              <div class="qty-value">{{ o.quantity }}</div>
              <div class="qty-label">件</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    var r = VueRouter.useRouter();
    var greeting = Vue.ref('加载中...');
    var todayStr = Vue.ref('');
    var todayPlanned = Vue.ref(0);
    var todayCompleted = Vue.ref(0);
    var progressPercent = Vue.ref(0);
    var recentOrders = Vue.ref([]);
    var reminder = Vue.reactive({ show: false, type: 'info', icon: '', text: '', action: null });
    var stats = Vue.reactive({
      pendingOrders: 0,
      inProgressOrders: 0,
      totalOrders: 0,
      monthCompleted: 0,
      todayProfit: 0
    });
    var loading = Vue.ref(true);

    function statusIcon(status) {
      return { pending: '📌', in_progress: '🔧', completed: '✅' }[status] || '📋';
    }

    function getDateStr(d) {
      var y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
      return y + '-' + m + '-' + day;
    }

    function getWeekday(d) {
      var weekdays = ['日', '一', '二', '三', '四', '五', '六'];
      return '星期' + weekdays[d.getDay()];
    }

    async function loadData() {
      try {
        var today = getTodayStr();
        var now = new Date();
        todayStr.value = now.getMonth()+1 + '月' + now.getDate() + '日 ' + getWeekday(now);
        greeting.value = now.getHours() < 12 ? '早上好 🌅' : now.getHours() < 18 ? '下午好 ☀️' : '晚上好 🌙';

        // 加载今日打卡记录（先加载，后面算利润要用）
        var todayCheckins = await CheckinService.getByDate(today);

        // 更新提醒条
        if (!plan || !plan.items || plan.items.length === 0) {
          reminder.show = true;
          reminder.type = 'warning';
          reminder.icon = '📝';
          reminder.text = '今天还没有设置计划，点此去安排工作';
          reminder.action = function() { r.push('/daily-plan'); };
        } else {
          var planned = plan.items.reduce(function(s, i) { return s + (Number(i.plannedQuantity) || 0); }, 0);
          var completed = plan.items.reduce(function(s, i) { return s + (Number(i.completedQuantity) || 0); }, 0);
          if (completed >= planned && planned > 0) {
            reminder.show = true;
            reminder.type = 'success';
            reminder.icon = '✅';
            reminder.text = '今日目标已完成！辛苦了 👏';
            reminder.action = null;
          } else if (completed > 0) {
            reminder.show = true;
            reminder.type = 'progress';
            reminder.icon = '🔧';
            reminder.text = '已完成 ' + completed + '/' + planned + ' 件，继续加油！';
            reminder.action = function() { r.push('/daily-plan'); };
          } else {
            reminder.show = true;
            reminder.type = 'info';
            reminder.icon = '💪';
            reminder.text = '今日计划已安排 ' + planned + ' 件，开始干活吧！';
            reminder.action = function() { r.push('/daily-plan'); };
          }
        }

        // 加载今日计划
        var plan = await DailyPlanService.getByDate(today);
        if (plan && plan.items) {
          var planned = plan.items.reduce(function(s, i) { return s + (Number(i.plannedQuantity) || 0); }, 0);
          var completed = plan.items.reduce(function(s, i) { return s + (Number(i.completedQuantity) || 0); }, 0);
          todayPlanned.value = planned;
          todayCompleted.value = completed;
          progressPercent.value = planned > 0 ? Math.min(100, Math.round(completed / planned * 100)) : 0;
        } else {
          todayPlanned.value = 0;
          todayCompleted.value = 0;
          progressPercent.value = 0;
        }

        // 加载订单统计
        var allOrders = await OrderService.getAll();
        stats.totalOrders = allOrders.length;
        stats.pendingOrders = allOrders.filter(function(o) { return o.status === 'pending'; }).length;
        stats.inProgressOrders = allOrders.filter(function(o) { return o.status === 'in_progress'; }).length;
        recentOrders.value = allOrders.slice(0, 5);

        // 本月完成量
        var yearMonth = now.getFullYear() + '-' + String(now.getMonth()+1).padStart(2,'0');
        var monthCheckins = await CheckinService.getStatsByMonth(yearMonth);
        stats.monthCompleted = monthCheckins.reduce(function(s, c) { return s + (Number(c.quantity) || 0); }, 0);

        // 今日利润
        stats.todayProfit = todayCheckins.reduce(function(s, c) {
          var profitPerUnit = (Number(c.unitPrice) || 0) - (Number(c.unitCost) || 0);
          return s + Math.round(profitPerUnit * Number(c.quantity) * 100) / 100;
        }, 0);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        loading.value = false;
      }
    }

    Vue.onMounted(loadData);

    return { greeting, todayStr, todayPlanned, todayCompleted, progressPercent, recentOrders, stats, statusIcon, reminder };
  }
});
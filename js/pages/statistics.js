// === 统计报表页面 ===
var StatisticsPage = Vue.defineComponent({
  template: `
    <div>
      <div class="app-header">
        <h1>📈 统计报表</h1>
      </div>

      <div class="page-content">
        <!-- 期间选择 -->
        <div class="stats-period">
          <div class="period-btn" :class="{ active: period === 'week' }" @click="period = 'week'; loadStats()">本周</div>
          <div class="period-btn" :class="{ active: period === 'month' }" @click="period = 'month'; loadStats()">本月</div>
          <div class="period-btn" :class="{ active: period === 'lastMonth' }" @click="period = 'lastMonth'; loadStats()">上月</div>
        </div>

        <!-- 总计卡片 -->
        <div class="stats-grid" style="margin-bottom:12px">
          <div class="stat-card stat-primary">
            <div class="stat-value">{{ totalQty }}</div>
            <div class="stat-label">完成总数</div>
          </div>
          <div class="stat-card stat-success">
            <div class="stat-value">{{ totalDays }}</div>
            <div class="stat-label">工作天数</div>
          </div>
          <div class="stat-card" style="border:2px solid #f59e0b">
            <div class="stat-value" style="color:#b45309;font-size:22px">¥{{ totalProfit }}</div>
            <div class="stat-label">期间利润</div>
          </div>
          <div class="stat-card">
            <div class="stat-value" style="font-size:18px">¥{{ avgDailyProfit }}</div>
            <div class="stat-label">日均利润</div>
          </div>
        </div>

        <!-- 柱状图 -->
        <div class="stats-chart">
          <div class="chart-title">每日完成量</div>
          <div class="chart-bar-group">
            <div v-for="(day, idx) in dailyData" :key="idx" class="chart-bar-item">
              <div class="bar" :style="{ height: maxQty > 0 ? (day.qty / maxQty * 110) + 'px' : '4px', background: day.color || 'var(--primary)' }"></div>
              <div class="bar-label">{{ day.label }}</div>
            </div>
          </div>
          <div v-if="dailyData.length === 0" class="text-center" style="padding:20px;color:var(--gray-400)">暂无数据</div>
        </div>

        <!-- 按加工类型统计 -->
        <div class="card type-stats" v-if="typeStats.length > 0">
          <div class="card-title">按加工类型统计</div>
          <div v-for="t in typeStats" :key="t.name" class="type-stat-row">
            <span class="ts-name">{{ t.name }}</span>
            <div class="ts-bar">
              <div class="ts-fill" :style="{ width: maxTypeQty > 0 ? (t.qty / maxTypeQty * 100) + '%' : '0%', background: t.color }"></div>
            </div>
            <span class="ts-qty">{{ t.qty }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    var period = Vue.ref('month');
    var totalQty = Vue.ref(0);
    var totalDays = Vue.ref(0);
    var totalProfit = Vue.ref(0);
    var avgDailyProfit = Vue.ref(0);
    var dailyData = Vue.ref([]);
    var typeStats = Vue.ref([]);
    var maxQty = Vue.ref(0);
    var maxTypeQty = Vue.ref(0);

    var typeColors = ['#1a56db','#059669','#d97706','#dc2626','#7c3aed','#db2777','#0891b2','#6b7280'];

    function getDateStr(d) {
      return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    }

    function getDateRange(periodType) {
      var now = new Date();
      var start, end;
      if (periodType === 'week') {
        var day = now.getDay() || 7;
        start = new Date(now);
        start.setDate(now.getDate() - day + 1);
        end = new Date(now);
      } else if (periodType === 'month') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now);
      } else {
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0);
      }
      return { start: getDateStr(start), end: getDateStr(end) };
    }

    async function loadStats() {
      try {
        var range = getDateRange(period.value);
        var checkins = await CheckinService.getStatsByWeek(range.start, range.end);

        // 按日汇总
        var dayMap = {};
        var typeMap = {};
        checkins.forEach(function(c) {
          dayMap[c.date] = (dayMap[c.date] || 0) + Number(c.quantity);
          var t = c.processingType || '其他';
          typeMap[t] = (typeMap[t] || 0) + Number(c.quantity);
        });

        // 生成日数据（补全天数）
        var startDate = new Date(range.start + 'T00:00:00');
        var endDate = new Date(range.end + 'T00:00:00');
        var daily = [];
        var d = new Date(startDate);
        var max = 0;
        while (d <= endDate) {
          var ds = getDateStr(d);
          var qty = dayMap[ds] || 0;
          if (qty > max) max = qty;
          daily.push({
            label: String(d.getMonth()+1) + '/' + String(d.getDate()),
            qty: qty,
            color: qty > 0 ? 'var(--primary)' : 'var(--gray-200)'
          });
          d.setDate(d.getDate() + 1);
        }
        dailyData.value = daily;
        maxQty.value = max;
        totalQty.value = daily.reduce(function(s, day) { return s + day.qty; }, 0);
        totalDays.value = daily.filter(function(day) { return day.qty > 0; }).length;

        // 计算利润
        var profitTotal = checkins.reduce(function(s, c) {
          var ppu = (Number(c.unitPrice) || 0) - (Number(c.unitCost) || 0);
          return s + Math.round(ppu * Number(c.quantity) * 100) / 100;
        }, 0);
        totalProfit.value = profitTotal;
        avgDailyProfit.value = totalDays.value > 0 ? Math.round(profitTotal / totalDays.value * 100) / 100 : 0;

        // 按类型统计
        var types = Object.keys(typeMap).sort();
        var maxT = 0;
        var typeArr = types.map(function(name, idx) {
          var qty = typeMap[name];
          if (qty > maxT) maxT = qty;
          return { name: name, qty: qty, color: typeColors[idx % typeColors.length] };
        });
        typeStats.value = typeArr;
        maxTypeQty.value = maxT;
      } catch (err) {
        console.error(err);
      }
    }

    Vue.onMounted(loadStats);

    return { period, totalQty, totalDays, totalProfit, avgDailyProfit, dailyData, typeStats, maxQty, maxTypeQty, loadStats };
  }
});
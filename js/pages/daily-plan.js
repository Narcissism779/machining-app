// === 每日计划 + 打卡页面 ===
var DailyPlanPage = Vue.defineComponent({
  template: `
    <div>
      <div class="app-header">
        <h1>📝 每日打卡</h1>
      
      <div class="voice-feedback" v-if="voiceFeedback">{{ voiceFeedback }}</div>
    </div>

      <div class="page-content">
        <!-- 日期和摘要 -->
        <div class="plan-date">
          <div class="date-text">{{ dateDisplay }}</div>
          <div class="date-weekday">{{ weekdayDisplay }}</div>
        </div>

        <!-- 计划统计 -->
        <div class="plan-summary">
          <div class="plan-stat">
            <div class="ps-value">{{ planTotal }}</div>
            <div class="ps-label">计划总数</div>
          </div>
          <div class="plan-stat">
            <div class="ps-value" style="color:var(--success)">{{ planCompleted }}</div>
            <div class="ps-label">已完成</div>
          </div>
          <div class="plan-stat">
            <div class="ps-value" style="color:var(--primary)">{{ planRemaining }}</div>
            <div class="ps-label">未完成</div>
          </div>
        </div>

        <!-- 进度条 -->
        <div class="today-progress">
          <div class="progress-info">
            <span>完成率 {{ planPercent }}%</span>
            <span>{{ planCompleted }}/{{ planTotal }}</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :class="{ complete: planPercent >= 100 }"
                 :style="{ width: planPercent + '%' }"></div>
          </div>
        </div>

        <!-- 如果没有今日计划 -->
        <div v-if="!plan && !loading" class="card text-center" style="margin-top:16px">
          <p style="color:var(--gray-500);margin-bottom:12px">还没有设置今日计划</p>
          <button class="btn btn-primary" @click="showAddModal = true">+ 创建今日计划</button>
        </div>

        <!-- 计划列表 -->
        <div v-if="plan">
          <div class="flex justify-between items-center" style="margin-bottom:8px">
            <span class="card-title" style="margin:0">今日计划项目</span>
            <button class="btn btn-sm btn-outline" @click="showAddModal = true">添加</button>
          </div>

          <div v-for="(item, idx) in plan.items" :key="item.orderId || idx" class="plan-item">
            <div class="pi-header">
              <div>
                <div class="pi-order">{{ item.orderNumber || '未编号' }}</div>
                <div class="pi-type">{{ item.processingType }}</div>
              </div>
              <button class="btn btn-sm btn-outline" style="color:var(--danger);border-color:var(--gray-200);font-size:12px;padding:4px 8px" @click="removeItem(item.orderId)">移除</button>
            </div>
            <div class="pi-progress">
              <div class="pi-bar">
                <div class="progress-bar">
                  <div class="progress-fill" :class="{ complete: item.completedQuantity >= item.plannedQuantity }"
                       :style="{ width: Math.min(100, (item.completedQuantity || 0) / (item.plannedQuantity || 1) * 100) + '%' }"></div>
                </div>
              </div>
              <div class="pi-text">{{ item.completedQuantity || 0 }}/{{ item.plannedQuantity }}</div>
            </div>
            <div class="pi-checkin">
              <span style="font-size:13px;color:var(--gray-500)">打卡完成：</span>
              <input type="number" v-model.number="checkinQty[item.orderId]" placeholder="数量" min="1" style="flex:1">
              <button class="voice-btn" style="width:34px;height:34px;font-size:18px"
                      :class="{ listening: listeningCheckin === item.orderId }"
                      @click="voiceCheckin(item)" :disabled="!VoiceInput.isSupported">🎤</button>
              <button class="btn btn-sm btn-success" @click="checkin(item)">打卡</button>
            </div>
          </div>

          <!-- 今日打卡记录 -->
          <div class="card" style="margin-top:16px" v-if="checkins.length > 0">
            <div class="card-title">今日打卡记录</div>
            <div v-for="(c, idx) in checkins" :key="c.id || idx"
                 style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid var(--gray-100);font-size:14px">
              <span>{{ c.orderNumber }} - {{ c.processingType }}</span>
              <span><strong>{{ c.quantity }}</strong> 件</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 添加项目弹窗 -->
      <div class="modal-overlay" v-if="showAddModal" @click.self="showAddModal = false">
        <div class="modal-content">
          <div class="modal-title">添加计划项目</div>
          <div class="form-group">
            <label class="form-label">选择订单</label>
            <select class="form-select" v-model="selectedOrderId">
              <option value="">请选择订单</option>
              <option v-for="o in availableOrders" :key="o.id" :value="o.id">
                {{ o.orderNumber || '未编号' }} - {{ o.processingType }} (余{{ o.quantity }}件)
              </option>
            </select>
          </div>
          <div class="form-group">
            <label class="form-label">计划加工数量</label>
            <input class="form-input" type="number" v-model.number="addPlannedQty" placeholder="输入数量" min="1">
          </div>
          <div class="form-actions">
            <button class="btn btn-outline btn-block" @click="showAddModal = false">取消</button>
            <button class="btn btn-primary btn-block" @click="addItem">添加</button>
          </div>
        </div>
      </div>
    </div>
  `,
  setup() {
    var plan = Vue.ref(null);
    var checkins = Vue.ref([]);
    var loading = Vue.ref(true);
    var availableOrders = Vue.ref([]);
    var showAddModal = Vue.ref(false);
    var selectedOrderId = Vue.ref('');
    var addPlannedQty = Vue.ref(1);
    var checkinQty = Vue.reactive({});
    var today = getTodayStr();

    var now = new Date();
    var dateDisplay = Vue.computed(function() {
      return now.getFullYear() + '年' + (now.getMonth()+1) + '月' + now.getDate() + '日';
    });
    var weekdayDisplay = Vue.computed(function() {
      var wd = ['日','一','二','三','四','五','六'];
      return '星期' + wd[now.getDay()];
    });

    var planTotal = Vue.computed(function() {
      if (!plan.value || !plan.value.items) return 0;
      return plan.value.items.reduce(function(s, i) { return s + (Number(i.plannedQuantity) || 0); }, 0);
    });
    var planCompleted = Vue.computed(function() {
      if (!plan.value || !plan.value.items) return 0;
      return plan.value.items.reduce(function(s, i) { return s + (Number(i.completedQuantity) || 0); }, 0);
    });
    var planRemaining = Vue.computed(function() { return Math.max(0, planTotal.value - planCompleted.value); });
    var planPercent = Vue.computed(function() {
      return planTotal.value > 0 ? Math.min(100, Math.round(planCompleted.value / planTotal.value * 100)) : 0;
    });

    var dailyProfit = Vue.computed(function() {
      if (!plan.value || !plan.value.items) return 0;
      return plan.value.items.reduce(function(s, item) {
        var qty = item.completedQuantity || 0;
        var profitPerUnit = (Number(item.unitPrice) || 0) - (Number(item.unitCost) || 0);
        return s + Math.round(profitPerUnit * qty * 100) / 100;
      }, 0);
    });

    async function loadData() {
      loading.value = true;
      try {
        plan.value = await DailyPlanService.getByDate(today);
        // 如果没有计划，预置空
        checkins.value = await CheckinService.getByDate(today);
        // 加载可选订单（待处理和进行中的）
        var allOrders = await OrderService.getAll();
        availableOrders.value = allOrders.filter(function(o) { return o.status !== 'completed'; });
      } catch (err) { console.error(err); }
      finally { loading.value = false; }
    }

    async function ensurePlan() {
      if (!plan.value) {
        await DailyPlanService.create(today, []);
        plan.value = await DailyPlanService.getByDate(today);
        planId = plan.value.date;
        Object.keys(checkinQty).forEach(function(k) { delete checkinQty[k]; });
      }
    }

    async function addItem() {
      if (!selectedOrderId.value) { alert('请选择订单'); return; }
      if (!addPlannedQty.value || addPlannedQty.value <= 0) { alert('请输入有效数量'); return; }
      await ensurePlan();
      var o = availableOrders.value.find(function(x) { return x.id === selectedOrderId.value; });
      if (!o) return;
      await DailyPlanService.addItem(plan.value.date, {
        orderId: o.id,
        orderNumber: o.orderNumber,
        processingType: o.processingType,
        plannedQuantity: addPlannedQty.value
      });
      showAddModal.value = false;
      selectedOrderId.value = '';
      addPlannedQty.value = 1;
      plan.value = await DailyPlanService.getByDate(today);
    }

    async function removeItem(orderId) {
      if (!plan.value) return;
      if (!confirm('确定移除该项目？')) return;
      await DailyPlanService.removeItem(plan.value.date, orderId);
      plan.value = await DailyPlanService.getByDate(today);
    }

    async function checkin(item) {
      var qty = checkinQty[item.orderId];
      if (!qty || qty <= 0) { alert('请输入打卡数量'); return; }
      await ensurePlan();
      // 更新计划完成量
      await DailyPlanService.updateItemCompletion(plan.value.date, item.orderId, qty);
      // 添加打卡记录
      await CheckinService.add(today, item.orderId, item.orderNumber, item.processingType, qty, '', item.unitPrice || 0, item.unitCost || 0);
      checkinQty[item.orderId] = '';
      plan.value = await DailyPlanService.getByDate(today);
      checkins.value = await CheckinService.getByDate(today);
    }

    Vue.onMounted(loadData);

    var listeningCheckin = Vue.ref('');
    var voiceFeedback = Vue.ref('');
    var recognition = null;

    function voiceCheckin(item) {
      if (listeningCheckin.value) return;
      listeningCheckin.value = item.orderId;
      voiceFeedback.value = '🎤 请说出完成数量...';
      recognition = VoiceInput.start({
        onResult: function(text) {
          var nums = text.match(/\\d+/g);
          if (nums) {
            var qty = parseInt(nums[0]);
            checkinQty[item.orderId] = qty;
            voiceFeedback.value = '✅ ' + qty + ' 件';
          } else {
            voiceFeedback.value = '⚠️ 未识别到数字，请重试';
          }
        },
        onError: function(msg) {
          voiceFeedback.value = '⚠️ ' + msg;
        },
        onEnd: function() {
          listeningCheckin.value = '';
          setTimeout(function() { voiceFeedback.value = ''; }, 2000);
        }
      });
    }

    return {
      plan, checkins, loading, availableOrders, showAddModal, selectedOrderId, addPlannedQty, checkinQty,
      dateDisplay, weekdayDisplay, planTotal, planCompleted, planRemaining, planPercent,
      addItem, removeItem, checkin, voiceCheckin, listeningCheckin, voiceFeedback, VoiceInput, dailyProfit
    };
  }
});
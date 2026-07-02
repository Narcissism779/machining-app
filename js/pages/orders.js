// === 订单列表页 ===
var OrdersPage = Vue.defineComponent({
  template: `
    <div>
      <div class="app-header">
        <h1>📋 订单管理</h1>
        <button class="btn-logout" @click="addOrder">+ 新建</button>
      </div>

      <div class="page-content">
        <div class="orders-header">
          <div class="filter-chip" :class="{ active: filter === 'all' }" @click="filter = 'all'; loadOrders()">全部</div>
          <div class="filter-chip" :class="{ active: filter === 'pending' }" @click="filter = 'pending'; loadOrders()">待处理</div>
          <div class="filter-chip" :class="{ active: filter === 'in_progress' }" @click="filter = 'in_progress'; loadOrders()">进行中</div>
          <div class="filter-chip" :class="{ active: filter === 'completed' }" @click="filter = 'completed'; loadOrders()">已完成</div>
        </div>

        <div v-if="loading" class="text-center" style="padding:40px;color:var(--gray-400)">加载中...</div>

        <div v-else-if="orders.length === 0" class="empty-state">
          <div class="empty-icon">📋</div>
          <p><template v-if="filter === 'all'">还没有订单，点击右上角新建</template><template v-else>没有符合条件的订单</template></p>
        </div>

        <div v-for="o in orders" :key="o.id" class="order-item" @click="goDetail(o.id)">
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
  `,
  setup() {
    var r = VueRouter.useRouter();
    var orders = Vue.ref([]);
    var filter = Vue.ref('all');
    var loading = Vue.ref(true);

    function statusIcon(s) { return { pending: '📌', in_progress: '🔧', completed: '✅' }[s] || '📋'; }

    async function loadOrders() {
      loading.value = true;
      try {
        orders.value = await OrderService.getAll(filter.value === 'all' ? null : filter.value);
      } catch (err) { console.error(err); }
      finally { loading.value = false; }
    }

    function addOrder() { r.push('/orders/add'); }
    function goDetail(id) { r.push('/orders/' + id); }

    Vue.onMounted(loadOrders);

    return { orders, filter, loading, statusIcon, loadOrders, addOrder, goDetail };
  }
});
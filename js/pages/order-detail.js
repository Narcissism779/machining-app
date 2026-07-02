// === 订单详情/编辑/新建页面（带语音输入） ===
var OrderDetailPage = Vue.defineComponent({
  template: `
    <div>
      <div class="app-header">
        <button class="btn-back" @click="goBack">&larr;</button>
        <h1>{{ isNew ? '新建订单' : '订单详情' }}</h1>
        <button v-if="!isNew && !isEditing" class="btn-logout" @click="isEditing = true">编辑</button>
      </div>

      <div class="page-content">
        <!-- 查看模式 -->
        <div v-if="!isEditing && !isNew">
          <div class="card" v-if="order">
            <div class="flex justify-between items-center" style="margin-bottom:12px">
              <span style="font-size:18px;font-weight:700">{{ order.orderNumber || '未编号' }}</span>
              <span class="order-status-badge" :class="order.status">{{ statusText(order.status) }}</span>
            </div>
            <div class="detail-section">
              <div class="detail-row"><span class="detail-label">加工类型</span><span class="detail-value">{{ order.processingType || '-' }}</span></div>
              <div class="detail-row"><span class="detail-label">数量</span><span class="detail-value">{{ order.quantity }} 件</span></div>
              <div class="detail-row"><span class="detail-label">客户</span><span class="detail-value">{{ order.customerName || '-' }}</span></div>
              <div class="detail-row"><span class="detail-label">电话</span><span class="detail-value">{{ order.customerPhone || '-' }}</span></div>
              <div class="detail-row"><span class="detail-label">地址</span><span class="detail-value">{{ order.shippingAddress || '-' }}</span></div>
              <div class="detail-row"><span class="detail-label">材料</span><span class="detail-value">{{ order.material || '-' }}</span></div>
              <div class="detail-row"><span class="detail-label">单价</span><span class="detail-value">{{ order.unitPrice ? '¥' + order.unitPrice : '-' }}</span></div>
              <div class="detail-row"><span class="detail-label">总价</span><span class="detail-value">{{ order.unitPrice ? '¥' + (order.unitPrice * order.quantity) : '-' }}</span></div>
              <div class="detail-row"><span class="detail-label">成本</span><span class="detail-value">{{ order.unitCost ? '¥' + (order.unitCost * order.quantity) : '-' }}</span></div>
              <div class="detail-row" style="background:var(--primary-bg);border-radius:6px;padding:8px;margin-top:4px"><span class="detail-label" style="font-weight:700;color:var(--primary)">利润</span><span class="detail-value" :style="{ color: profit >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }">{{ profit >= 0 ? '+' : '' }}¥{{ profit }}</span></div>
              <div class="detail-row"><span class="detail-label">交货日期</span><span class="detail-value">{{ order.deliveryDate || '-' }}</span></div>
              <div class="detail-row" v-if="order.notes"><span class="detail-label">备注</span><span class="detail-value">{{ order.notes }}</span></div>
            </div>
            <div class="detail-actions">
              <button class="btn btn-outline btn-block" @click="deleteOrder" v-if="!isNew">删除</button>
              <button class="btn btn-primary btn-block" @click="changeStatus" v-if="order.status !== 'completed'">
                {{ order.status === 'pending' ? '开始加工' : '标记完成' }}
              </button>
            </div>
          </div>
          <div v-else class="empty-state"><div class="empty-icon">📋</div><p>订单不存在</p></div>
        </div>

        <!-- 编辑/新建模式（带语音） -->
        <div v-else>
          <div class="card">
            <div v-if="!VoiceInput.isSupported" class="voice-hint">💡 提示：当前浏览器不支持语音输入</div>

            <div class="form-group">
              <label class="form-label">订单编号</label>
              <div class="voice-field">
                <input class="form-input" v-model="form.orderNumber" placeholder="如：JD-2024-001" ref="field_orderNumber">
                <button class="voice-btn" :class="{ listening: listeningField === 'orderNumber' }" @click="voiceInput('orderNumber')" :disabled="!VoiceInput.isSupported">🎤</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">加工类型 *</label>
              <div class="voice-field">
                <select class="form-select" v-model="form.processingType">
                  <option value="">请选择加工类型</option>
                  <option v-for="t in processingTypes" :key="t.id" :value="t.name">{{ t.name }}</option>
                </select>
                <button class="voice-btn" :class="{ listening: listeningField === 'processingType' }" @click="voiceInput('processingType')" :disabled="!VoiceInput.isSupported">🎤</button>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">数量 *</label>
              <div class="voice-field">
                <input class="form-input" type="number" v-model.number="form.quantity" placeholder="请输入数量" min="1">
                <button class="voice-btn" :class="{ listening: listeningField === 'quantity' }" @click="voiceInput('quantity')" :disabled="!VoiceInput.isSupported">🎤</button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">客户名</label>
                <div class="voice-field">
                  <input class="form-input" v-model="form.customerName" placeholder="客户">
                  <button class="voice-btn" :class="{ listening: listeningField === 'customerName' }" @click="voiceInput('customerName')" :disabled="!VoiceInput.isSupported">🎤</button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">材料</label>
                <div class="voice-field">
                  <input class="form-input" v-model="form.material" placeholder="如：45#钢">
                  <button class="voice-btn" :class="{ listening: listeningField === 'material' }" @click="voiceInput('material')" :disabled="!VoiceInput.isSupported">🎤</button>
                </div>
              </div>
            </div>

            <div class="form-group" style="margin-top:-4px">
              <label class="form-label">客户电话</label>
              <div class="voice-field">
                <input class="form-input" v-model="form.customerPhone" placeholder="手机号" type="tel">
                <button class="voice-btn" :class="{ listening: listeningField === 'customerPhone' }" @click="voiceInput('customerPhone')" :disabled="!VoiceInput.isSupported">🎤</button>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">单价 (元)</label>
                <input class="form-input" type="number" v-model.number="form.unitPrice" placeholder="售价" min="0">
              </div>
              <div class="form-group">
                <label class="form-label">成本单价</label>
                <div class="voice-field">
                  <input class="form-input" type="number" v-model.number="form.unitCost" placeholder="成本价" min="0">
                  <button class="voice-btn" :class="{ listening: listeningField === 'unitCost' }" @click="voiceInput('unitCost')" :disabled="!VoiceInput.isSupported">🎤</button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">交货日期</label>
                <input class="form-input" type="date" v-model="form.deliveryDate">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">发货地址</label>
              <div class="voice-field">
                <input class="form-input" v-model="form.shippingAddress" placeholder="详细地址">
                <button class="voice-btn" :class="{ listening: listeningField === 'shippingAddress' }" @click="voiceInput('shippingAddress')" :disabled="!VoiceInput.isSupported">🎤</button>
              </div>
            </div>
            <div class="form-group">
              <label class="form-label">备注</label>
              <div class="voice-field" style="align-items:flex-start">
                <textarea class="form-textarea" v-model="form.notes" placeholder="备注信息"></textarea>
                <button class="voice-btn" style="margin-top:2px" :class="{ listening: listeningField === 'notes' }" @click="voiceInput('notes')" :disabled="!VoiceInput.isSupported">🎤</button>
              </div>
            </div>

            <div class="form-actions">
              <button class="btn btn-outline btn-block" @click="cancelEdit">取消</button>
              <button class="btn btn-primary btn-block" @click="saveOrder" :disabled="saving">{{ saving ? '保存中...' : '保存' }}</button>
            </div>
          </div>
        </div>
      </div>

      <!-- 语音反馈提示 -->
      <div class="voice-feedback" v-if="voiceFeedback">{{ voiceFeedback }}</div>
    </div>
  `,
  setup() {
    var route = VueRouter.useRoute();
    var router = VueRouter.useRouter();
    var orderId = Vue.computed(function() { return route.params.id; });
    var isNew = Vue.computed(function() { return orderId.value === 'add'; });

    var order = Vue.ref(null);
    var isEditing = Vue.ref(false);
    var saving = Vue.ref(false);
    var processingTypes = Vue.ref([]);
    var listeningField = Vue.ref('');
    var voiceFeedback = Vue.ref('');
    var recognition = null;

    var form = Vue.reactive({
      orderNumber: '', processingType: '', quantity: '', customerName: '', customerPhone: '',
      material: '', unitPrice: '', unitCost: '', deliveryDate: '', notes: '', shippingAddress: ''
    });

    async function loadOrder() {
      if (isNew.value) { isEditing.value = true; return; }
      try {
        var o = await OrderService.getById(orderId.value);
        order.value = o;
        if (o) {
          form.orderNumber = o.orderNumber || '';
          form.processingType = o.processingType || '';
          form.quantity = o.quantity || '';
          form.customerName = o.customerName || '';
          form.customerPhone = o.customerPhone || '';
          form.material = o.material || '';
          form.unitPrice = o.unitPrice || '';
          form.unitCost = o.unitCost || '';
          form.deliveryDate = o.deliveryDate || '';
          form.notes = o.notes || '';
          form.shippingAddress = o.shippingAddress || '';
        }
      } catch (err) { console.error(err); }
    }

    async function loadTypes() {
      try { processingTypes.value = await ProcessingTypeService.getAll(); }
      catch (err) { console.error(err); }
    }

    Vue.onMounted(function() { loadOrder(); loadTypes(); });

    function statusText(s) {
      return { pending: '待处理', in_progress: '进行中', completed: '已完成' }[s] || '未知';
    }

    // ---- 语音输入 ----
    function voiceInput(field) {
      if (listeningField.value) return; // 已经在录音
      listeningField.value = field;
      voiceFeedback.value = '🎤 请说话...';

      recognition = VoiceInput.start({
        onResult: function(text) {
          if (field === 'quantity') {
            // 提取数字
            var nums = text.match(/\d+/g);
            if (nums) form.quantity = parseInt(nums[0]);
            else voiceFeedback.value = '⚠️ 未识别到数字，请重试';
          } else if (field === 'processingType') {
            // 尝试匹配已有加工类型
            var matched = processingTypes.value.find(function(t) {
              return t.name === text || text.includes(t.name);
            });
            if (matched) form.processingType = matched.name;
            else form.processingType = text;
          } else {
            form[field] = text;
          }
          voiceFeedback.value = '✅ ' + text;
        },
        onError: function(msg) {
          voiceFeedback.value = '⚠️ ' + msg;
        },
        onEnd: function() {
          listeningField.value = '';
          // 2秒后清除反馈
          setTimeout(function() {
            voiceFeedback.value = '';
          }, 2000);
        }
      });
    }

    async function saveOrder() {
      if (!form.processingType) { alert('请选择加工类型'); return; }
      if (!form.quantity || form.quantity <= 0) { alert('请输入有效数量'); return; }
      saving.value = true;
      try {
        var data = { ...form };
        if (isNew.value) {
          data.status = 'pending';
          await OrderService.create(data);
        } else {
          await OrderService.update(orderId.value, data);
        }
        isEditing.value = false;
        if (isNew.value) { router.push('/orders'); }
        else { loadOrder(); }
      } catch (err) {
        console.error(err);
        alert('保存失败：' + err.message);
      } finally { saving.value = false; }
    }

    function cancelEdit() {
      if (isNew.value) { router.push('/orders'); return; }
      isEditing.value = false; loadOrder();
    }

    async function deleteOrder() {
      if (!confirm('确定要删除该订单吗？')) return;
      try { await OrderService.remove(orderId.value); router.push('/orders'); }
      catch (err) { console.error(err); alert('删除失败'); }
    }

    async function changeStatus() {
      try {
        var nextStatus = order.value.status === 'pending' ? 'in_progress' : 'completed';
        await OrderService.update(orderId.value, { status: nextStatus });
        loadOrder();
      } catch (err) { console.error(err); alert('状态更新失败'); }
    }

    var profit = Vue.computed(function() {
      var p = Number(order.value?.unitPrice || 0) - Number(order.value?.unitCost || 0);
      return Math.round(p * Number(order.value?.quantity || 0) * 100) / 100;
    });

    function goBack() {
      router.push(isNew.value ? '/orders' : '/orders');
    }

    return {
      order, isNew, isEditing, saving, processingTypes, form,
      listeningField, voiceFeedback, VoiceInput,
      statusText, saveOrder, cancelEdit, deleteOrder, changeStatus, voiceInput, goBack, profit
    };
  }
});
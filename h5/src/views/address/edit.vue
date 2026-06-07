<template>
  <div class="page-address-edit">
    <van-nav-bar :title="isEdit ? '编辑地址' : '新增地址'" left-arrow @click-left="goBack" />

    <div v-if="loading" class="page-address-edit__loading">
      <van-loading />
    </div>

    <van-form v-else @submit="handleSubmit" class="page-address-edit__form">
      <van-cell-group inset>
        <van-field
          v-model="form.recipient_name"
          name="recipient_name"
          label="收货人"
          placeholder="请输入收货人姓名"
          :rules="[{ required: true, message: '请输入收货人姓名' }]"
        />
        <van-field
          v-model="form.phone"
          name="phone"
          label="手机号"
          placeholder="请输入手机号"
          type="tel"
          maxlength="11"
          :rules="[
            { required: true, message: '请输入手机号' },
            { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确' },
          ]"
        />
        <van-field
          v-model="areaText"
          name="area"
          label="所在地区"
          placeholder="请选择省 / 市 / 区"
          is-link
          readonly
          @click="showAreaPicker = true"
          :rules="[{ required: true, message: '请选择所在地区' }]"
        />
        <van-field
          v-model="form.detail"
          name="detail"
          label="详细地址"
          placeholder="请输入详细地址（街道、门牌号等）"
          rows="2"
          autosize
          type="textarea"
          :rules="[{ required: true, message: '请输入详细地址' }]"
        />
        <van-cell center title="设为默认地址">
          <template #right-icon>
            <van-switch v-model="form.is_default" size="20" />
          </template>
        </van-cell>
      </van-cell-group>

      <div class="page-address-edit__submit">
        <van-button type="primary" block round native-type="submit">
          保存
        </van-button>
      </div>
    </van-form>

    <!-- 地区选择器 -->
    <van-popup v-model:show="showAreaPicker" position="bottom">
      <van-area
        :area-list="areaList"
        :columns-num="3"
        confirm-button-text="确认"
        cancel-button-text="取消"
        @confirm="onAreaConfirm"
        @cancel="showAreaPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { showToast } from 'vant'
import { areaList } from '@vant/area-data'
import type { AddressRequest } from 'shared/types/address'
import request from '@/utils/request'

const route = useRoute()
const router = useRouter()

const isEdit = computed(() => !!route.params.id)
const loading = ref(false)
const showAreaPicker = ref(false)
const areaText = ref('')

function goBack() {
  const backTo = route.query.back as string
  if (backTo === 'checkout') {
    router.replace({ name: 'Checkout' })
  } else {
    router.back()
  }
}

const form = ref<AddressRequest>({
  recipient_name: '',
  phone: '',
  province: '',
  city: '',
  district: '',
  detail: '',
  is_default: false,
})

function onAreaConfirm(params: any) {
  const options = params.selectedOptions
  if (!options || options.length < 3) return
  form.value.province = options[0].text
  form.value.city = options[1].text
  form.value.district = options[2].text
  areaText.value = `${options[0].text} ${options[1].text} ${options[2].text}`
  showAreaPicker.value = false
}

async function fetchAddress() {
  const id = route.params.id as string
  if (!id) return

  loading.value = true
  try {
    const res = await request.get('/addresses')
    const list = res.data.data
    const target = list.find((a: any) => a.id === Number(id))
    if (target) {
      form.value = {
        recipient_name: target.recipient_name,
        phone: target.phone,
        province: target.province,
        city: target.city,
        district: target.district,
        detail: target.detail,
        is_default: target.is_default,
      }
      areaText.value = `${target.province} ${target.city} ${target.district}`
    } else {
      showToast('地址不存在')
      router.back()
    }
  } catch {
    showToast('加载地址信息失败')
    router.back()
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  try {
    if (!form.value.province) {
      showToast('请选择所在地区')
      return
    }

    if (isEdit.value) {
      const id = route.params.id as string
      await request.put(`/addresses/${id}`, form.value)
      showToast('更新成功')
    } else {
      await request.post('/addresses', form.value)
      showToast('添加成功')
    }
    // 判断是否从结算页进入，如果是则返回结算页
    const backTo = route.query.back as string
    if (backTo === 'checkout') {
      router.replace({ name: 'Checkout' })
    } else {
      router.back()
    }
  } catch {
    showToast(isEdit.value ? '更新失败' : '添加失败')
  }
}

onMounted(() => {
  fetchAddress()
})
</script>

<style scoped>
.page-address-edit {
  min-height: 100vh;
  background: var(--bg-color);
}

.page-address-edit__loading {
  display: flex;
  justify-content: center;
  padding-top: 100px;
}

.page-address-edit__form {
  padding: 12px;
}

.page-address-edit__submit {
  margin-top: 24px;
  padding: 0 16px;
}
</style>

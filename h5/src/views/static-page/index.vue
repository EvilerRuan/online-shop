<template>
  <div class="page-static">
    <van-nav-bar :title="pageTitle" left-arrow @click-left="router.back()" />

    <van-loading v-if="loading" class="page-static__loading" size="36" vertical>
      加载中...
    </van-loading>

    <div v-else class="page-static__content rich-text" v-html="safeHtml" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { showToast } from 'vant'
import DOMPurify from 'dompurify'
import request from '@/utils/request'

const router = useRouter()
const route = useRoute()

const titleMap: Record<string, string> = {
  merchant_intro: '商家简介',
  merchant_notice: '商家公告',
  buyer_notice: '买家须知',
  about: '关于我们',
  service: '服务协议',
  privacy: '隐私政策',
  faq: '常见问题',
}

const pageType = computed(() => route.params.type as string)
const pageTitle = computed(() => titleMap[pageType.value] || '详情')

const loading = ref(true)
const htmlContent = ref('')

const safeHtml = computed(() => DOMPurify.sanitize(htmlContent.value))

onMounted(() => {
  fetchContent()
})

watch(pageType, () => {
  fetchContent()
})

async function fetchContent() {
  loading.value = true
  htmlContent.value = ''

  try {
    const res = await request.get('/settings', {
      params: { key: pageType.value },
    })
    htmlContent.value = res.data.data.value || ''
  } catch {
    showToast('内容加载失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.page-static {
  min-height: 100vh;
  background-color: #fff;
}

.page-static__loading {
  display: flex;
  justify-content: center;
  padding-top: 120px;
}

.page-static__content {
  padding: 16px;
  line-height: 1.8;
  color: var(--text-color);
  word-break: break-all;
}

.rich-text :deep(p) {
  margin-bottom: 12px;
}

.rich-text :deep(img) {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
  margin: 8px 0;
}

.rich-text :deep(h1),
.rich-text :deep(h2),
.rich-text :deep(h3) {
  margin: 16px 0 8px;
  font-weight: 600;
}

.rich-text :deep(ul),
.rich-text :deep(ol) {
  padding-left: 20px;
  margin-bottom: 12px;
}

.rich-text :deep(a) {
  color: var(--primary-color);
}

.rich-text :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 8px 0;
}

.rich-text :deep(th),
.rich-text :deep(td) {
  border: 1px solid var(--border-color);
  padding: 8px;
  text-align: left;
}
</style>

<template>
  <view class="page-chat">
    <!-- 消息列表 -->
    <scroll-view
      class="page-chat__messages"
      scroll-y
      :scroll-into-view="scrollToView"
      @scrolltoupper="loadMore"
    >
      <view v-if="!hasMore" class="no-more">没有更多消息了</view>
      <view
        v-for="msg in messages"
        :key="msg.id"
        :id="`msg-${msg.id}`"
        class="message-item"
        :class="msg.is_user ? 'message-item--user' : 'message-item--system'"
      >
        <view class="message-avatar">
          {{ msg.is_user ? '👤' : '🤖' }}
        </view>
        <view class="message-bubble">
          <text class="message-text">{{ msg.content }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 底部输入栏 -->
    <view class="page-chat__footer">
      <input
        class="chat-input"
        v-model="inputText"
        placeholder="请输入消息..."
        @confirm="sendMessage"
      />
      <view class="send-btn" :class="{ 'send-btn--disabled': !inputText.trim() }" @tap="sendMessage">
        发送
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import Taro from '@tarojs/taro'
import api from '@/utils/request'

interface Message {
  id: number
  content: string
  is_user: boolean
  created_at: string
}

const messages = ref<Message[]>([])
const inputText = ref('')
const scrollToView = ref('')
const page = ref(1)
const hasMore = ref(true)

onMounted(() => {
  loadMessages()
})

async function loadMessages() {
  try {
    const res = await api.get<Message[]>('/api/retail/messages', {
      page: page.value,
      limit: 20,
    })

    if (page.value === 1) {
      messages.value = res.reverse()
    } else {
      messages.value = [...res.reverse(), ...messages.value]
    }

    hasMore.value = res.length >= 20
  } catch (err) {
    console.error('加载消息失败', err)
  }
}

function loadMore() {
  if (hasMore.value) {
    page.value++
    loadMessages()
  }
}

async function sendMessage() {
  const content = inputText.value.trim()
  if (!content) return

  try {
    await api.post('/api/retail/messages', { content })
    inputText.value = ''
    page.value = 1
    hasMore.value = true
    await loadMessages()
    scrollToBottom()
  } catch (err) {
    Taro.showToast({ title: '发送失败', icon: 'none' })
  }
}

function scrollToBottom() {
  nextTick(() => {
    if (messages.value.length > 0) {
      scrollToView.value = `msg-${messages.value[messages.value.length - 1].id}`
    }
  })
}
</script>

<style lang="scss">
@import '../../styles/variables.scss';

.page-chat {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: $bg-color;
}

.page-chat__messages {
  flex: 1;
  padding: 24px;
}

.no-more {
  text-align: center;
  font-size: 22px;
  color: $text-color-light;
  padding: 16px 0;
}

.message-item {
  display: flex;
  margin-bottom: 24px;
}

.message-item--user {
  flex-direction: row-reverse;
}

.message-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  flex-shrink: 0;
}

.message-bubble {
  max-width: 60%;
  padding: 20px 24px;
  border-radius: 16px;
  margin: 0 16px;
}

.message-item--system .message-bubble {
  background-color: #fff;
  border-top-left-radius: 4px;
}

.message-item--user .message-bubble {
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  border-top-right-radius: 4px;
}

.message-text {
  font-size: 26px;
  line-height: 1.5;
}

.message-item--system .message-text {
  color: $text-color;
}

.message-item--user .message-text {
  color: #fff;
}

.page-chat__footer {
  display: flex;
  align-items: center;
  padding: 16px 24px;
  padding-bottom: calc(16px + env(safe-area-inset-bottom));
  background-color: #fff;
  border-top: 1px solid $border-color;
}

.chat-input {
  flex: 1;
  height: 72px;
  background-color: $bg-color;
  border-radius: 36px;
  padding: 0 24px;
  font-size: 26px;
  color: $text-color;
}

.send-btn {
  margin-left: 16px;
  padding: 0 32px;
  height: 64px;
  background: linear-gradient(135deg, $gradient-start, $gradient-end);
  border-radius: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-weight: 600;
  color: #fff;
}

.send-btn--disabled {
  opacity: 0.5;
}
</style>

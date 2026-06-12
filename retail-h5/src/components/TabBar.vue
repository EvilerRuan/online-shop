<template>
  <view class="tab-bar">
    <view
      v-for="(tab, index) in tabs"
      :key="tab.path"
      class="tab-bar__item"
      :class="{ 'tab-bar__item--active': active === index }"
      @tap="switchTab(tab.path, index)"
    >
      <text class="tab-bar__icon">{{ tab.icon }}</text>
      <text
        class="tab-bar__text"
        :class="{ 'tab-bar__text--active': active === index }"
      >
        {{ tab.label }}
      </text>
    </view>
  </view>
</template>

<script setup lang="ts">
import Taro from '@tarojs/taro'

const props = defineProps<{
  active: number
}>()

const tabs = [
  { path: '/pages/home/index', icon: '🏠', label: '首页' },
  { path: '/pages/category/index', icon: '📂', label: '分类' },
  { path: '/pages/cart/index', icon: '🛒', label: '购物车' },
  { path: '/pages/profile/index', icon: '👤', label: '我的' },
]

function switchTab(path: string, index: number) {
  if (index === props.active) return
  Taro.switchTab({ url: path })
}
</script>

<style lang="scss">
@import '../styles/variables.scss';

.tab-bar {
  display: flex;
  background-color: #fff;
  border-top: 1px solid $border-color;
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  height: 50px;
  flex-shrink: 0;
}

.tab-bar__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 4px 0;
}

.tab-bar__icon {
  font-size: 20px;
  line-height: 1;
  margin-bottom: 2px;
  filter: grayscale(1);
  opacity: 0.5;
  transition: all 0.2s;
}

.tab-bar__text {
  font-size: 10px;
  color: $text-color-secondary;
  transition: color 0.2s;
}

.tab-bar__item--active {
  .tab-bar__icon {
    filter: none;
    opacity: 1;
  }

  .tab-bar__text {
    color: $primary-color;
    font-weight: 600;
  }
}
</style>

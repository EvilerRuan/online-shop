import { defineStore } from 'pinia'
import type { CartListItem } from 'shared/types/cart'
import request from '@/utils/request'

interface CartState {
  items: CartListItem[]
  selectedIds: number[]
}

export const useCartStore = defineStore('cart', {
  state: (): CartState => ({
    items: [],
    selectedIds: [],
  }),

  getters: {
    selectedItems: (state) =>
      state.items.filter((item) => state.selectedIds.includes(item.id)),

    totalPrice: (state): number =>
      state.items
        .filter((item) => state.selectedIds.includes(item.id))
        .reduce((sum, item) => sum + item.subtotal, 0),

    isAllSelected: (state): boolean =>
      state.items.length > 0 &&
      state.items.every((item) => state.selectedIds.includes(item.id)),

    selectedCount: (state): number => state.selectedIds.length,
  },

  actions: {
    async fetchCart() {
      const res = await request.get('/cart')
      this.items = res.data.data
      // 清理已不存在的 selectedIds
      const validIds = this.items.map((item: CartListItem) => item.id)
      this.selectedIds = this.selectedIds.filter((id) => validIds.includes(id))
    },

    toggleSelect(id: number) {
      const index = this.selectedIds.indexOf(id)
      if (index > -1) {
        this.selectedIds.splice(index, 1)
      } else {
        this.selectedIds.push(id)
      }
    },

    toggleSelectAll() {
      if (this.isAllSelected) {
        this.selectedIds = []
      } else {
        this.selectedIds = this.items.map((item) => item.id)
      }
    },

    async updateQuantity(id: number, quantity: number) {
      await request.put(`/cart/${id}`, { quantity })
      const item = this.items.find((item) => item.id === id)
      if (item) {
        item.quantity = quantity
        item.subtotal = item.sku.price * quantity
      }
    },

    async removeItem(id: number) {
      await request.delete(`/cart/${id}`)
      this.items = this.items.filter((item) => item.id !== id)
      const index = this.selectedIds.indexOf(id)
      if (index > -1) {
        this.selectedIds.splice(index, 1)
      }
    },

    clearSelected() {
      this.selectedIds = []
    },
  },
})

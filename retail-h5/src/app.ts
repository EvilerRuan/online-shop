import { createApp } from 'vue'
import { createPinia } from 'pinia'

const App = createApp({
  onShow() {
    // 应用显示时的逻辑
  },
})

App.use(createPinia())

export default App

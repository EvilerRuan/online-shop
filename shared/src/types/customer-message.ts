// 客服消息类型

export type SenderType = 'user' | 'admin'
export type MessageType = 'text' | 'image'

// 客服消息
export interface CustomerMessage {
  id: number
  user_id: string
  sender_type: SenderType
  content: string
  message_type: MessageType
  is_read: boolean
  created_at: string
}

// 发送客服消息请求
export interface SendMessageRequest {
  content: string
  message_type?: MessageType
}

// 客服用户列表项（管理后台）
export interface CustomerServiceUser {
  user_id: string
  username: string
  phone: string
  avatar_url: string
  last_message: string
  last_message_at: string
  unread_count: number
}

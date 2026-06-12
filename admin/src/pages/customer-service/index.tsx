import { useCallback, useEffect, useRef, useState } from 'react'
import { Badge, Button, Card, Input, List, Spin, message } from 'antd'
import { SendOutlined } from '@ant-design/icons'
import request from '@/utils/request'
import type { ApiResponse } from 'shared/types/api'

interface ChatUser {
  user_id: string
  user_name: string
  last_message: string
  unread_count: number
  updated_at: string
}

interface ChatMessage {
  id: number
  user_id: string
  content: string
  is_admin: boolean
  created_at: string
}

export default function CustomerService() {
  const [users, setUsers] = useState<ChatUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [selectedUser, setSelectedUser] = useState<ChatUser | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const fetchUsers = useCallback(() => {
    setUsersLoading(true)
    request
      .get<ApiResponse<ChatUser[]>>('/admin/customer-service/users')
      .then((res) => {
        const data = res.data.data
        setUsers(Array.isArray(data) ? data : [])
      })
      .catch(() => {})
      .finally(() => setUsersLoading(false))
  }, [])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  const fetchMessages = useCallback(
    (userId: string) => {
      setMessagesLoading(true)
      request
        .get<ApiResponse<ChatMessage[]>>('/admin/customer-service/messages', {
          params: { user_id: userId },
        })
        .then((res) => {
          const data = res.data.data
          setMessages(Array.isArray(data) ? data : [])
        })
        .catch(() => {})
        .finally(() => setMessagesLoading(false))
    },
    [],
  )

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }, [])

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.user_id)
    }
  }, [selectedUser, fetchMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  // Polling for new messages every 5 seconds
  useEffect(() => {
    if (!selectedUser) return
    const interval = setInterval(() => {
      fetchMessages(selectedUser.user_id)
      fetchUsers()
    }, 5000)
    return () => clearInterval(interval)
  }, [selectedUser, fetchMessages, fetchUsers])

  const handleSelectUser = (user: ChatUser) => {
    setSelectedUser(user)
    setMessages([])
  }

  const handleSend = async () => {
    if (!selectedUser || !inputValue.trim()) return
    setSending(true)
    try {
      await request.post<ApiResponse>('/admin/customer-service/reply', {
        user_id: selectedUser.user_id,
        content: inputValue.trim(),
      })
      setInputValue('')
      fetchMessages(selectedUser.user_id)
      fetchUsers()
    } catch {
      message.error('发送失败')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div style={{ display: 'flex', gap: 16, height: 'calc(100vh - 140px)' }}>
      {/* Left panel: user list */}
      <Card
        title="会话列表"
        style={{ width: 300, flexShrink: 0, overflow: 'auto' }}
        styles={{ body: { padding: 0 } }}
      >
        <Spin spinning={usersLoading}>
          <List
            dataSource={users}
            locale={{ emptyText: '暂无会话' }}
            renderItem={(user) => {
              const isSelected = selectedUser?.user_id === user.user_id
              return (
                <List.Item
                  onClick={() => handleSelectUser(user)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: isSelected ? '#e6f4ff' : 'transparent',
                    borderLeft: isSelected ? '3px solid #1677ff' : '3px solid transparent',
                  }}
                >
                  <List.Item.Meta
                    title={
                      <span style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>{user.user_name}</span>
                        {user.unread_count > 0 && (
                          <Badge count={user.unread_count} size="small" />
                        )}
                      </span>
                    }
                    description={
                      <span
                        style={{
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          display: 'block',
                          maxWidth: 200,
                        }}
                      >
                        {user.last_message}
                      </span>
                    }
                  />
                </List.Item>
              )
            }}
          />
        </Spin>
      </Card>

      {/* Right panel: chat area */}
      <Card
        title={selectedUser ? `与 ${selectedUser.user_name} 的对话` : '客服消息'}
        style={{ flex: 1, display: 'flex', flexDirection: 'column' }}
        styles={{
          body: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
          },
        }}
      >
        {!selectedUser ? (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#999',
            }}
          >
            请从左侧选择一个用户开始对话
          </div>
        ) : (
          <>
            {/* Messages area */}
            <div
              style={{
                flex: 1,
                overflow: 'auto',
                padding: '16px',
              }}
            >
              <Spin spinning={messagesLoading}>
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      justifyContent: msg.is_admin ? 'flex-end' : 'flex-start',
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{
                        maxWidth: '70%',
                        padding: '8px 12px',
                        borderRadius: 8,
                        background: msg.is_admin ? '#1677ff' : '#f0f0f0',
                        color: msg.is_admin ? '#fff' : '#333',
                        wordBreak: 'break-word',
                      }}
                    >
                      <div>{msg.content}</div>
                      <div
                        style={{
                          fontSize: 11,
                          color: msg.is_admin ? 'rgba(255,255,255,0.7)' : '#999',
                          marginTop: 4,
                          textAlign: 'right',
                        }}
                      >
                        {new Date(msg.created_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </Spin>
            </div>

            {/* Input area */}
            <div
              style={{
                padding: '12px 16px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                gap: 8,
              }}
            >
              <Input.TextArea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="输入消息，Enter 发送，Shift+Enter 换行"
                autoSize={{ minRows: 1, maxRows: 3 }}
                style={{ flex: 1 }}
              />
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSend}
                loading={sending}
                disabled={!inputValue.trim()}
              >
                发送
              </Button>
            </div>
          </>
        )}
      </Card>
    </div>
  )
}

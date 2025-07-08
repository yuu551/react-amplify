import { useState, useEffect } from 'react'
import { Card, Button } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>()

interface AuditLogEntry {
  id: string
  timestamp: string
  userId: string
  action: string
  command?: string
  area?: string
  address?: string
  value?: string
  status: 'success' | 'error'
  sourceIP?: string
}

export default function AuditLog() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'success' | 'error'>('all')

  useEffect(() => {
    fetchAuditLogs()
  }, [])

  const fetchAuditLogs = async () => {
    setLoading(true)
    try {
      // Fetch audit logs from CloudWatch via Lambda
      const { data, errors } = await client.queries.getAuditLogs({
        startTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24 hours
        endTime: new Date().toISOString(),
        limit: 100
      })

      if (errors) {
        console.error('Error fetching audit logs:', errors)
        setLogs([])
      } else {
        // Transform CloudWatch logs to expected format
        const logData = typeof data === 'object' && data !== null ? data : {}
        const transformedLogs = (logData as any)?.logs?.map((log: any, index: number) => ({
          id: log.id || index.toString(),
          timestamp: log.timestamp,
          userId: log.userId || 'unknown',
          action: log.action || 'UNKNOWN',
          command: log.command?.command,
          area: log.command?.area,
          address: log.command?.address,
          value: log.command?.value,
          status: log.result === 'success' ? 'success' : 'error',
          sourceIP: log.sourceIP || 'unknown',
        })) || []
        
        setLogs(transformedLogs)
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error)
      setLogs([])
    } finally {
      setLoading(false)
    }
  }

  const filteredLogs = logs.filter((log: AuditLogEntry) => {
    if (filter === 'all') return true
    return log.status === filter
  })

  const refreshLogs = () => {
    fetchAuditLogs()
  }

  if (loading) {
    return (
      <Card>
        <div className="p-8 text-center">
          <div className="inline-flex items-center">
            <svg className="animate-spin h-6 w-6 text-blue-600 mr-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-gray-600">監査ログを読み込み中...</span>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">監査ログ</h2>
            <Button onClick={refreshLogs} variation="link" size="small">
              更新
            </Button>
          </div>

          {/* Filter Tabs */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setFilter('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === 'all'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                すべて ({logs.length})
              </button>
              <button
                onClick={() => setFilter('success')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === 'success'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                成功 ({logs.filter((l: AuditLogEntry) => l.status === 'success').length})
              </button>
              <button
                onClick={() => setFilter('error')}
                className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === 'error'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                エラー ({logs.filter((l: AuditLogEntry) => l.status === 'error').length})
              </button>
            </nav>
          </div>

          {/* Log Table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    時刻
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ユーザー
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    アクション
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    詳細
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ステータス
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    IPアドレス
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLogs.map((log: AuditLogEntry) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(log.timestamp).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.userId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {log.action}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {log.command && (
                        <span className="font-mono text-xs">
                          {log.command} {log.area}:{log.address}
                          {log.value && ` = ${log.value}`}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.status === 'success' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {log.sourceIP}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredLogs.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              ログが見つかりません
            </div>
          )}
        </div>
      </Card>

      {/* Summary Card */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">ログ統計</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-500">総アクション数</p>
              <p className="text-2xl font-semibold text-gray-900">{logs.length}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-600">成功</p>
              <p className="text-2xl font-semibold text-green-900">
                {logs.filter((l: AuditLogEntry) => l.status === 'success').length}
              </p>
            </div>
            <div className="bg-red-50 rounded-lg p-4">
              <p className="text-sm text-red-600">エラー</p>
              <p className="text-2xl font-semibold text-red-900">
                {logs.filter((l: AuditLogEntry) => l.status === 'error').length}
              </p>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
import { useState } from 'react'
import { Button, Card, Alert, TextField, SelectField } from '@aws-amplify/ui-react'
import { generateClient } from 'aws-amplify/data'
import type { Schema } from '../../amplify/data/resource'

const client = generateClient<Schema>()

interface PlcCommand {
  command: string
  area: string
  address: string
  value: string
}

export default function PLCController() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<PlcCommand>({
    command: 'write',
    area: 'DM',
    address: '31000',
    value: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    
    try {
      console.log('Executing PLC command:', formData)
      
      // Call Lambda function through Amplify Data API
      const { data, errors } = await client.mutations.executePlcCommand({
        command: formData.command,
        value: formData.value,
        area: formData.area,
        address: formData.address,
      })
      
      if (errors) {
        throw new Error(errors.map(e => e.message).join(', '))
      }
      
      setResult(data)
      setLoading(false)
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
      setLoading(false)
    }
  }

  const handleReset = () => {
    setFormData({
      command: 'write',
      area: 'DM',
      address: '31000',
      value: '',
    })
    setResult(null)
    setError(null)
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">PLCコマンド実行</h2>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <SelectField
                  label="コマンド種別"
                  name="command"
                  value={formData.command}
                  onChange={(e) => setFormData({...formData, command: e.target.value})}
                >
                  <option value="write">書き込み (Write)</option>
                  <option value="read">読み込み (Read)</option>
                </SelectField>
              </div>

              <div>
                <SelectField
                  label="エリア種別"
                  name="area"
                  value={formData.area}
                  onChange={(e) => setFormData({...formData, area: e.target.value})}
                >
                  <option value="DM">DM (データメモリ)</option>
                  <option value="HR">HR (保持リレー)</option>
                  <option value="WR">WR (ワークリレー)</option>
                </SelectField>
              </div>

              <div>
                <TextField
                  label="開始アドレス"
                  name="address"
                  type="number"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="例: 31000"
                  required
                />
              </div>

              <div>
                <TextField
                  label="値"
                  name="value"
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  placeholder="書き込む値を入力"
                  required
                />
              </div>
            </div>

            <div className="flex gap-4">
              <Button type="submit" variation="primary" isLoading={loading} isDisabled={loading}>
                実行
              </Button>
              <Button type="button" variation="link" onClick={handleReset}>
                リセット
              </Button>
            </div>
          </form>
        </div>
      </Card>

      {error && (
        <Alert variation="error" isDismissible onDismiss={() => setError(null)}>
          {error}
        </Alert>
      )}

      {result && (
        <Card className="animate-slide-up">
          <div className="p-6">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">実行結果</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                result.status === 'success' 
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                {result.status}
              </span>
            </div>
            
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 overflow-x-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>

            {result.timestamp && (
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">実行時刻:</span>
                  <p className="font-medium text-gray-900">
                    {new Date(result.timestamp).toLocaleString('ja-JP')}
                  </p>
                </div>
                {result.id && (
                  <div>
                    <span className="text-gray-500">コマンドID:</span>
                    <p className="font-mono text-gray-900">{result.id}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Information Card */}
      <Card>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">セキュリティ情報</h3>
          <div className="space-y-3">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">Cognito認証</p>
                <p className="text-sm text-gray-600">クライアントシークレット不要の安全な認証フロー</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">機密情報保護</p>
                <p className="text-sm text-gray-600">PLCアドレス等はParameter Storeで暗号化管理</p>
              </div>
            </div>
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-medium text-gray-900">監査ログ</p>
                <p className="text-sm text-gray-600">全ての操作がCloudWatch Logsに記録されます</p>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
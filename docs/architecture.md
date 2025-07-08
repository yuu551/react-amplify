# PLC Control System アーキテクチャドキュメント

## 概要

このシステムは React + AWS Amplify Gen2 を使用した PLC 制御システムです。
AWS Cognito による認証、AppSync のカスタムクエリ/ミューテーション、Lambda 関数を組み合わせた構成になっています。

## 技術スタック

- **フロントエンド**: React 19 + TypeScript + Tailwind CSS
- **認証**: AWS Cognito User Pool
- **API**: AWS AppSync (カスタムクエリ/ミューテーション)
- **バックエンド**: AWS Lambda
- **ログ管理**: AWS CloudWatch Logs
- **設定管理**: AWS Systems Manager Parameter Store
- **インフラ**: AWS CDK (Amplify Gen2)

## 全体アーキテクチャ

```mermaid
graph TB
    subgraph "Frontend"
        React[React App]
        Auth[Authenticator]
        PLC[PLCController]
        Audit[AuditLog]
    end

    subgraph "AWS Services"
        Cognito[AWS Cognito<br/>User Pool]
        AppSync[AWS AppSync<br/>GraphQL API]
        
        subgraph "Lambda Functions"
            PLCLambda[PLC Command<br/>Lambda]
            AuditLambda[Audit Logger<br/>Lambda]
        end
        
        SSM[Parameter Store<br/>機密設定]
        CWLogs[CloudWatch Logs<br/>監査ログ]
        DDB[DynamoDB<br/>コマンド記録]
    end

    subgraph "External"
        PLCDevice[PLC Device<br/>模擬実装]
    end

    React --> Auth
    Auth --> Cognito
    PLC --> AppSync
    Audit --> AppSync
    
    AppSync --> PLCLambda
    AppSync --> AuditLambda
    
    PLCLambda --> SSM
    PLCLambda --> CWLogs
    PLCLambda --> DDB
    PLCLambda -.-> PLCDevice
    
    AuditLambda --> CWLogs
```

## 1. 認証フロー

```mermaid
sequenceDiagram
    participant User
    participant React
    participant Auth as Amplify Authenticator
    participant Cognito as AWS Cognito

    User->>React: アプリアクセス
    React->>Auth: 認証状態確認
    Auth->>Cognito: ユーザー認証確認
    
    alt 未認証
        Auth->>User: ログイン画面表示
        User->>Auth: 認証情報入力
        Auth->>Cognito: 認証リクエスト<br/>(PKCE フロー)
        Cognito->>Auth: JWT トークン
        Auth->>React: 認証済みユーザー情報
    else 認証済み
        Cognito->>Auth: 有効なトークン
        Auth->>React: 認証済みユーザー情報
    end
    
    React->>User: 認証済みアプリ表示
```

### 認証の特徴
- **PKCE (Proof Key for Code Exchange)**: Amplify内部で自動実装
- **JWT トークン**: AppSync API の認証に使用
- **MFA**: 現在は無効（設定で有効化可能）

## 2. PLC制御フロー

```mermaid
sequenceDiagram
    participant User
    participant PLC as PLCController
    participant AppSync
    participant Lambda as PLC Lambda
    participant SSM as Parameter Store
    participant CWLogs as CloudWatch Logs
    participant PLCDevice as PLC Device

    User->>PLC: コマンド入力<br/>(command, area, address, value)
    PLC->>AppSync: executePlcCommand mutation
    AppSync->>Lambda: ミューテーション実行
    
    Lambda->>SSM: 設定値取得<br/>(PLC IP, MQTT Topic)
    SSM->>Lambda: 設定値返却
    
    Lambda->>PLCDevice: PLC制御コマンド<br/>(現在は模擬実装)
    PLCDevice->>Lambda: 実行結果
    
    Lambda->>CWLogs: 監査ログ記録
    Lambda->>AppSync: 実行結果返却
    AppSync->>PLC: 結果表示
    PLC->>User: 実行完了通知
```

### PLC制御の特徴
- **カスタムミューテーション**: DataStore 未使用、Lambda直接実行
- **設定の暗号化**: Parameter Store で機密情報管理
- **監査ログ**: 全操作をCloudWatch Logsに記録
- **模擬実装**: 実際のPLC通信は未実装（フレームワークのみ）

## 3. 監査ログフロー

```mermaid
sequenceDiagram
    participant User
    participant Audit as AuditLog
    participant AppSync
    participant Lambda as Audit Lambda
    participant CWLogs as CloudWatch Logs

    User->>Audit: ログ表示要求
    Audit->>AppSync: getAuditLogs query<br/>(startTime, endTime, limit)
    AppSync->>Lambda: クエリ実行
    
    Lambda->>CWLogs: ログイベント検索<br/>FilterLogEvents
    CWLogs->>Lambda: ログイベント返却
    
    Lambda->>Lambda: JSON パース<br/>フォーマット変換
    Lambda->>AppSync: 整形済みログデータ
    AppSync->>Audit: ログ一覧表示
    Audit->>User: 監査ログ表示
```

### 監査ログの特徴
- **リアルタイム検索**: CloudWatch Logsから直接取得
- **フィルタリング**: 時間範囲、ステータスでフィルタ可能
- **JSON形式**: 構造化されたログデータ
- **統計情報**: 成功/エラー件数の集計表示

## 4. セキュリティ実装

### 認証・認可
- **Cognito User Pool**: ユーザー管理
- **JWT トークン**: API認証
- **IAM ロール**: Lambda実行権限

### データ保護
- **Parameter Store**: 設定値の暗号化保存
- **VPC**: 本番環境では Lambda を VPC 内に配置予定
- **HTTPS**: 全通信の暗号化

### 監査・ログ
- **CloudWatch Logs**: 全操作の記録
- **ユーザー追跡**: UserId, Email, IP アドレス記録
- **タイムスタンプ**: 全操作の時刻記録

## 5. 本番環境への移行計画

### 現在の状態（PoC環境）
- PLC通信は模擬実装
- ローカル開発環境向け設定
- 基本的なセキュリティ実装

### 本番環境に向けた改善点
1. **実際のPLC通信実装**
   - 使用プロトコル（TCP/IP、Modbus、等）の実装
   - PLC機器との接続テスト

2. **ネットワークセキュリティ強化**
   - Lambda を VPC 内に配置
   - セキュリティグループの適切な設定
   - プライベートサブネットでの PLC 通信

3. **監視・アラート強化**
   - CloudWatch Alarms の設定
   - 異常検知とアラート通知
   - メトリクス監視

4. **可用性向上**
   - Multi-AZ 構成
   - Auto Scaling設定
   - バックアップ戦略

## 6. 運用考慮事項

### ログ管理
- **ログ保持期間**: 現在1ヶ月（要件に応じて調整）
- **ログローテーション**: CloudWatch Logsで自動管理
- **ログ分析**: CloudWatch Insights で詳細分析可能

### コスト最適化
- **Lambda実行時間最適化**: 不要な処理の削減
- **ログストレージ**: 適切な保持期間設定
- **Parameter Store**: Standard tier使用（Advanced tierは必要時のみ）

### パフォーマンス
- **Lambda コールドスタート**: Provisioned Concurrency検討
- **AppSync キャッシュ**: レスポンス時間改善
- **フロントエンド最適化**: React.memo、useMemo活用
# Amplify Gen2 + React によるセキュアなPLC制御システム

## 概要

このプロジェクトは、AWS Amplify Gen2とReact 19を使用したモダンで安全なPLC制御システムの実装例です。
最新のセキュリティベストプラクティスと、エンタープライズグレードの機能を提供します。

## 主要な特徴

### セキュリティ機能
- ✅ **Built-in PKCE**: Amplify Gen2が自動的にPKCE認証を実装
- ✅ **多要素認証（MFA）**: オプションで有効化可能
- ✅ **Parameter Store統合**: 機密情報の暗号化管理
- ✅ **包括的な監査ログ**: CloudWatch Logsによる全操作記録
- ✅ **Type-safe API**: TypeScriptによる型安全なAPI呼び出し

### 技術スタック
- **フロントエンド**: React 19 + TypeScript + Tailwind CSS
- **バックエンド**: AWS Amplify Gen2
- **認証**: Amazon Cognito（PKCE自動実装）
- **API**: AWS AppSync（GraphQL）
- **データ**: AWS DynamoDB
- **関数**: AWS Lambda
- **ホスティング**: AWS Amplify Hosting

## アーキテクチャ

```mermaid
graph TB
    %% User and Frontend
    A[User] --> B[React App<br/>TypeScript + Tailwind]
    B --> C[AWS Amplify Libraries]
    
    %% Authentication Flow
    C --> D[Amazon Cognito<br/>PKCE Auth]
    D --> E[User Pool]
    D --> F[Identity Pool]
    
    %% API Layer
    C --> G[AWS AppSync<br/>GraphQL API]
    G --> H[Custom Resolvers]
    
    %% Lambda Functions
    H --> I[PLC Command Lambda]
    H --> J[Audit Logger Lambda]
    
    %% Data Storage
    I --> K[DynamoDB<br/>Command History]
    I --> L[Parameter Store<br/>Secure Config]
    I --> M[CloudWatch Logs<br/>Audit Trail]
    
    %% PLC Control
    I --> N[PLC System<br/>192.168.x.x]
    
    %% Monitoring
    J --> M
    K --> J
    
    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#61dafb,stroke:#333,stroke-width:2px
    style D fill:#ff9900,stroke:#333,stroke-width:2px
    style G fill:#ff9900,stroke:#333,stroke-width:2px
    style L fill:#00ff00,stroke:#333,stroke-width:2px
```

### シーケンス図

```mermaid
sequenceDiagram
    participant U as User
    participant R as React App
    participant C as Cognito
    participant A as AppSync
    participant L as Lambda
    participant P as PLC
    
    U->>R: Access Application
    R->>C: PKCE Authentication
    C-->>R: JWT Tokens
    R->>A: GraphQL Query/Mutation
    A->>L: Execute Function
    L->>P: Send PLC Command
    P-->>L: Response
    L-->>A: Return Result
    A-->>R: GraphQL Response
    R-->>U: Display Result
```

## セキュリティ強化点

### 従来の問題点からの改善
- ❌ → ✅ クライアントシークレット露出 → PKCE自動実装
- ❌ → ✅ 機密情報のハードコード → Parameter Store暗号化
- ❌ → ✅ 型安全性なし → TypeScriptによる完全な型保証
- ❌ → ✅ 監査ログ不足 → 包括的なCloudWatch Logs統合

## 前提条件

- Node.js 18.x 以上
- AWS CLI がインストールされ、適切な権限で設定済み
- npm または yarn

## セットアップ

### 1. リポジトリのクローン

```bash
git clone https://github.com/yuu551/react-amplify.git
cd react-amplify
```

### 2. 依存関係のインストール

```bash
npm install
```

### 3. 環境設定の更新

`amplify/backend.ts` を編集して、以下の値を実際の環境に合わせて変更してください：

```typescript
// Parameter Store設定
const plcIpParam = new ssm.StringParameter(functionStack, 'PlcIpParameter', {
  parameterName: '/plc/secure/ip-address',
  stringValue: 'YOUR_PLC_IP_ADDRESS', // 実際のPLC IPアドレス
  // ...
});

const mqttTopicParam = new ssm.StringParameter(functionStack, 'MqttTopicParameter', {
  parameterName: '/plc/secure/mqtt-topic',
  stringValue: 'your-mqtt-topic/device/gateway', // 実際のMQTTトピック
  // ...
});
```

### 4. Amplify 環境の設定

```bash
# Amplify CLIのインストール（未インストールの場合）
npm install -g @aws-amplify/cli

# バックエンドのデプロイ
npx ampx sandbox
```

### 5. ローカル開発サーバーの起動

```bash
npm run dev
```

## 使用方法

### 認証フロー

1. アプリケーションにアクセス
2. Amplify Authenticatorコンポーネントで自動的に認証画面表示
3. メールアドレス/パスワードでサインアップ/サインイン
4. 認証完了後、PLC制御画面にアクセス可能

### PLC制御

認証後、以下の操作が可能です：

- **コマンド選択**: read/write
- **エリア選択**: DM/HR/WR
- **アドレス入力**: メモリアドレス
- **値入力**: 書き込み値（writeの場合）

### 監査ログ表示

「監査ログ」タブで以下の情報を確認できます：
- 操作履歴
- ユーザー情報
- タイムスタンプ
- 実行結果

## プロジェクト構造

```
react-amplify/
├── amplify/                    # Amplify Gen2 バックエンド設定
│   ├── auth/                   # Cognito認証設定
│   ├── data/                   # GraphQL API設定
│   ├── functions/              # Lambda関数
│   │   ├── plc-command/        # PLC制御関数
│   │   └── audit-logger/       # 監査ログ取得関数
│   └── backend.ts              # バックエンド統合設定
├── src/                        # React アプリケーション
│   ├── components/             # UIコンポーネント
│   │   ├── AuthenticatedApp.tsx  # 認証後のメインアプリ
│   │   ├── PLCController.tsx     # PLC制御UI
│   │   └── AuditLog.tsx          # 監査ログ表示
│   ├── App.tsx                 # アプリケーションエントリー
│   └── main.tsx                # Viteエントリーポイント
├── docs/                       # ドキュメント
│   └── architecture.md         # 詳細なアーキテクチャ説明
└── README.md                   # このファイル
```

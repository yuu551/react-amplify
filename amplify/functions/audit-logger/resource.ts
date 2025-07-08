import { defineFunction } from '@aws-amplify/backend'

export const auditLoggerFunction = defineFunction({
  name: 'audit-logger-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 256,
  environment: {
    LOG_GROUP_NAME: '/aws/lambda/amplify-react-sandbox-plc-control-audit',
  },
})
import { defineFunction } from '@aws-amplify/backend'

export const plcCommandFunction = defineFunction({
  name: 'plc-command-handler',
  entry: './handler.ts',
  runtime: 20,
  timeoutSeconds: 30,
  memoryMB: 512,
  environment: {
    PARAMETER_STORE_PREFIX: '/amplify-react/sandbox/plc/secure',
    LOG_GROUP_NAME: '/aws/lambda/amplify-react-sandbox-plc-control-audit',
  },
})
import { defineBackend } from '@aws-amplify/backend'
import { auth } from './auth/resource'
import { data } from './data/resource'
import { plcCommandFunction } from './functions/plc-command/resource'
import { auditLoggerFunction } from './functions/audit-logger/resource'
import { Stack } from 'aws-cdk-lib'
import * as ssm from 'aws-cdk-lib/aws-ssm'
import * as logs from 'aws-cdk-lib/aws-logs'

/**
 * @see https://docs.amplify.aws/react/build-a-backend/ to add storage, functions, and more
 */
const backend = defineBackend({
  auth,
  data,
  plcCommandFunction,
  auditLoggerFunction,
})

// Get the underlying CDK stack
const authStack = Stack.of(backend.auth.resources.userPool)
const functionStack = Stack.of(backend.plcCommandFunction.resources.lambda)

// Create CloudWatch Log Group for audit logs
const auditLogGroup = new logs.LogGroup(functionStack, 'PlcAuditLogGroup', {
  logGroupName: '/aws/lambda/plc-control-audit',
  retention: logs.RetentionDays.ONE_MONTH,
})

// Create Parameter Store entries for secure PLC configuration
const plcIpParam = new ssm.StringParameter(functionStack, 'PlcIpParameter', {
  parameterName: '/plc/secure/ip-address',
  stringValue: 'YOUR_PLC_IP_ADDRESS', // Replace with actual PLC IP address
  description: 'PLC IP Address',
  tier: ssm.ParameterTier.STANDARD,
})

const mqttTopicParam = new ssm.StringParameter(functionStack, 'MqttTopicParameter', {
  parameterName: '/plc/secure/mqtt-topic',
  stringValue: 'your-mqtt-topic/device/gateway', // Replace with actual MQTT topic
  description: 'MQTT Topic for PLC commands',
  tier: ssm.ParameterTier.STANDARD,
})

const gatewayIdParam = new ssm.StringParameter(functionStack, 'GatewayIdParameter', {
  parameterName: '/plc/secure/gateway-id',
  stringValue: 'your-gateway-id', // Replace with actual gateway ID
  description: 'Gateway ID',
  tier: ssm.ParameterTier.STANDARD,
})

// Grant Lambda functions permission to read parameters
plcIpParam.grantRead(backend.plcCommandFunction.resources.lambda)
mqttTopicParam.grantRead(backend.plcCommandFunction.resources.lambda)
gatewayIdParam.grantRead(backend.plcCommandFunction.resources.lambda)

// Grant Lambda functions permission to write to CloudWatch Logs
auditLogGroup.grantWrite(backend.plcCommandFunction.resources.lambda)
auditLogGroup.grantRead(backend.auditLoggerFunction.resources.lambda)
import type { Handler } from 'aws-lambda'
import { SSMClient, GetParametersCommand } from '@aws-sdk/client-ssm'
import { CloudWatchLogsClient, PutLogEventsCommand, CreateLogStreamCommand } from '@aws-sdk/client-cloudwatch-logs'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'

const ssmClient = new SSMClient({})
const logsClient = new CloudWatchLogsClient({})
const ddbClient = DynamoDBDocumentClient.from(new DynamoDBClient({}))

interface PlcCommandInput {
  command: string
  value: string
  area?: string
  address?: string
}

interface SecureParameters {
  'ip-address': string
  'mqtt-topic': string
  'gateway-id': string
}

// Get secure parameters from Parameter Store
async function getSecureParameters(): Promise<SecureParameters> {
  const prefix = process.env.PARAMETER_STORE_PREFIX || '/plc/secure'
  
  const command = new GetParametersCommand({
    Names: [
      `${prefix}/ip-address`,
      `${prefix}/mqtt-topic`,
      `${prefix}/gateway-id`,
    ],
    WithDecryption: true,
  })
  
  const response = await ssmClient.send(command)
  const parameters: any = {}
  
  response.Parameters?.forEach((param) => {
    const key = param.Name?.split('/').pop()
    if (key && param.Value) {
      parameters[key] = param.Value
    }
  })
  
  return parameters as SecureParameters
}

// Log audit event to CloudWatch Logs
async function logAuditEvent(eventData: any): Promise<void> {
  const logGroupName = process.env.LOG_GROUP_NAME || '/aws/lambda/plc-control-audit'
  const logStreamName = new Date().toISOString().split('T')[0]
  
  try {
    // Try to create log stream (will fail if already exists, which is fine)
    try {
      await logsClient.send(new CreateLogStreamCommand({
        logGroupName,
        logStreamName,
      }))
    } catch (error: any) {
      // Ignore if stream already exists
      if (error.name !== 'ResourceAlreadyExistsException') {
        throw error
      }
    }
    
    // Put log event
    await logsClient.send(new PutLogEventsCommand({
      logGroupName,
      logStreamName,
      logEvents: [{
        timestamp: Date.now(),
        message: JSON.stringify(eventData),
      }],
    }))
  } catch (error) {
    console.error('Failed to write audit log:', error)
    // Don't fail the main operation if logging fails
  }
}

// Execute PLC command (simulated for demo)
async function executePlcCommand(params: {
  plcIP: string
  topic: string
  gatewayId: string
  userId: string
  command: PlcCommandInput
}): Promise<any> {
  // In a real implementation, this would:
  // 1. Connect to PLC via appropriate protocol
  // 2. Execute the command
  // 3. Return the result
  
  console.log('Executing PLC command:', params)
  
  // Simulate command execution
  return {
    status: 'success',
    timestamp: new Date().toISOString(),
    command: params.command,
    result: {
      value: 'OK',
      message: 'Command executed successfully',
      // In real implementation, actual PLC response would be here
    },
  }
}

export const handler: Handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2))
  
  try {
    // Extract user information from the event
    const userId = event.identity?.username || event.identity?.sub || 'unknown'
    const userEmail = event.identity?.claims?.email || 'unknown'
    const sourceIp = event.identity?.sourceIp || 'unknown'
    
    // Extract command arguments
    const commandInput: PlcCommandInput = event.arguments
    
    // Validate input
    if (!commandInput.command || !commandInput.value) {
      throw new Error('Command and value are required')
    }
    
    // Get secure parameters
    const secureParams = await getSecureParameters()
    
    // Execute PLC command
    const result = await executePlcCommand({
      plcIP: secureParams['ip-address'],
      topic: secureParams['mqtt-topic'],
      gatewayId: secureParams['gateway-id'],
      userId,
      command: commandInput,
    })
    
    // Create command record
    const commandRecord = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      userId,
      timestamp: new Date().toISOString(),
      ...commandInput,
      status: result.status,
      result: result.result,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      owner: userId,
    }
    
    // Save to DynamoDB (table name will be provided by Amplify)
    if (event.request?.headers?.['x-amplify-table']) {
      const tableName = event.request.headers['x-amplify-table']
      await ddbClient.send(new PutCommand({
        TableName: tableName,
        Item: commandRecord,
      }))
    }
    
    // Log audit event
    await logAuditEvent({
      userId,
      userEmail,
      action: 'PLC_COMMAND',
      timestamp: new Date().toISOString(),
      sourceIP: sourceIp,
      command: commandInput,
      result: result.status,
    })
    
    return commandRecord
    
  } catch (error) {
    console.error('Error executing PLC command:', error)
    
    // Log error event
    await logAuditEvent({
      action: 'PLC_COMMAND_ERROR',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      arguments: event.arguments,
    })
    
    throw error
  }
}
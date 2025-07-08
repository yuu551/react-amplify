import type { Handler } from 'aws-lambda'
import { CloudWatchLogsClient, FilterLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs'

const logsClient = new CloudWatchLogsClient({})

interface GetAuditLogsInput {
  startTime?: string
  endTime?: string
  limit?: number
}

export const handler: Handler = async (event) => {
  console.log('Event:', JSON.stringify(event, null, 2))
  
  try {
    // Extract query arguments
    const { startTime, endTime, limit = 100 } = event.arguments as GetAuditLogsInput
    
    const logGroupName = process.env.LOG_GROUP_NAME || '/aws/lambda/plc-control-audit'
    
    // Build filter parameters
    const filterParams: any = {
      logGroupName,
      limit: Math.min(limit, 1000), // Cap at 1000 for safety
    }
    
    if (startTime) {
      filterParams.startTime = new Date(startTime).getTime()
    }
    
    if (endTime) {
      filterParams.endTime = new Date(endTime).getTime()
    }
    
    // Fetch log events
    const command = new FilterLogEventsCommand(filterParams)
    const response = await logsClient.send(command)
    
    // Parse and format log events
    const logs = response.events?.map((event) => {
      try {
        return {
          timestamp: new Date(event.timestamp || 0).toISOString(),
          ...JSON.parse(event.message || '{}'),
        }
      } catch (error) {
        // If message is not JSON, return as is
        return {
          timestamp: new Date(event.timestamp || 0).toISOString(),
          message: event.message,
        }
      }
    }) || []
    
    return {
      logs,
      nextToken: response.nextToken,
      count: logs.length,
    }
    
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    throw error
  }
}
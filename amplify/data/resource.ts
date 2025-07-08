import { type ClientSchema, a, defineData } from '@aws-amplify/backend'
import { plcCommandFunction } from '../functions/plc-command/resource'
import { auditLoggerFunction } from '../functions/audit-logger/resource'

/*== STEP 1 ===============================================================
Simple Lambda function invocation schema without data models.
All data operations are handled within Lambda functions.
=========================================================================*/

const schema = a.schema({
  // Custom mutation to execute PLC commands - returns JSON response
  executePlcCommand: a
    .mutation()
    .arguments({
      command: a.string().required(),
      value: a.string().required(),
      area: a.string(),
      address: a.string(),
    })
    .returns(a.json())
    .handler(a.handler.function(plcCommandFunction))
    .authorization((allow) => [allow.authenticated()]),

  // Custom query to retrieve audit logs - returns JSON response
  getAuditLogs: a
    .query()
    .arguments({
      startTime: a.datetime(),
      endTime: a.datetime(),
      limit: a.integer(),
    })
    .returns(a.json())
    .handler(a.handler.function(auditLoggerFunction))
    .authorization((allow) => [allow.authenticated()]),
})

export type Schema = ClientSchema<typeof schema>

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
})
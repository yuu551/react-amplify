import { Authenticator } from '@aws-amplify/ui-react'
import { Amplify } from 'aws-amplify'
import '@aws-amplify/ui-react/styles.css'
import AuthenticatedApp from './components/AuthenticatedApp'
import outputs from '../amplify_outputs.json'

Amplify.configure(outputs)

function App() {

  return (
    <div className="min-h-screen bg-gray-50">
      <Authenticator
        components={{
          Header() {
            return (
              <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900">
                  PLC Control System
                </h1>
                <p className="mt-2 text-gray-600">
                  React + Amplify Gen2 + Cognito認証
                </p>
              </div>
            )
          },
        }}
      >
        {({ signOut, user }) => (
          <AuthenticatedApp user={user} signOut={signOut} />
        )}
      </Authenticator>
    </div>
  )
}

export default App
import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { SuiClientProvider, WalletProvider } from '@onelabs/dapp-kit'
import { networkConfig } from './networkConfig'
import { pixelCatLightTheme, pixelCatDarkTheme } from './themes/pixelCatTheme'
import '@onelabs/dapp-kit/dist/index.css'
import App from './App.jsx'
import './styles/App.css'

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider 
          autoConnect
          theme={[
            {
              // Default to light pixel-art theme
              variables: pixelCatLightTheme,
            },
            {
              // Dark theme for users with dark mode preference
              mediaQuery: '(prefers-color-scheme: dark)',
              variables: pixelCatDarkTheme,
            },
          ]}
        >
          <App />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)

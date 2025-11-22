import { useState, useEffect } from 'react';
import { oneWalletClient } from '../utils/oneWallet.js';
import { getCATCoinBalance } from '../utils/blockchainGameState.js';
import { syncBlockchainState } from '../utils/onechainBlockchainUtils.js';
import '../styles/WalletConnection.css';

function WalletConnection() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState('0');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkConnection();
    
    // Set up event listeners
    if (window.ethereum || window.onewallet) {
      const provider = window.onewallet || window.ethereum;
      provider.on('accountsChanged', handleAccountsChanged);
      provider.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum || window.onewallet) {
        const provider = window.onewallet || window.ethereum;
        provider.removeListener('accountsChanged', handleAccountsChanged);
        provider.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (account) {
      loadBalance();
      const interval = setInterval(loadBalance, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [account]);

  const checkConnection = async () => {
    if (oneWalletClient.isWalletConnected()) {
      const addr = oneWalletClient.getAccount();
      setAccount(addr);
    }
  };

  const handleAccountsChanged = (accounts) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
    }
  };

  const handleChainChanged = (chainId) => {
    // Reload page when chain changes
    window.location.reload();
  };

  const loadBalance = async () => {
    if (account) {
      try {
        const bal = await getCATCoinBalance();
        setBalance(parseFloat(bal).toFixed(2));
      } catch (error) {
        console.error('Error loading balance:', error);
      }
    }
  };

  const connectWallet = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const addr = await oneWalletClient.connect();
      setAccount(addr);
      
      // Sync blockchain state
      await syncBlockchainState();
      
      // Dispatch event for other components
      window.dispatchEvent(new CustomEvent('walletConnected', { detail: { address: addr } }));
    } catch (error) {
      console.error('Error connecting wallet:', error);
      
      // Extract error message from various formats
      let errorMessage = 'Failed to connect wallet';
      
      if (error) {
        if (error.message) {
          errorMessage = error.message;
        } else if (error.toString && typeof error.toString === 'function') {
          const errorStr = error.toString();
          // Extract meaningful part from error string
          if (errorStr.includes('Error:')) {
            errorMessage = errorStr.split('Error:')[1]?.trim() || errorMessage;
          } else if (errorStr !== '[object Object]') {
            errorMessage = errorStr;
          }
        } else if (typeof error === 'string') {
          errorMessage = error;
        } else if (error.code) {
          errorMessage = `Error ${error.code}: ${error.message || 'Unknown error'}`;
        }
      }
      
      // Handle specific error cases
      if (errorMessage.includes('user rejected') || errorMessage.includes('User rejected')) {
        errorMessage = 'Connection cancelled by user';
      } else if (errorMessage.includes('permission') || errorMessage.includes('Permission') || errorMessage.includes('viewAccount') || errorMessage.includes('suggestTransaction')) {
        errorMessage = '⚠️ Permission popup not approved!\n\nPlease:\n1. Check your browser toolbar for the OneChain wallet extension icon\n2. Click on the extension icon (it may have a notification badge)\n3. Approve the permission request in the popup\n4. Click "Connect" again';
      } else if (errorMessage.includes('not found') || errorMessage.includes('not installed')) {
        errorMessage = 'OneChain Wallet not found. Please install the wallet extension.';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    oneWalletClient.disconnect();
    setAccount(null);
    setBalance('0');
    setError(null);
    
    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('walletDisconnected'));
  };

  const formatAddress = (addr) => {
    if (!addr) return '';
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <div className="wallet-connection">
      {account ? (
        <div className="wallet-info">
          <div className="wallet-address" title={account}>
            {formatAddress(account)}
          </div>
          <div className="wallet-balance">
            {balance} CAT
          </div>
          <button 
            onClick={disconnectWallet} 
            className="disconnect-btn"
            disabled={loading}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div className="wallet-connect-container">
          <button 
            onClick={connectWallet} 
            className="connect-btn"
            disabled={loading}
          >
            {loading ? 'Connecting...' : 'Connect OneWallet'}
          </button>
      {error && (
        <div className="wallet-error" style={{ whiteSpace: 'pre-line' }}>
          {error}
        </div>
      )}
        </div>
      )}
    </div>
  );
}

export default WalletConnection;


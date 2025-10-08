import React, { useState, useEffect } from 'react';
import SignalRManager, { ConnectionState, ErrorCategory } from '../utils/signalRManager';

interface ConnectionStatusProps {
  className?: string;
  showDetails?: boolean;
  onReconnect?: () => void;
}

interface StatusDisplay {
  icon: string;
  text: string;
  color: string;
  showReconnectButton: boolean;
}

const ConnectionStatus: React.FC<ConnectionStatusProps> = ({ 
  className = '', 
  showDetails = false,
  onReconnect 
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.Disconnected);
  const [lastError, setLastError] = useState<string | undefined>();
  const [retryCount, setRetryCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const manager = SignalRManager.getInstance();
    
    // Set initial state
    const connectionInfo = manager.getConnectionInfo();
    setConnectionState(connectionInfo.state);
    setLastError(connectionInfo.error);
    setRetryCount(connectionInfo.retryCount);
    setIsOnline(connectionInfo.isOnline);

    // Listen for connection state changes
    const handleConnectionStateChanged = (state: ConnectionState, error?: string) => {
      setConnectionState(state);
      setLastError(error);
      setRetryCount(manager.getRetryCount());
    };

    // Set up event handler
    manager.setEventHandlers({
      onConnectionStateChanged: handleConnectionStateChanged
    });

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getStatusDisplay = (): StatusDisplay => {
    if (!isOnline) {
      return {
        icon: '📡',
        text: 'İnternet Bağlantısı Yoxdur',
        color: 'text-red-600',
        showReconnectButton: false
      };
    }

    switch (connectionState) {
      case ConnectionState.Connected:
        return {
          icon: '🟢',
          text: 'Bağlantı Aktiv',
          color: 'text-green-600',
          showReconnectButton: false
        };

      case ConnectionState.Connecting:
        return {
          icon: '🟡',
          text: 'Bağlanır...',
          color: 'text-yellow-600',
          showReconnectButton: false
        };

      case ConnectionState.Reconnecting:
        return {
          icon: '🟡',
          text: `Bağlantı Kəsildi - Yenidən bağlanır... (${retryCount}/5)`,
          color: 'text-yellow-600',
          showReconnectButton: false
        };

      case ConnectionState.Failed:
        return {
          icon: '🔴',
          text: 'Bağlantı Uğursuz',
          color: 'text-red-600',
          showReconnectButton: true
        };

      case ConnectionState.Disconnected:
      default:
        return {
          icon: '⚪',
          text: 'Bağlantı Kəsildi',
          color: 'text-gray-600',
          showReconnectButton: true
        };
    }
  };

  const handleReconnect = async () => {
    try {
      const manager = SignalRManager.getInstance();
      await manager.reconnect();
      onReconnect?.();
    } catch (error) {
      console.error('Manual reconnect failed:', error);
    }
  };

  const getErrorCategoryText = (error?: string): string => {
    if (!error) return '';
    
    const errorLower = error.toLowerCase();
    
    if (errorLower.includes('network') || errorLower.includes('offline') || errorLower.includes('timeout')) {
      return 'Şəbəkə Xətası';
    }
    
    if (errorLower.includes('unauthorized') || errorLower.includes('forbidden') || errorLower.includes('token')) {
      return 'Autentifikasiya Xətası';
    }
    
    if (errorLower.includes('500') || errorLower.includes('503') || errorLower.includes('server')) {
      return 'Server Xətası';
    }
    
    return 'Naməlum Xəta';
  };

  const status = getStatusDisplay();

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {/* Status Icon and Text */}
      <div className="flex items-center space-x-2">
        <span className="text-lg">{status.icon}</span>
        <span className={`text-sm font-medium ${status.color}`}>
          {status.text}
        </span>
      </div>

      {/* Reconnect Button */}
      {status.showReconnectButton && (
        <button
          onClick={handleReconnect}
          className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          disabled={!isOnline}
        >
          Yenidən Cəhd Et
        </button>
      )}

      {/* Detailed Information */}
      {showDetails && (
        <div className="text-xs text-gray-500 ml-2">
          {lastError && (
            <div className="mb-1">
              <span className="font-medium">Xəta:</span> {getErrorCategoryText(lastError)}
            </div>
          )}
          {retryCount > 0 && (
            <div>
              <span className="font-medium">Cəhd:</span> {retryCount}/5
            </div>
          )}
          <div>
            <span className="font-medium">Status:</span> {isOnline ? 'Onlayn' : 'Offlayn'}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;

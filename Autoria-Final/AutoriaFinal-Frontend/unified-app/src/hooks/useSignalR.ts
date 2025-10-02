import { useEffect, useRef, useState } from 'react';
import * as signalR from '@microsoft/signalr';

interface SignalRConfig {
  baseUrl: string;
  token: string;
}

interface AuctionEvents {
  onPriceUpdated: (data: { auctionCarId: string; newPrice: number; bidCount: number }) => void;
  onBidPlaced: (data: { auctionCarId: string; bid: any }) => void;
  onCarMoved: (data: { previousCarId: string; nextCarId: string; nextLot: string }) => void;
  onTimerTick: (data: { auctionCarId: string; remainingSeconds: number }) => void;
  onAuctionStarted: (data: { auctionId: string }) => void;
  onAuctionStopped: (data: { auctionId: string }) => void;
  // New events according to backend logic
  onNewLiveBid: (data: { auctionCarId: string; bid: any }) => void;
  onPreBidPlaced: (data: { auctionCarId: string; bid: any }) => void;
  onHighestBidUpdated: (data: { auctionCarId: string; highestBid: any }) => void;
  onAuctionTimerReset: (data: { auctionCarId: string; newTimerSeconds: number }) => void;
  onAuctionExtended: (data: { auctionId: string; extensionMinutes: number }) => void;
  onAuctionEnded: (data: { auctionId: string; winner: any; finalPrice: number }) => void;
}

interface ConnectionState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  error: string | null;
}

export const useSignalR = (config: SignalRConfig, events: AuctionEvents) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    error: null
  });

  const auctionHubRef = useRef<signalR.HubConnection | null>(null);
  const bidHubRef = useRef<signalR.HubConnection | null>(null);
  const isConnectingRef = useRef<boolean>(false);
  const retryCountRef = useRef<number>(0);
  const maxRetries = 5;

  const connect = async (auctionId: string, auctionCarId?: string) => {
    // Prevent multiple simultaneous connections
    if (isConnectingRef.current || connectionState.isConnected) {
      console.log('Connection already in progress or connected, skipping...');
      return;
    }

    isConnectingRef.current = true;
    setConnectionState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      console.log('Starting SignalR connection...', { auctionId, auctionCarId });

      // Disconnect existing connections first
      await disconnect();

      // Connect to Auction Hub
      const auctionConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${config.baseUrl}/auctionHub`, {
          accessTokenFactory: () => {
            console.log('Getting token for SignalR:', config.token ? 'Token available' : 'No token');
            return config.token;
          },
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount < 3) {
              return 2000; // 2 seconds
            } else if (retryContext.previousRetryCount < 10) {
              return 10000; // 10 seconds
            } else {
              return 30000; // 30 seconds
            }
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Connect to Bid Hub
      const bidConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${config.baseUrl}/bidHub`, {
          accessTokenFactory: () => {
            console.log('Getting token for BidHub:', config.token ? 'Token available' : 'No token');
            return config.token;
          },
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect({
          nextRetryDelayInMilliseconds: (retryContext) => {
            if (retryContext.previousRetryCount < 3) {
              return 2000;
            } else if (retryContext.previousRetryCount < 10) {
              return 10000;
            } else {
              return 30000;
            }
          }
        })
        .configureLogging(signalR.LogLevel.Information)
        .build();

      // Set up event handlers for Auction Hub
      auctionConnection.on('AuctionStarted', events.onAuctionStarted);
      auctionConnection.on('AuctionStopped', events.onAuctionStopped);
      auctionConnection.on('AuctionEnded', events.onAuctionEnded);
      auctionConnection.on('AuctionExtended', events.onAuctionExtended);
      auctionConnection.on('CarMoved', events.onCarMoved);
      auctionConnection.on('TimerTick', events.onTimerTick);
      auctionConnection.on('AuctionTimerReset', events.onAuctionTimerReset);

      // Set up event handlers for Bid Hub
      bidConnection.on('BidPlaced', events.onBidPlaced);
      bidConnection.on('PriceUpdated', events.onPriceUpdated);
      bidConnection.on('NewLiveBid', events.onNewLiveBid);
      bidConnection.on('PreBidPlaced', events.onPreBidPlaced);
      bidConnection.on('HighestBidUpdated', events.onHighestBidUpdated);

      // Handle connection state changes
      auctionConnection.onclose((error) => {
        console.log('AuctionHub connection closed:', error);
        if (error) {
          setConnectionState(prev => ({ 
            ...prev, 
            isConnected: false, 
            isConnecting: false,
            error: error.message 
          }));
        }
      });

      bidConnection.onclose((error) => {
        console.log('BidHub connection closed:', error);
        if (error) {
          setConnectionState(prev => ({ 
            ...prev, 
            isConnected: false, 
            isConnecting: false,
            error: error.message 
          }));
        }
      });

      // Start connections with retry logic
      console.log('Starting AuctionHub connection...');
      await auctionConnection.start();
      console.log('AuctionHub connected successfully');

      console.log('Starting BidHub connection...');
      await bidConnection.start();
      console.log('BidHub connected successfully');

      // Join auction room - AuctionHub.JoinAuction(auctionId)
      console.log('Joining auction:', auctionId);
      await auctionConnection.invoke('JoinAuction', auctionId);
      console.log('Successfully joined auction:', auctionId);
      
      // Join auction car room - BidHub.JoinAuctionCar(auctionCarId)
      if (auctionCarId) {
        console.log('Joining auction car:', auctionCarId);
        await bidConnection.invoke('JoinAuctionCar', auctionCarId);
        console.log('Successfully joined auction car:', auctionCarId);
      }

      auctionHubRef.current = auctionConnection;
      bidHubRef.current = bidConnection;

      setConnectionState({
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        error: null
      });

      retryCountRef.current = 0; // Reset retry count on successful connection
      console.log('SignalR connection established successfully');

    } catch (error) {
      console.error('SignalR connection failed:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      // Check if it's a connection refused error
      if (errorMessage.includes('ERR_CONNECTION_REFUSED') || errorMessage.includes('Failed to fetch')) {
        retryCountRef.current++;
        
        if (retryCountRef.current < maxRetries) {
          const delay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
          console.log(`Connection failed, retrying in ${delay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
          
          setTimeout(() => {
            isConnectingRef.current = false;
            connect(auctionId, auctionCarId);
          }, delay);
          
          return;
        }
      }
      
      setConnectionState(prev => ({
        ...prev,
        isConnected: false,
        isConnecting: false,
        error: errorMessage
      }));
    } finally {
      isConnectingRef.current = false;
    }
  };

  const disconnect = async () => {
    console.log('Disconnecting SignalR...');
    
    try {
      if (auctionHubRef.current) {
        console.log('Stopping AuctionHub...');
        await auctionHubRef.current.stop();
        auctionHubRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping AuctionHub:', error);
    }
    
    try {
      if (bidHubRef.current) {
        console.log('Stopping BidHub...');
        await bidHubRef.current.stop();
        bidHubRef.current = null;
      }
    } catch (error) {
      console.error('Error stopping BidHub:', error);
    }
    
    isConnectingRef.current = false;
    setConnectionState({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      error: null
    });
    
    console.log('SignalR disconnected');
  };

  const sendBid = async (auctionCarId: string, amount: number, isProxy = false) => {
    if (bidHubRef.current && connectionState.isConnected) {
      try {
        await bidHubRef.current.invoke('PlaceBid', {
          auctionCarId,
          amount,
          isProxy
        });
      } catch (error) {
        console.error('Failed to send bid:', error);
        throw error;
      }
    } else {
      throw new Error('Not connected to SignalR');
    }
  };

  // Bid functionality according to backend logic
  const placePreBid = async (auctionCarId: string, amount: number) => {
    if (bidHubRef.current && connectionState.isConnected) {
      try {
        await bidHubRef.current.invoke('PlacePreBid', {
          auctionCarId,
          amount
        });
      } catch (error) {
        console.error('Failed to place pre-bid:', error);
        throw error;
      }
    } else {
      throw new Error('Not connected to SignalR');
    }
  };

  const placeLiveBid = async (auctionCarId: string, amount: number) => {
    if (bidHubRef.current && connectionState.isConnected) {
      try {
        await bidHubRef.current.invoke('PlaceLiveBid', {
          auctionCarId,
          amount
        });
      } catch (error) {
        console.error('Failed to place live bid:', error);
        throw error;
      }
    } else {
      throw new Error('Not connected to SignalR');
    }
  };

  const placeProxyBid = async (auctionCarId: string, maxAmount: number, incrementAmount: number) => {
    if (bidHubRef.current && connectionState.isConnected) {
      try {
        await bidHubRef.current.invoke('PlaceProxyBid', {
          auctionCarId,
          maxAmount,
          incrementAmount
        });
      } catch (error) {
        console.error('Failed to place proxy bid:', error);
        throw error;
      }
    } else {
      throw new Error('Not connected to SignalR');
    }
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  return {
    ...connectionState,
    connect,
    disconnect,
    sendBid,
    placePreBid,
    placeLiveBid,
    placeProxyBid
  };
};

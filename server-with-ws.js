// server.js - Next.js server with WebSocket support
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { WebSocketServer } = require('ws');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = process.env.PORT || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

let wss = null;
const connectedClients = new Map();

function setupWebSocketServer(server) {
  wss = new WebSocketServer({ server });
  
  wss.on('connection', (ws, req) => {
    const { query } = parse(req.url, true);
    const broadcasterId = query.broadcasterId;
    
    if (broadcasterId) {
      ws.broadcasterId = broadcasterId;
      ws.isAlive = true;
      connectedClients.set(ws, broadcasterId);
      
      console.log(`🔗 Frontend connected for broadcaster ${broadcasterId}`);
      
      ws.send(JSON.stringify({
        type: 'connection',
        status: 'connected',
        message: 'Successfully connected to alert stream',
        timestamp: new Date().toISOString(),
      }));
    } else {
      console.log('❌ Invalid WebSocket connection - no broadcasterId found');
      ws.close(1008, 'Invalid connection parameters');
      return;
    }
    
    ws.on('pong', () => {
      ws.isAlive = true;
    });
    
    ws.on('close', () => {
      connectedClients.delete(ws);
      console.log(`🔌 WebSocket disconnected for ${broadcasterId}`);
    });
    
    ws.on('error', (error) => {
      console.error(`❌ WebSocket error for ${broadcasterId}:`, error);
      connectedClients.delete(ws);
    });
  });
  
  // Heartbeat
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.isAlive === false) {
        connectedClients.delete(ws);
        return ws.terminate();
      }
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
  
  wss.on('close', () => {
    clearInterval(interval);
  });
  
  console.log('🔌 WebSocket server initialized');
}

// Global broadcast function for worker
global.broadcastAlert = function(alert) {
  if (!wss) {
    console.log('⚠️ WebSocket server not initialized, skipping broadcast');
    return;
  }
  
  let sentCount = 0;
  let matchedClients = 0;
  
  wss.clients.forEach((ws) => {
    if (String(ws.broadcasterId) === alert.broadcasterId) {
      matchedClients++;
      if (ws.readyState === ws.OPEN) {
        try {
          ws.send(JSON.stringify(alert));
          sentCount++;
        } catch (error) {
          console.error('🚨 Error sending to client:', error);
        }
      }
    }
  });
  
  console.log(`📡 Alert broadcast: ${sentCount}/${matchedClients} clients reached`);
};

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      await handle(req, res, parse(req.url, true));
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });
  
  // Setup WebSocket on the same server
  setupWebSocketServer(server);
  
  server.listen(port, (err) => {
    if (err) throw err;
    console.log(`🚀 Next.js server with WebSocket ready on http://${hostname}:${port}`);
  });
});
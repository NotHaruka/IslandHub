import { ClientMessage, ServerMessage } from '../types/networking';
import { IslandPlayer } from '../types/island';

type ServerMessageHandler = (msg: ServerMessage) => void;

export class NetworkClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: Set<ServerMessageHandler> = new Set();
  public isConnected: boolean = false;
  private reconnectTimer: any = null;
  private username: string = 'Explorer';
  private avatar: IslandPlayer['avatar'] = { bodyColor: '#3b82f6', hat: 'none', skin: 'human', accessory: 'none' };

  constructor() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    this.url = `${protocol}//${host}/ws`;
  }

  public connect(username?: string, avatar?: IslandPlayer['avatar']) {
    if (username) this.username = username;
    if (avatar) this.avatar = avatar;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);

        // Auto join island upon connect
        this.send({
          type: 'join_island',
          username: this.username,
          avatar: this.avatar,
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg: ServerMessage = JSON.parse(event.data);
          this.handlers.forEach((h) => h(msg));
        } catch (e) {
          console.error('Failed to parse server message:', e);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket connection error:', err);
        this.ws?.close();
      };
    } catch (e) {
      console.error('Error establishing WebSocket:', e);
      this.scheduleReconnect();
    }
  }

  public updateProfile(username: string, avatar: IslandPlayer['avatar']) {
    this.username = username;
    this.avatar = avatar;
    this.send({ type: 'update_profile', username, avatar });
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, 3000);
  }

  public subscribe(handler: ServerMessageHandler) {
    this.handlers.add(handler);
    return () => {
      this.handlers.delete(handler);
    };
  }

  public send(msg: ClientMessage) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  // Method shortcuts
  public moveIsland(x: number, y: number, vx: number, vy: number, facing: IslandPlayer['facing']) {
    this.send({ type: 'move_island', x, y, vx, vy, facing });
  }

  public sendChat(text: string, channel: 'nearby' | 'global' = 'nearby') {
    this.send({ type: 'chat_msg', text, channel });
  }

  public sendEmote(emote: any) {
    this.send({ type: 'emote', emote });
  }

  public createRoom(gameId: string, name: string, maxPlayers: number, autoStart?: boolean) {
    this.send({ type: 'create_room', gameId, name, maxPlayers, autoStart });
  }

  public joinRoom(roomId: string) {
    this.send({ type: 'join_room', roomId });
  }

  public leaveRoom() {
    this.send({ type: 'leave_room' });
  }

  public toggleReady(weapon?: any) {
    this.send({ type: 'toggle_ready', weapon });
  }

  public selectWeapon(weapon: any) {
    this.send({ type: 'select_weapon', weapon });
  }

  public startGame() {
    this.send({ type: 'start_game' });
  }

  public sendVhInput(x: number, y: number, vx: number, vy: number, shooting: boolean, aimAngle: number) {
    this.send({ type: 'vh_player_input', x, y, vx, vy, shooting, aimAngle });
  }

  public selectUpgrade(upgradeId: string) {
    this.send({ type: 'vh_select_upgrade', upgradeId });
  }

  public returnToIsland() {
    this.send({ type: 'return_to_island' });
  }
}

export const networkClient = new NetworkClient();

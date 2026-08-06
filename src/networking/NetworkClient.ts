import { ClientMessage, ServerMessage } from '../types/networking';
import { IslandPlayer } from '../types/island';
import { StructureType, WeaponType } from '../types/voidHorde';

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

        // Join unified island state
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
  public sendIslandInput(
    x: number,
    y: number,
    vx: number,
    vy: number,
    facing: IslandPlayer['facing'],
    shooting: boolean,
    aimAngle: number
  ) {
    this.send({ type: 'island_input', x, y, vx, vy, facing, shooting, aimAngle });
  }

  public sendChat(text: string, channel: 'nearby' | 'global' = 'nearby') {
    this.send({ type: 'chat_msg', text, channel });
  }

  public sendEmote(emote: any) {
    this.send({ type: 'emote', emote });
  }

  public buildStructure(padId: string, structureType: StructureType) {
    this.send({ type: 'build_structure', padId, structureType });
  }

  public upgradeStructure(structureId: string) {
    this.send({ type: 'upgrade_structure', structureId });
  }

  public repairStructure(structureId: string) {
    this.send({ type: 'repair_structure', structureId });
  }

  public upgradeCore(upgradeType: 'health' | 'shield' | 'turret') {
    this.send({ type: 'upgrade_core', upgradeType });
  }

  public buyWeapon(weapon: WeaponType) {
    this.send({ type: 'buy_weapon', weapon });
  }

  public triggerNextWave() {
    this.send({ type: 'trigger_next_wave' });
  }

  public revivePlayer(targetPlayerId: string) {
    this.send({ type: 'revive_player', targetPlayerId });
  }

  public pingLocation(x: number, y: number, pingType: 'help' | 'defend' | 'build' | 'resource') {
    this.send({ type: 'ping_location', x, y, pingType });
  }

  public collectResource(resourceId: string) {
    this.send({ type: 'collect_resource', resourceId });
  }

  public restartGame() {
    this.send({ type: 'restart_game' });
  }
}

export const networkClient = new NetworkClient();

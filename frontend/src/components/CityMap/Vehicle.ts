import { Container, Graphics, Text } from 'pixi.js';
import type { Packet } from '../../types/packet';

export class Vehicle {
  public sprite: Container;
  public packet: Packet;
  public route: { x: number; y: number }[];
  public currentSegment: number = 0;
  public speed: number = 2;
  public isComplete: boolean = false;
  public hasDropped: boolean = false;
  
  private onSelect: (p: Packet) => void;
  private isGhost: boolean;

  constructor(
    packet: Packet, 
    route: { id?: string; x: number; y: number }[], 
    parentContainer: Container, 
    onSelect: (p: Packet) => void, 
    isGhost: boolean = false
  ) {
    this.packet = packet;
    this.onSelect = onSelect;
    this.isGhost = isGhost;
    
    const HIGHWAY_NODES = new Set(['house', 'signal_1', 'toll_gate', 'isp_highway', 'destination']);
    const latOffset = (Math.random() - 0.5) * 160; // ±80px spread
    const baseOffset = packet.direction === 'request' ? 110 : -110; // New lane centers

    this.route = route.map((node) => {
       if (node.id && HIGHWAY_NODES.has(node.id)) {
           return { x: node.x, y: node.y + baseOffset + latOffset };
       }
       return { x: node.x + (latOffset / 2), y: node.y + (latOffset / 2) };
    });
    
    this.sprite = new Container();
    this.drawShape();
    
    this.sprite.eventMode = 'static';
    this.sprite.cursor = 'pointer';
    this.sprite.on('pointerdown', () => {
      this.onSelect(this.packet);
    });

    if (this.route.length > 0) {
      this.sprite.x = this.route[0].x;
      this.sprite.y = this.route[0].y;
    }

    const latencyFactor = Math.max(10, packet.latency_ms) / 50;
    this.speed = 0.5 / latencyFactor;
    this.speed = Math.max(0.2, Math.min(this.speed, 2));

    parentContainer.addChild(this.sprite);
  }

  private drawShape() {
    const bgGraphics = new Graphics();
    
    // Draw anomaly warning aura
    if (this.packet.anomaly_type && !this.isGhost) {
       bgGraphics.setStrokeStyle({ width: 6, color: 0xff006e, alpha: 0.6 });
       bgGraphics.circle(0, 0, 24).stroke(); // Larger aura
       // Warning exclamation mark
       bgGraphics.moveTo(0, -14).lineTo(0, -6).stroke({ width: 3, color: 0xff006e });
       bgGraphics.circle(0, 0, 2).fill(0xff006e);
    }
    this.sprite.addChild(bgGraphics);

    let emoji = '📦';
    switch (this.packet.vehicle_type) {
      case 'courier_van': emoji = '🚐'; break;
      case 'bus': emoji = '🚌'; break;
      case 'bike': emoji = '🚲'; break;
      case 'armored_truck': emoji = '🚛'; break;
      case 'heavy_truck': emoji = '🚚'; break;
      case 'train': emoji = '🚆'; break;
      case 'motorbike': emoji = '🏍️'; break;
    }

    const text = new Text({
       text: emoji,
       style: {
          fontSize: 32, // Increased from 16 to 32
       }
    });
    text.anchor.set(0.5);
    if (this.isGhost) text.alpha = 0.4;
    
    this.sprite.addChild(text);
  }

  update(delta: number) {
    if (this.isComplete || this.route.length < 2) return;

    // Check dropped status
    if (this.packet.status === 'dropped' && this.currentSegment >= 2 && !this.hasDropped) {
       if (Math.random() < 0.02) {
           this.hasDropped = true;
           this.sprite.children.forEach((c: any) => { if ('tint' in c) c.tint = 0xff0000; });
           this.sprite.alpha = 0.5;
           setTimeout(() => this.destroy(), 300);
           this.isComplete = true;
           return;
       }
    }

    const target = this.route[this.currentSegment + 1];
    if (!target) {
      this.completeJourney();
      return;
    }

    const dx = target.x - this.sprite.x;
    const dy = target.y - this.sprite.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < this.speed * delta) {
      this.sprite.x = target.x;
      this.sprite.y = target.y;
      this.currentSegment++;
      
      if (this.currentSegment >= this.route.length - 1) {
        this.completeJourney();
      } else if (this.packet.status === 'blocked' && this.currentSegment === this.route.length - 2) {
        this.sprite.children.forEach((c: any) => { if ('tint' in c) c.tint = 0xff0000; });
        setTimeout(() => this.destroy(), 2000);
        this.isComplete = true;
      }
    } else {
      this.sprite.x += (dx / dist) * this.speed * delta;
      this.sprite.y += (dy / dist) * this.speed * delta;
      this.sprite.rotation = Math.atan2(dy, dx);
    }
  }

  private completeJourney() {
    this.isComplete = true;
    this.sprite.alpha = 0.5;
    setTimeout(() => this.destroy(), 500);
  }

  destroy() {
    this.isComplete = true;
    if (this.sprite && !this.sprite.destroyed) {
      this.sprite.destroy({ children: true });
    }
  }
}

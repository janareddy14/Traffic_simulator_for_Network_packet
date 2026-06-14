import { Application, Container, Graphics, Text } from 'pixi.js';
import { ROUTE_NODES } from '../../lib/constants';

export class MapRenderer {
  public app: Application;
  public mapContainer: Container;
  public pathsContainer: Container;
  public landmarksContainer: Container;
  public bgGraphics: Graphics;
  public outboundGlow: Graphics;
  public inboundGlow: Graphics;
  public chevronsContainer: Container;

  private width: number = 0;
  private height: number = 0;
  private hwWidth: number = 0;

  constructor(app: Application) {
    this.app = app;
    this.mapContainer = new Container();

    this.bgGraphics = new Graphics();
    this.pathsContainer = new Container();
    this.landmarksContainer = new Container();
    this.outboundGlow = new Graphics();
    this.inboundGlow = new Graphics();
    this.chevronsContainer = new Container();

    this.mapContainer.addChild(this.bgGraphics);
    this.mapContainer.addChild(this.pathsContainer);
    this.mapContainer.addChild(this.landmarksContainer);

    this.app.stage.addChild(this.mapContainer);
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.drawBackground();
    this.drawPaths();
    this.drawLandmarks();
  }

  getNodePosition(nodeId: string): { id: string; x: number; y: number } {
    const node = ROUTE_NODES.find((n) => n.id === nodeId);
    if (!node) return { id: nodeId, x: 0, y: 0 };
    return {
      id: nodeId,
      x: (node.x / 100) * this.width,
      y: (node.y / 100) * this.height,
    };
  }

  getRoutePath(route: string[]): { id: string; x: number; y: number }[] {
    return route.map((id) => this.getNodePosition(id));
  }

  private drawBackground() {
    this.bgGraphics.clear();
    // Subtle grid
    this.bgGraphics.setStrokeStyle({ width: 1, color: 0x00d4ff, alpha: 0.05 });

    for (let x = 0; x < this.width; x += 40) {
      this.bgGraphics.moveTo(x, 0).lineTo(x, this.height);
    }
    for (let y = 0; y < this.height; y += 40) {
      this.bgGraphics.moveTo(0, y).lineTo(this.width, y);
    }
    this.bgGraphics.stroke();
  }

  private drawPaths() {
    this.pathsContainer.removeChildren();

    const housePos = this.getNodePosition('house');
    const destPos = this.getNodePosition('destination');
    const hwStartX = housePos.x;
    const hwEndX = destPos.x;
    const hwY = housePos.y; // 50%
    this.hwWidth = hwEndX - hwStartX;

    // Draw Spurs FIRST (underneath highway)
    const drawSpur = (fromId: string, toId: string) => {
      const p1 = this.getNodePosition(fromId);
      const p2 = this.getNodePosition(toId);
      const spur = new Graphics();
      spur.setStrokeStyle({ width: 40, color: 0x1a1c23 });
      spur.moveTo(p1.x, p1.y).lineTo(p2.x, p2.y).stroke();
      
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      spur.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.4 });
      for (let d = 0; d < dist; d += 40) {
         const w = Math.min(20, dist - d);
         const startX = p1.x + (dx/dist)*d;
         const startY = p1.y + (dy/dist)*d;
         const endX = p1.x + (dx/dist)*(d+w);
         const endY = p1.y + (dy/dist)*(d+w);
         spur.moveTo(startX, startY).lineTo(endX, endY);
      }
      spur.stroke();
      this.pathsContainer.addChild(spur);
    };
    
    drawSpur('signal_1', 'address_office');
    drawSpur('isp_highway', 'warehouse_cdn');

    // Main Highway Container
    const highway = new Container();
    highway.x = hwStartX;
    highway.y = hwY;

    // 1. Drop shadow
    const shadow = new Graphics();
    shadow.rect(0, -205, this.hwWidth, 410).fill({ color: 0x000000, alpha: 0.6 });
    highway.addChild(shadow);
    
    // 2. Asphalt
    const asphalt = new Graphics();
    asphalt.rect(0, -200, this.hwWidth, 400).fill(0x1a1c23); // dark gray
    highway.addChild(asphalt);
    
    // 3. Median (40px)
    const median = new Graphics();
    median.rect(0, -20, this.hwWidth, 40).fill(0x334155); // concrete color
    highway.addChild(median);
    
    // 4. Glow Overlays
    this.inboundGlow.clear();
    this.inboundGlow.rect(0, -200, this.hwWidth, 180).fill({ color: 0x00d4ff, alpha: 0.1 });
    highway.addChild(this.inboundGlow);
    
    this.outboundGlow.clear();
    this.outboundGlow.rect(0, 20, this.hwWidth, 180).fill({ color: 0xff8c00, alpha: 0.1 });
    highway.addChild(this.outboundGlow);
    
    // 5. Lane markings
    const lanes = new Graphics();
    lanes.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.8 });
    lanes.moveTo(0, -198).lineTo(this.hwWidth, -198);
    lanes.moveTo(0, 198).lineTo(this.hwWidth, 198);
    lanes.moveTo(0, -21).lineTo(this.hwWidth, -21);
    lanes.moveTo(0, 21).lineTo(this.hwWidth, 21);
    
    lanes.setStrokeStyle({ width: 2, color: 0xffffff, alpha: 0.4 });
    for (let x = 0; x < this.hwWidth; x += 40) {
       const w = Math.min(20, this.hwWidth - x);
       lanes.moveTo(x, -110).lineTo(x + w, -110); // Top center
       lanes.moveTo(x, 110).lineTo(x + w, 110); // Bottom center
    }
    lanes.stroke();
    highway.addChild(lanes);
    
    // 6. Chevrons
    this.drawChevrons();
    highway.addChild(this.chevronsContainer);

    this.pathsContainer.addChild(highway);
  }

  private drawChevrons() {
    this.chevronsContainer.removeChildren();
    for (let x = 0; x < this.hwWidth; x += 80) {
      // Inbound chevrons (top, pointing left)
      const inChev = new Graphics();
      inChev.setStrokeStyle({ width: 3, color: 0x00d4ff, alpha: 0.4 });
      inChev.moveTo(15, -125).lineTo(0, -110).lineTo(15, -95);
      inChev.stroke();
      inChev.x = x;
      inChev.label = 'inbound';
      this.chevronsContainer.addChild(inChev);
      
      // Outbound chevrons (bottom, pointing right)
      const outChev = new Graphics();
      outChev.setStrokeStyle({ width: 3, color: 0xff8c00, alpha: 0.4 });
      outChev.moveTo(0, 95).lineTo(15, 110).lineTo(0, 125);
      outChev.stroke();
      outChev.x = x;
      outChev.label = 'outbound';
      this.chevronsContainer.addChild(outChev);
    }
  }

  public update(delta: number) {
    // Animate chevrons
    for (const child of this.chevronsContainer.children) {
       if (child.label === 'inbound') {
           child.x -= delta * 1.5;
           if (child.x < -20) child.x += this.hwWidth + 20;
       } else if (child.label === 'outbound') {
           child.x += delta * 1.5;
           if (child.x > this.hwWidth) child.x -= this.hwWidth + 20;
       }
    }
  }

  public updateCongestion(outboundScore: number, inboundScore: number) {
    // Increase alpha and shift color slightly based on score
    const maxScore = 50; // Arbitrary saturation point
    
    const outRatio = Math.min(outboundScore / maxScore, 1);
    const inRatio = Math.min(inboundScore / maxScore, 1);
    
    // Baseline alpha 0.1, max 0.4
    this.outboundGlow.alpha = 1; // Control actual rect alpha via fill
    this.inboundGlow.alpha = 1;

    // Redraw outbound glow
    this.outboundGlow.clear();
    // Shift from orange (0xff8c00) to red (0xff0000)
    this.outboundGlow.rect(0, 20, this.hwWidth, 180).fill({ 
        color: outRatio > 0.6 ? 0xff4400 : 0xff8c00, 
        alpha: 0.1 + (0.3 * outRatio) 
    });

    // Redraw inbound glow
    this.inboundGlow.clear();
    // Shift from cyan to amber/red if congested
    this.inboundGlow.rect(0, -200, this.hwWidth, 180).fill({ 
        color: inRatio > 0.6 ? 0xffb800 : 0x00d4ff, 
        alpha: 0.1 + (0.3 * inRatio) 
    });
  }

  private drawLandmarks() {
    this.landmarksContainer.removeChildren();

    for (const node of ROUTE_NODES) {
      const pos = this.getNodePosition(node.id);
      const g = new Graphics();

      if (node.id === 'house') {
        g.rect(-30, -30, 60, 60).fill(0x00d4ff);
        // Roof
        g.moveTo(-35, -30).lineTo(0, -60).lineTo(35, -30).fill(0x00d4ff);
      } else if (node.id === 'address_office') {
        g.rect(-20, -15, 40, 30).fill(0x00d4ff);
      } else if (node.id === 'signal_1') {
        // Router spans highway
        g.rect(-10, -200, 20, 400).fill({ color: 0x1e293b, alpha: 0.8 });
        // Signals over lanes
        g.circle(0, -110, 15).fill(0x00ff88);
        g.circle(0, 110, 15).fill(0x00ff88);
      } else if (node.id === 'toll_gate') {
        g.rect(-10, -200, 20, 400).fill({ color: 0x1e293b, alpha: 0.8 });
        // Barriers over lanes
        g.rect(-4, -140, 8, 60).fill(0xffb800);
        g.rect(-4, 80, 8, 60).fill(0xffb800);
      } else if (node.id === 'isp_highway') {
        g.circle(0, 0, 50).fill({ color: 0x06b6d4, alpha: 0.5 });
      } else if (node.id === 'warehouse_cdn') {
        g.rect(-25, -20, 50, 40).fill(0xa855f7);
      } else if (node.id === 'destination') {
        g.rect(-40, -100, 80, 200).fill(0xff006e);
      }

      g.x = pos.x;
      g.y = pos.y;
      this.landmarksContainer.addChild(g);

      const label = new Text({
        text: node.label,
        style: {
          fontFamily: 'Inter',
          fontSize: 14,
          fill: 0xcbd5e1,
          fontWeight: '600',
        },
      });
      label.anchor.set(0.5, 0);
      label.x = pos.x;
      
      let yOffset = 40;
      if (node.id === 'destination') yOffset = 110;
      if (node.id === 'toll_gate' || node.id === 'signal_1') yOffset = 210;
      if (node.id === 'house') yOffset = 40;
      if (node.id === 'isp_highway') yOffset = 60;
      label.y = pos.y + yOffset;

      this.landmarksContainer.addChild(label);
    }
  }
}

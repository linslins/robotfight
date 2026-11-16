import {
  ARENA_H,
  ARENA_W,
  ArenaWorld,
  CORNER_CUT,
  WALL_T,
} from './physics';
import {
  ArmorType,
  BotUpgrades,
  BotVisualConfig,
  CameraMode,
  HazardZone,
  SecondaryWeaponType,
  WeaponType,
} from '../types/game';

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
}

export interface RenderBotParams {
  x: number;
  y: number;
  angle: number;
  z: number;
  radius: number;
  corner: 'red' | 'blue';
  name: string;
  hp: number;
  maxHp: number;
  primaryWeapon: WeaponType;
  secondaryWeapon: SecondaryWeaponType;
  armorType: ArmorType;
  visual: BotVisualConfig;
  upgrades: BotUpgrades;
  weaponAngle: number;
  weaponSpin: number;
  weaponActiveTimer: number;
  secondaryActiveTimer: number;
  boostActiveTimer: number;
  hitFlashTimer: number;
  burnTimer: number;
}

export function computeCameraTarget(
  mode: CameraMode,
  redX: number,
  redY: number,
  blueX: number,
  blueY: number,
  freeCam: CameraState
): CameraState {
  if (mode === 'fixed') {
    return { x: ARENA_W / 2, y: ARENA_H / 2, zoom: 1 };
  }
  if (mode === 'follow_red') {
    return { x: redX, y: redY, zoom: 1.48 };
  }
  if (mode === 'follow_blue') {
    return { x: blueX, y: blueY, zoom: 1.48 };
  }
  if (mode === 'action') {
    const midX = (redX + blueX) / 2;
    const midY = (redY + blueY) / 2;
    const dist = Math.hypot(redX - blueX, redY - blueY);
    const zoom = Math.max(1.0, Math.min(1.52, 1.62 - dist / 950));
    return { x: midX, y: midY, zoom };
  }
  return freeCam;
}

function drawArenaFloor(ctx: CanvasRenderingContext2D): void {
  // Outer dark frame
  ctx.fillStyle = '#090B0E';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // Arena steel floor
  const floorX = WALL_T;
  const floorY = WALL_T;
  const floorW = ARENA_W - WALL_T * 2;
  const floorH = ARENA_H - WALL_T * 2;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(floorX + CORNER_CUT, floorY);
  ctx.lineTo(floorX + floorW - CORNER_CUT, floorY);
  ctx.lineTo(floorX + floorW, floorY + CORNER_CUT);
  ctx.lineTo(floorX + floorW, floorY + floorH - CORNER_CUT);
  ctx.lineTo(floorX + floorW - CORNER_CUT, floorY + floorH);
  ctx.lineTo(floorX + CORNER_CUT, floorY + floorH);
  ctx.lineTo(floorX, floorY + floorH - CORNER_CUT);
  ctx.lineTo(floorX, floorY + CORNER_CUT);
  ctx.closePath();
  ctx.clip();

  ctx.fillStyle = '#141920';
  ctx.fillRect(floorX, floorY, floorW, floorH);

  // Steel floor panel grid
  ctx.strokeStyle = 'rgba(255,255,255,0.045)';
  ctx.lineWidth = 1;
  const tileSize = 72;
  for (let x = floorX; x <= floorX + floorW; x += tileSize) {
    ctx.beginPath();
    ctx.moveTo(x, floorY);
    ctx.lineTo(x, floorY + floorH);
    ctx.stroke();
  }
  for (let y = floorY; y <= floorY + floorH; y += tileSize) {
    ctx.beginPath();
    ctx.moveTo(floorX, y);
    ctx.lineTo(floorX + floorW, y);
    ctx.stroke();
  }

  // Center ring & combat crosshairs
  ctx.strokeStyle = 'rgba(249, 115, 22, 0.14)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(ARENA_W / 2, ARENA_H / 2, 110, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(255,255,255,0.07)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(ARENA_W / 2, floorY + 24);
  ctx.lineTo(ARENA_W / 2, floorY + floorH - 24);
  ctx.stroke();

  // Red & Blue corner starting boxes
  ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
  ctx.lineWidth = 3;
  ctx.strokeRect(122, ARENA_H / 2 - 58, 106, 116);
  ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
  ctx.fillRect(122, ARENA_H / 2 - 58, 106, 116);

  ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
  ctx.strokeRect(ARENA_W - 228, ARENA_H / 2 - 58, 106, 116);
  ctx.fillStyle = 'rgba(59, 130, 246, 0.06)';
  ctx.fillRect(ARENA_W - 228, ARENA_H / 2 - 58, 106, 116);

  ctx.restore();

  // Arena steel barrier rails + hazard corner bumpers
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(floorX + CORNER_CUT, floorY);
  ctx.lineTo(floorX + floorW - CORNER_CUT, floorY);
  ctx.lineTo(floorX + floorW, floorY + CORNER_CUT);
  ctx.lineTo(floorX + floorW, floorY + floorH - CORNER_CUT);
  ctx.lineTo(floorX + floorW - CORNER_CUT, floorY + floorH);
  ctx.lineTo(floorX + CORNER_CUT, floorY + floorH);
  ctx.lineTo(floorX, floorY + floorH - CORNER_CUT);
  ctx.lineTo(floorX, floorY + CORNER_CUT);
  ctx.closePath();
  ctx.stroke();

  // Corner bumper accent stripes
  ctx.strokeStyle = '#F97316';
  ctx.lineWidth = 3;
  const corners: [number, number, number, number][] = [
    [floorX, floorY + CORNER_CUT, floorX + CORNER_CUT, floorY],
    [floorX + floorW - CORNER_CUT, floorY, floorX + floorW, floorY + CORNER_CUT],
    [
      floorX + floorW,
      floorY + floorH - CORNER_CUT,
      floorX + floorW - CORNER_CUT,
      floorY + floorH,
    ],
    [floorX + CORNER_CUT, floorY + floorH, floorX, floorY + floorH - CORNER_CUT],
  ];
  for (const [x1, y1, x2, y2] of corners) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
}

function drawHazard(
  ctx: CanvasRenderingContext2D,
  h: HazardZone,
  elapsed: number
): void {
  ctx.save();
  ctx.translate(h.x, h.y);

  if (h.type === 'screw') {
    // Rotating wall auger screws
    const halfH = h.height / 2;
    ctx.fillStyle = '#1E293B';
    ctx.fillRect(-13, -halfH, 26, h.height);
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 2;
    ctx.strokeRect(-13, -halfH, 26, h.height);

    // Animated helical threads
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 3;
    const offset = (h.spinAngle * 6) % 24;
    for (let y = -halfH + offset - 24; y < halfH; y += 24) {
      if (y < -halfH || y > halfH - 10) continue;
      ctx.beginPath();
      ctx.moveTo(-11, y);
      ctx.lineTo(11, y + 12);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (h.type === 'killsaw') {
    // Recessed floor slot
    ctx.fillStyle = '#0B0E12';
    ctx.fillRect(-34, -8, 68, 16);
    ctx.strokeStyle =
      h.phase === 'warning'
        ? '#FACC15'
        : h.phase === 'active'
          ? '#EF4444'
          : '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -36, 72, 72);

    if (h.phase === 'warning') {
      const pulse = 0.25 + 0.25 * Math.sin(elapsed * 18);
      ctx.fillStyle = `rgba(250, 204, 21, ${pulse})`;
      ctx.fillRect(-34, -34, 68, 68);
    }

    if (h.phase === 'active') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.14)';
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();

      // Spinning toothed saw blade
      ctx.rotate(h.spinAngle);
      ctx.fillStyle = '#E2E8F0';
      ctx.beginPath();
      const teeth = 10;
      for (let i = 0; i < teeth * 2; i++) {
        const ang = (i * Math.PI) / teeth;
        const r = i % 2 === 0 ? h.radius - 2 : h.radius - 11;
        const px = Math.cos(ang) * r;
        const py = Math.sin(ang) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (h.type === 'flamejet') {
    ctx.fillStyle = '#0D1014';
    ctx.fillRect(-36, -26, 72, 52);
    ctx.strokeStyle =
      h.phase === 'warning'
        ? '#F59E0B'
        : h.phase === 'active'
          ? '#F97316'
          : '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(-36, -26, 72, 52);

    // Vent slots
    ctx.fillStyle = h.phase === 'active' ? '#F97316' : '#1E293B';
    for (let x = -24; x <= 24; x += 12) {
      ctx.fillRect(x - 3, -16, 6, 32);
    }

    if (h.phase === 'warning') {
      const pulse = 0.22 + 0.2 * Math.sin(elapsed * 16);
      ctx.fillStyle = `rgba(249, 115, 22, ${pulse})`;
      ctx.fillRect(-36, -26, 72, 52);
    } else if (h.phase === 'active') {
      const grad = ctx.createRadialGradient(0, 0, 4, 0, 0, 44);
      grad.addColorStop(0, 'rgba(254, 240, 138, 0.75)');
      grad.addColorStop(0.5, 'rgba(249, 115, 22, 0.45)');
      grad.addColorStop(1, 'rgba(249, 115, 22, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, 44, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }

  if (h.type === 'pulverizer') {
    // Target floor pad
    ctx.strokeStyle =
      h.phase === 'warning'
        ? '#FACC15'
        : h.phase === 'active'
          ? '#EF4444'
          : '#334155';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
    ctx.stroke();

    if (h.phase === 'warning') {
      const alpha = 0.16 + 0.18 * Math.sin(elapsed * 20);
      ctx.fillStyle = `rgba(250, 204, 21, ${alpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();
    } else if (h.phase === 'active') {
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(0, 0, h.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hydraulic hammer head shadow / slam state
    const slamScale = h.phase === 'active' ? 1.0 : 0.72;
    const offset = h.phase === 'active' ? 0 : -22;
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.arc(4, 4, 22, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = h.phase === 'active' ? '#EF4444' : '#475569';
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(-18 * slamScale, -18 * slamScale + offset, 36 * slamScale, 36 * slamScale);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

export function drawBotSprite(
  ctx: CanvasRenderingContext2D,
  bot: RenderBotParams,
  showLabel: boolean = true,
  elapsed: number = 0
): void {
  const hpPct = Math.max(0, Math.min(1, bot.hp / Math.max(1, bot.maxHp)));
  const damageRatio = 1 - hpPct;

  ctx.save();

  // Ground shadow (separates when airborne!)
  ctx.save();
  ctx.translate(bot.x + 4 + bot.z * 0.25, bot.y + 6 + bot.z * 0.35);
  ctx.rotate(bot.angle);
  ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
  const shadowScale = Math.max(0.65, 1 - bot.z * 0.004);
  ctx.scale(shadowScale, shadowScale);
  ctx.beginPath();
  ctx.roundRect(-bot.radius, -bot.radius * 0.85, bot.radius * 2, bot.radius * 1.7, 6);
  ctx.fill();
  ctx.restore();

  // Airborne scale & lift
  const airScale = 1 + bot.z * 0.006;
  ctx.translate(bot.x, bot.y - bot.z * 0.55);
  ctx.scale(airScale, airScale);

  // Structural integrity flickering heat glow (scales with 1 - hpPct)
  if (damageRatio > 0.12 && bot.hp > 0) {
    const heatIntensity = Math.min(1, (damageRatio - 0.12) / 0.88);
    const flickerFreq = 9 + heatIntensity * 22;
    const flicker =
      0.72 +
      0.28 *
        Math.sin(elapsed * flickerFreq + (bot.corner === 'red' ? 0 : 2.1)) *
        Math.cos(elapsed * (flickerFreq * 0.63));
    const glowRadius = bot.radius * (1.28 + heatIntensity * 0.62);
    const heatGrad = ctx.createRadialGradient(
      0,
      0,
      bot.radius * 0.3,
      0,
      0,
      glowRadius
    );
    const coreAlpha = (0.14 + heatIntensity * 0.38) * flicker;
    const edgeAlpha = (0.06 + heatIntensity * 0.22) * flicker;
    if (hpPct < 0.3) {
      heatGrad.addColorStop(0, `rgba(254, 240, 138, ${coreAlpha * 0.85})`);
      heatGrad.addColorStop(0.45, `rgba(239, 68, 68, ${coreAlpha})`);
      heatGrad.addColorStop(1, `rgba(239, 68, 68, 0)`);
    } else {
      heatGrad.addColorStop(0, `rgba(251, 146, 60, ${coreAlpha})`);
      heatGrad.addColorStop(0.55, `rgba(245, 158, 11, ${edgeAlpha})`);
      heatGrad.addColorStop(1, `rgba(245, 158, 11, 0)`);
    }
    ctx.fillStyle = heatGrad;
    ctx.beginPath();
    ctx.arc(0, 0, glowRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // Underglow cosmetic
  if (bot.visual.attachments.includes('underglow')) {
    ctx.save();
    ctx.shadowColor = bot.visual.accentColor;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = bot.visual.accentColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, bot.radius + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // Gyro shield aura
  if (
    bot.secondaryWeapon === 'gyro_stabilizer' &&
    bot.secondaryActiveTimer > 0
  ) {
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.8)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, bot.radius + 9, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.rotate(bot.angle);

  const r = bot.radius;
  const halfW = r * 0.88;
  const halfL = r * 0.96;

  // Wheels (4WD top-down)
  ctx.fillStyle = '#090B0E';
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1;
  const wheelPositions: [number, number][] = [
    [-halfL * 0.62, -halfW - 4],
    [halfL * 0.42, -halfW - 4],
    [-halfL * 0.62, halfW - 2],
    [halfL * 0.42, halfW - 2],
  ];
  for (const [wx, wy] of wheelPositions) {
    ctx.fillRect(wx - 6, wy, 12, 6);
    ctx.strokeRect(wx - 6, wy, 12, 6);
  }

  // Side Skirts cosmetic
  if (bot.visual.attachments.includes('side_skirts')) {
    ctx.fillStyle = '#475569';
    ctx.fillRect(-halfL * 0.75, -halfW - 5, halfL * 1.45, 4);
    ctx.fillRect(-halfL * 0.75, halfW + 1, halfL * 1.45, 4);
  }

  // Rear Spoiler cosmetic
  if (bot.visual.attachments.includes('rear_spoiler')) {
    ctx.fillStyle = bot.visual.accentColor;
    ctx.fillRect(-halfL - 6, -halfW * 0.78, 5, halfW * 1.56);
  }

  // Main armored chassis body
  ctx.beginPath();
  ctx.moveTo(-halfL, -halfW);
  ctx.lineTo(halfL * 0.55, -halfW);
  ctx.lineTo(halfL, -halfW * 0.62);
  ctx.lineTo(halfL, halfW * 0.62);
  ctx.lineTo(halfL * 0.55, halfW);
  ctx.lineTo(-halfL, halfW);
  ctx.closePath();

  ctx.fillStyle = bot.hitFlashTimer > 0 ? '#F8FAFC' : bot.visual.primaryColor;
  ctx.fill();

  // Paint pattern overlay clipped to chassis
  if (bot.hitFlashTimer <= 0) {
    ctx.save();
    ctx.clip();
    if (bot.visual.pattern === 'racing_stripes') {
      ctx.fillStyle = bot.visual.accentColor;
      ctx.fillRect(-halfL, -7, halfL * 2, 4);
      ctx.fillRect(-halfL, 3, halfL * 2, 4);
    } else if (bot.visual.pattern === 'hazard_chevron') {
      ctx.fillStyle = bot.visual.accentColor;
      for (let cx = -halfL; cx < halfL; cx += 14) {
        ctx.beginPath();
        ctx.moveTo(cx, -halfW);
        ctx.lineTo(cx + 8, -halfW);
        ctx.lineTo(cx - 2, halfW);
        ctx.lineTo(cx - 10, halfW);
        ctx.closePath();
        ctx.fill();
      }
    } else if (bot.visual.pattern === 'carbon_split') {
      ctx.fillStyle = 'rgba(0,0,0,0.38)';
      ctx.fillRect(-halfL, 0, halfL * 2, halfW);
      ctx.fillStyle = bot.visual.accentColor;
      ctx.fillRect(-halfL, -2, halfL * 2, 4);
    }
    ctx.restore();
  }

  // Chassis armor outline (brighter/thicker with higher Armor upgrades)
  ctx.strokeStyle =
    bot.upgrades.armor >= 4
      ? '#E2E8F0'
      : bot.corner === 'red'
        ? '#FCA5A5'
        : '#93C5FD';
  ctx.lineWidth = 1.6 + (bot.upgrades.armor - 1) * 0.35;
  ctx.stroke();

  // Glowing structural fracture seams & heat fissures when damaged (< 70% HP)
  if (damageRatio > 0.3 && bot.hp > 0) {
    const seamAlpha = Math.min(0.92, (damageRatio - 0.3) * 1.35) *
      (0.7 + 0.3 * Math.sin(elapsed * (12 + damageRatio * 18)));
    ctx.save();
    ctx.strokeStyle =
      hpPct < 0.3
        ? `rgba(254, 240, 138, ${seamAlpha})`
        : `rgba(249, 115, 22, ${seamAlpha})`;
    ctx.lineWidth = 1.4 + damageRatio * 1.1;
    ctx.beginPath();
    ctx.moveTo(-halfL * 0.6, -halfW * 0.45);
    ctx.lineTo(-halfL * 0.15, -halfW * 0.1);
    ctx.lineTo(-halfL * 0.32, halfW * 0.38);
    if (damageRatio > 0.5) {
      ctx.moveTo(halfL * 0.25, -halfW * 0.55);
      ctx.lineTo(0, halfW * 0.08);
      ctx.lineTo(halfL * 0.35, halfW * 0.48);
    }
    ctx.stroke();
    ctx.restore();
  }

  // Fork Guards cosmetic
  if (bot.visual.attachments.includes('fork_guards')) {
    ctx.fillStyle = '#CBD5E1';
    ctx.fillRect(halfL - 2, -halfW * 0.52, 11, 3.5);
    ctx.fillRect(halfL - 2, halfW * 0.52 - 3.5, 11, 3.5);
  }

  // Battle Horns cosmetic
  if (bot.visual.attachments.includes('battle_horns')) {
    ctx.fillStyle = bot.visual.accentColor;
    ctx.beginPath();
    ctx.moveTo(halfL * 0.6, -halfW);
    ctx.lineTo(halfL + 10, -halfW * 0.72);
    ctx.lineTo(halfL * 0.75, -halfW * 0.65);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(halfL * 0.6, halfW);
    ctx.lineTo(halfL + 10, halfW * 0.72);
    ctx.lineTo(halfL * 0.75, halfW * 0.65);
    ctx.closePath();
    ctx.fill();
  }

  // Roll Cage cosmetic
  if (bot.visual.attachments.includes('roll_cage')) {
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 2;
    ctx.strokeRect(-halfL * 0.55, -halfW * 0.55, halfL * 1.05, halfW * 1.1);
    ctx.beginPath();
    ctx.moveTo(-halfL * 0.55, -halfW * 0.55);
    ctx.lineTo(halfL * 0.5, halfW * 0.55);
    ctx.moveTo(-halfL * 0.55, halfW * 0.55);
    ctx.lineTo(halfL * 0.5, -halfW * 0.55);
    ctx.stroke();
  }

  // PRIMARY WEAPONS (Top-Down Mechanical Silhouettes)
  if (bot.primaryWeapon === 'vertical_disk') {
    // Center front weapon slot + spinning tooth disk
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(halfL * 0.3, -5, halfL * 0.85, 10);
    const pulse = Math.sin(bot.weaponAngle) * 2.5;
    ctx.fillStyle = bot.weaponActiveTimer > 0 ? '#38BDF8' : '#E2E8F0';
    ctx.fillRect(halfL * 0.45, -3 + pulse * 0.3, halfL * 0.85, 6);
    ctx.fillStyle = bot.visual.accentColor;
    ctx.fillRect(halfL * 1.05 + pulse * 0.4, -4, 5, 8);
  } else if (bot.primaryWeapon === 'horizontal_bar') {
    // Offset front spindle + wide spinning steel bar
    ctx.save();
    ctx.translate(halfL + 4, 0);
    ctx.rotate(bot.weaponAngle);
    ctx.fillStyle = '#E2E8F0';
    ctx.fillRect(-5, -r * 1.28, 10, r * 2.56);
    ctx.fillStyle = '#EF4444';
    ctx.fillRect(-5, -r * 1.28, 10, 7);
    ctx.fillRect(-5, r * 1.28 - 7, 10, 7);
    ctx.restore();
  } else if (bot.primaryWeapon === 'flipper') {
    // Hinged pneumatic wedge arm
    const extend = bot.weaponActiveTimer > 0 ? 12 : 0;
    ctx.fillStyle = bot.weaponActiveTimer > 0 ? '#F97316' : '#CBD5E1';
    ctx.beginPath();
    ctx.moveTo(-2, -halfW * 0.56);
    ctx.lineTo(halfL + 6 + extend, -halfW * 0.34);
    ctx.lineTo(halfL + 6 + extend, halfW * 0.34);
    ctx.lineTo(-2, halfW * 0.56);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  } else if (bot.primaryWeapon === 'hammer') {
    // Articulated overhead hammer arm
    const swing =
      bot.weaponActiveTimer > 0
        ? Math.sin((bot.weaponActiveTimer / 0.36) * Math.PI)
        : 0;
    const armLen = halfL + 4 + swing * 20;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(-halfL * 0.3, 0);
    ctx.lineTo(armLen, 0);
    ctx.stroke();

    ctx.fillStyle = bot.weaponActiveTimer > 0 ? '#FACC15' : '#94A3B8';
    ctx.fillRect(armLen - 6, -10, 12, 20);
    ctx.strokeStyle = '#0F172A';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(armLen - 6, -10, 12, 20);
  } else if (bot.primaryWeapon === 'drum') {
    // Wide front heavy drum cylinder
    ctx.fillStyle = '#334155';
    ctx.fillRect(halfL * 0.68, -halfW * 0.65, 13, halfW * 1.3);
    ctx.strokeStyle = '#E2E8F0';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(halfL * 0.68, -halfW * 0.65, 13, halfW * 1.3);

    // Animated drum teeth streaks
    const toothY = ((bot.weaponAngle * 8) % (halfW * 1.2)) - halfW * 0.6;
    ctx.fillStyle = bot.visual.accentColor;
    ctx.fillRect(halfL * 0.68, toothY - 3, 13, 6);
  }

  // Boost exhaust glow
  if (bot.boostActiveTimer > 0) {
    ctx.fillStyle = '#F97316';
    ctx.beginPath();
    ctx.moveTo(-halfL, -7);
    ctx.lineTo(-halfL - 16 - Math.random() * 8, 0);
    ctx.lineTo(-halfL, 7);
    ctx.closePath();
    ctx.fill();
  }

  ctx.restore(); // undo rotation

  // Flickering short-circuit sparks around chassis perimeter (scales with 1 - hpPct)
  if (damageRatio > 0.28 && bot.hp > 0) {
    const sparkCount = Math.floor(1 + damageRatio * 5);
    for (let i = 0; i < sparkCount; i++) {
      const phase = elapsed * (14 + i * 3.7) + i * 2.13;
      const pulse = Math.sin(phase);
      if (pulse > 0.15) {
        const baseAng = (phase * 1.7) % (Math.PI * 2);
        const startR = bot.radius * 0.78;
        const endR = bot.radius + 5 + damageRatio * 14 * pulse;
        ctx.strokeStyle = i % 2 === 0 ? '#FEF08A' : '#FB923C';
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(Math.cos(baseAng) * startR, Math.sin(baseAng) * startR);
        ctx.lineTo(
          Math.cos(baseAng + 0.12) * ((startR + endR) * 0.52),
          Math.sin(baseAng + 0.12) * ((startR + endR) * 0.52)
        );
        ctx.lineTo(Math.cos(baseAng) * endR, Math.sin(baseAng) * endR);
        ctx.stroke();
      }
    }
  }

  // Crisp overhead corner marker + name tag + mini integrity bar (no pills)
  if (showLabel) {
    ctx.font = '600 11px "DM Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(13, 16, 20, 0.82)';
    const tagW = Math.max(58, ctx.measureText(bot.name).width + 12);
    ctx.fillRect(-tagW / 2, -bot.radius - 26, tagW, 18);
    ctx.fillStyle = bot.corner === 'red' ? '#FCA5A5' : '#93C5FD';
    ctx.fillText(bot.name, 0, -bot.radius - 13);

    // Mini structural integrity bar
    ctx.fillStyle = 'rgba(30, 41, 59, 0.9)';
    ctx.fillRect(-tagW / 2 + 2, -bot.radius - 10, tagW - 4, 2.5);
    ctx.fillStyle =
      hpPct > 0.6 ? '#22C55E' : hpPct > 0.3 ? '#F59E0B' : '#EF4444';
    ctx.fillRect(-tagW / 2 + 2, -bot.radius - 10, (tagW - 4) * hpPct, 2.5);
  }

  ctx.restore();
}

export function renderArenaWorld(
  ctx: CanvasRenderingContext2D,
  world: ArenaWorld,
  cameraMode: CameraMode,
  cameraCurrent: CameraState,
  freeCam: CameraState,
  dt: number
): CameraState {
  const target = computeCameraTarget(
    cameraMode,
    world.red.x,
    world.red.y,
    world.blue.x,
    world.blue.y,
    freeCam
  );

  // Smooth camera damping
  const lerp = Math.min(1, dt * 8);
  const nextCam: CameraState =
    cameraMode === 'free'
      ? freeCam
      : {
          x: cameraCurrent.x + (target.x - cameraCurrent.x) * lerp,
          y: cameraCurrent.y + (target.y - cameraCurrent.y) * lerp,
          zoom: cameraCurrent.zoom + (target.zoom - cameraCurrent.zoom) * lerp,
        };

  ctx.save();
  ctx.clearRect(0, 0, ARENA_W, ARENA_H);

  // Background fill for zoomed-out edges
  ctx.fillStyle = '#090B0E';
  ctx.fillRect(0, 0, ARENA_W, ARENA_H);

  // Apply camera transform + screen shake
  const shakeX = (Math.random() - 0.5) * world.screenShake * 1.8;
  const shakeY = (Math.random() - 0.5) * world.screenShake * 1.8;
  ctx.translate(ARENA_W / 2 + shakeX, ARENA_H / 2 + shakeY);
  ctx.scale(nextCam.zoom, nextCam.zoom);
  ctx.translate(-nextCam.x, -nextCam.y);

  drawArenaFloor(ctx);

  // Skid marks
  for (const s of world.skidMarks) {
    ctx.strokeStyle = s.color;
    ctx.globalAlpha = s.alpha;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(s.x1, s.y1);
    ctx.lineTo(s.x2, s.y2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Hazards
  for (const h of world.hazards) {
    drawHazard(ctx, h, world.elapsed);
  }

  // Harpoon tether flash
  for (const [attacker, targetBot] of [
    [world.red, world.blue],
    [world.blue, world.red],
  ]) {
    if (attacker.secondaryWeapon === 'harpoon' && attacker.secondaryActiveTimer > 0.1) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(attacker.x, attacker.y);
      ctx.lineTo(targetBot.x, targetBot.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // Bots (draw grounded bot before airborne bot)
  const botsSorted =
    world.red.z <= world.blue.z
      ? [world.red, world.blue]
      : [world.blue, world.red];

  for (const b of botsSorted) {
    drawBotSprite(ctx, b, true, world.elapsed);
  }

  // Particles
  for (const p of world.particles) {
    const t = Math.max(0, p.life / p.maxLife);
    ctx.globalAlpha = t;
    if (p.kind === 'ring') {
      const r = p.size * (1.2 - t * 0.7);
      ctx.strokeStyle = p.color;
      ctx.lineWidth = 3 * t;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.stroke();
    } else if (p.kind === 'spark') {
      ctx.strokeStyle = p.color;
      ctx.lineWidth = p.size * 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
      ctx.stroke();
    } else {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * (p.kind === 'smoke' ? 1.4 - t * 0.5 : t), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  // Floating combat numbers
  ctx.font = '700 13px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  for (const f of world.floatingTexts) {
    ctx.globalAlpha = Math.min(1, f.life / (f.maxLife * 0.5));
    ctx.fillStyle = '#090B0E';
    ctx.fillText(f.text, f.x + 1, f.y + 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;

  ctx.restore();
  return nextCam;
}

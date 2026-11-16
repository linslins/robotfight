import { useEffect, useRef } from 'react';
import { getArchetype } from '../data/bots';
import { drawBotSprite } from '../engine/renderer';
import {
  ArmorType,
  BotUpgrades,
  BotVisualConfig,
  SecondaryWeaponType,
  WeaponType,
} from '../types/game';

interface BotPreviewCanvasProps {
  chassisId: string;
  primaryWeapon: WeaponType;
  secondaryWeapon: SecondaryWeaponType;
  armorType: ArmorType;
  visual: BotVisualConfig;
  upgrades: BotUpgrades;
  name: string;
  corner?: 'red' | 'blue';
  size?: number;
}

export function BotPreviewCanvas({
  chassisId,
  primaryWeapon,
  secondaryWeapon,
  armorType,
  visual,
  upgrades,
  name,
  corner = 'red',
  size = 240,
}: BotPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let angle = -0.35;
    let weaponAngle = 0;
    let lastTime = performance.now();
    const arch = getArchetype(chassisId);

    const render = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      angle += dt * 0.42;
      weaponAngle += dt * 16;

      ctx.clearRect(0, 0, size, size);

      // Subtle schematic floor grid
      ctx.fillStyle = '#0B0E12';
      ctx.fillRect(0, 0, size, size);
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= size; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, size);
        ctx.stroke();
      }
      for (let y = 0; y <= size; y += 24) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(size, y);
        ctx.stroke();
      }

      // Calibration turntable ring
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.34, 0, Math.PI * 2);
      ctx.stroke();

      ctx.save();
      ctx.translate(size / 2, size / 2);
      ctx.scale(1.9, 1.9);
      drawBotSprite(
        ctx,
        {
          x: 0,
          y: 0,
          angle,
          z: 0,
          radius: arch.radius,
          corner,
          name,
          hp: 100,
          maxHp: 100,
          primaryWeapon,
          secondaryWeapon,
          armorType,
          visual,
          upgrades,
          weaponAngle,
          weaponSpin: 0.95,
          weaponActiveTimer: 0,
          secondaryActiveTimer: 0,
          boostActiveTimer: 0,
          hitFlashTimer: 0,
          burnTimer: 0,
        },
        false
      );
      ctx.restore();

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [
    chassisId,
    primaryWeapon,
    secondaryWeapon,
    armorType,
    visual,
    upgrades,
    name,
    corner,
    size,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="w-full h-auto rounded-lg border border-white/10 bg-[#0B0E12]"
    />
  );
}

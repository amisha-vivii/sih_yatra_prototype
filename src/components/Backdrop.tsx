import React from 'react';

/**
 * Blurred photographic backdrop. Sits behind page content at low contrast so
 * text and cards stay fully legible.
 */
export function Backdrop({
  image,
  intensity = 'soft',
  blur = 8




}: {image: string;intensity?: 'soft' | 'medium' | 'strong';blur?: number;}) {
  const veil =
  intensity === 'strong' ?
  'bg-canvas/[0.94]' :
  intensity === 'medium' ?
  'bg-canvas/[0.88]' :
  'bg-canvas/[0.82]';
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
      <img
        src={image}
        alt=""
        className="h-full w-full scale-110 object-cover"
        style={{ filter: `blur(${blur}px) saturate(0.9)` }} />
      
      <div className={`absolute inset-0 ${veil}`} />
    </div>);

}

/** Inline blurred banner used inside cards and hero panels. */
export function BackdropPanel({
  image,
  className = '',
  children,
  blur = 6,
  overlay = 'bg-indigo-700/72'






}: {image: string;className?: string;children: React.ReactNode;blur?: number;overlay?: string;}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl ${className}`}>
      <img
        src={image}
        alt=""
        aria-hidden
        className="absolute inset-0 h-full w-full scale-110 object-cover"
        style={{ filter: `blur(${blur}px) saturate(1.05)` }} />
      
      <div className={`absolute inset-0 ${overlay}`} aria-hidden />
      <div className="relative">{children}</div>
    </div>);

}
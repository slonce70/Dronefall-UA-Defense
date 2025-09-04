// Shared JSDoc/TypeScript types for the game (consumed by //@ts-check or TS)

/** @typedef {{ x:number, y:number }} Vec2 */
/** @typedef {('light'|'heavy'|'rocket')} EnemyKind */
/** @typedef {{ id:number, kind:EnemyKind, pos:Vec2, hp:number, speed:number, path?:Vec2[] }} Enemy */
/** @typedef {{ id:number, type:string, pos:Vec2, range:number, dps:number }} Defense */
/** @typedef {{ money:number, score:number, wave:number, gameOver:boolean, rightOnlyMode:boolean, hardcoreMode:boolean }} GameStats */
/** @typedef {{ enemies:Enemy[], defenses:Defense[], rockets:Enemy[] }} Entities */
/** @typedef {{ tick:number, dt:number, speed:number, paused:boolean }} LoopInfo */
/** @typedef {{ assets:string[], waveSchedule:number[], regions:Record<string, [number,number][] > }} Constants */

// Ambient modules (Leaflet types are provided via @types/leaflet when added)
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.webp' {
  const url: string;
  export default url;
}
declare module '*.avif' {
  const url: string;
  export default url;
}

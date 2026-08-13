import { Box } from '@mui/material';

const palettes = {
  common: ['#3f7658','#b9d8c3','#e8f3eb'], rare: ['#315f9b','#79b6ef','#e7f3ff'],
  epic: ['#69428f','#bd86e6','#f5eaff'], legendary: ['#9a6514','#f0b63c','#fff0bb'],
} as const;

export default function AchievementArtwork({ artworkKey, rarity='common', locked=false, size=88 }: { artworkKey:string; rarity?:keyof typeof palettes; locked?:boolean; size?:number }) {
  const [dark,mid,light]=palettes[rarity] || palettes.common;
  const glyph = artworkKey.includes('on-time') ? 'clock' : artworkKey.includes('first-pass') ? 'check' : artworkKey.includes('consistency') ? 'streak' : artworkKey.includes('comeback') ? 'return' : artworkKey.includes('mission') ? 'star' : artworkKey.includes('season') || artworkKey.includes('top-three') ? 'trophy' : 'flag';
  return <Box component="svg" viewBox="0 0 120 120" role="img" aria-hidden sx={{ width:size,height:size,display:'block',filter:locked?'grayscale(1) opacity(.45)':'drop-shadow(0 10px 14px rgba(24,37,29,.18))' }}>
    <defs><linearGradient id={`badge-${artworkKey}`} x1="0" y1="0" x2="1" y2="1"><stop stopColor={light}/><stop offset=".52" stopColor={mid}/><stop offset="1" stopColor={dark}/></linearGradient></defs>
    <path d="M60 5 75 15 93 14 101 30 116 40 111 58 116 76 101 88 94 106 75 105 60 116 45 105 26 106 19 88 4 76 9 58 4 40 19 30 27 14 45 15Z" fill={`url(#badge-${artworkKey})`} stroke={light} strokeWidth="4"/>
    <circle cx="60" cy="60" r="38" fill="rgba(16,28,22,.78)" stroke="rgba(255,255,255,.72)" strokeWidth="3"/>
    {glyph==='clock'&&<><circle cx="60" cy="60" r="22" fill="none" stroke={light} strokeWidth="7"/><path d="M60 45v17l12 8" fill="none" stroke={light} strokeWidth="7" strokeLinecap="round"/></>}
    {glyph==='check'&&<path d="m39 61 14 14 30-34" fill="none" stroke={light} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round"/>}
    {glyph==='streak'&&<path d="M36 79 51 61l11 9 23-30M72 40h13v13" fill="none" stroke={light} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>}
    {glyph==='return'&&<path d="M42 48h31c12 0 18 8 18 18s-7 18-19 18H49M42 48l13-13M42 48l13 13" fill="none" stroke={light} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>}
    {glyph==='star'&&<path d="m60 34 8 17 19 2-14 13 4 19-17-9-17 9 4-19-14-13 19-2Z" fill={light}/>} 
    {glyph==='trophy'&&<path d="M43 38h34v18c0 13-7 20-17 20S43 69 43 56Zm0 5H32v8c0 10 6 15 16 15m29-23h11v8c0 10-6 15-16 15M60 76v11m-15 0h30" fill="none" stroke={light} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>}
    {glyph==='flag'&&<path d="M43 88V35m1 4h35L70 52l9 14H44" fill="none" stroke={light} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>}
  </Box>;
}

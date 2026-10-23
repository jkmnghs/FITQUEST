import { Swords, Sword, Flame, Dumbbell, Trophy, Zap, Star, Weight, Gem, Medal, Crown, Clock, ClipboardCheck, Leaf } from 'lucide-react';

// Line icons instead of emoji so achievement badges read as one set in the HUD style.
const ACH_ICONS = {
  first: [Swords, '#ffd600'], w5: [Flame, '#ff9100'], w15: [Dumbbell, '#00e5ff'], w36: [Trophy, '#ffd600'],
  s3: [Sword, '#ff9100'], s7: [Zap, '#b388ff'], s4w: [Star, '#ffd600'],
  v5k: [Weight, '#00e5ff'], v25k: [Gem, '#b388ff'],
  l5: [Medal, '#00e676'], l10: [Crown, '#ffd600'],
  hrs5: [Clock, '#00e5ff'], ci: [ClipboardCheck, '#00e676'], deload: [Leaf, '#00e676'],
};

/** [IconComponent, color] for an achievement id. */
export function achievementIcon(id) {
  return ACH_ICONS[id] || [Star, '#00e5ff'];
}

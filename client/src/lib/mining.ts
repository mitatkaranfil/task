import { UserBoost, BoostType, User } from "@/types";

// Calculate time until next mining operation (format as MM:SS)
export function calculateNextMiningTime(lastMiningTime: Date): string {
  const now = new Date();
  const lastMining = new Date(lastMiningTime);
  
  // Mining rewards occur on the hour boundary
  const nextMiningDate = new Date(lastMining);
  nextMiningDate.setHours(nextMiningDate.getHours() + 1);
  nextMiningDate.setMinutes(0);
  nextMiningDate.setSeconds(0);
  
  // Calculate remaining time
  const remainingMs = nextMiningDate.getTime() - now.getTime();
  
  if (remainingMs <= 0) {
    return "00:00"; // Mining is ready
  }
  
  // Format as MM:SS
  const minutes = Math.floor(remainingMs / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
  
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Calculate current mining speed considering boosts
export function calculateMiningSpeed(baseMiningSpeed: number, activeBoosts: UserBoost[]): number {
  if (!activeBoosts || activeBoosts.length === 0) {
    return baseMiningSpeed;
  }
  
  let finalSpeed = baseMiningSpeed;
  
  // Apply each boost multiplier
  activeBoosts.forEach(boost => {
    const multiplier = boost.boostType.multiplier / 100;
    finalSpeed = Math.floor(finalSpeed * multiplier);
  });
  
  return finalSpeed;
}

// Format remaining boost time
export function formatBoostRemainingTime(endTime: Date): string {
  const now = new Date();
  const end = new Date(endTime);
  
  // Calculate the time difference in milliseconds
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) {
    return "00:00:00"; // Expired
  }
  
  // Convert to hours, minutes, seconds
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format points with comma separator
export function formatPoints(points: number): string {
  return points.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// Check if mining is available (passed the hour boundary)
export function isMiningAvailable(lastMiningTime: Date): boolean {
  const now = new Date();
  const lastMining = new Date(lastMiningTime);
  
  // Check if current hour is greater than last mining hour
  return (
    now.getHours() > lastMining.getHours() ||
    now.getDate() > lastMining.getDate() ||
    now.getMonth() > lastMining.getMonth() ||
    now.getFullYear() > lastMining.getFullYear()
  );
}

// Calculate potential earnings with a specific boost
export function calculatePotentialEarnings(
  baseMiningSpeed: number, 
  boostMultiplier: number, 
  durationHours: number
): number {
  const boostedSpeed = Math.floor(baseMiningSpeed * (boostMultiplier / 100));
  const potentialEarnings = boostedSpeed * durationHours;
  return potentialEarnings;
}

// Format a date to local string (e.g., "15.07.2023")
export function formatDate(date: Date): string {
  return date.toLocaleDateString('tr-TR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

// Calculate time since join date (e.g., "3 days ago")
export function formatTimeSinceJoin(joinDate: Date): string {
  const now = new Date();
  const joined = new Date(joinDate);
  
  const diffMs = now.getTime() - joined.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return "Bugün katıldı";
  } else if (diffDays === 1) {
    return "Dün katıldı";
  } else {
    return `${diffDays} gün önce katıldı`;
  }
}

// Get user's level based on points
export function calculateUserLevel(points: number): number {
  if (points < 1000) return 1;
  if (points < 5000) return 2;
  if (points < 15000) return 3;
  if (points < 50000) return 4;
  if (points < 150000) return 5;
  return 6;
}

// Get mining status text
export function getMiningStatus(
  lastMiningTime: Date,
  activeBoosts: UserBoost[]
): { text: string; className: string } {
  if (isMiningAvailable(lastMiningTime)) {
    return { text: "Kazım Hazır", className: "text-green-400" };
  }
  
  if (activeBoosts && activeBoosts.length > 0) {
    return { text: "Boost Aktif", className: "text-accent" };
  }
  
  return { text: "Çalışıyor", className: "text-primary" };
}

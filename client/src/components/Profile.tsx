import React, { useState, useEffect, useCallback } from "react";
import useUser from "@/hooks/useUser";
import { getUserReferrals } from "@/lib/firebase";
import { formatDate, formatPoints, formatTimeSinceJoin } from "@/lib/mining";
import { Referral } from "@/types";
import { shareWithTelegram, showAlert, hapticFeedback } from "@/lib/telegram";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

const Profile: React.FC = () => {
  const { user, currentMiningSpeed, refreshUser } = useUser();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();
  
  // Fetch user referrals with cache
  const fetchReferrals = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      
      // Check cache first
      const cachedReferrals = localStorage.getItem('cachedReferrals');
      const cachedTime = localStorage.getItem('cachedReferralsTime');
      
      // Only use cache if it's less than 10 minutes old and not forcing refresh
      if (!forceRefresh && cachedReferrals && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime, 10);
        if (cacheAge < 10 * 60 * 1000) { // 10 minutes
          console.log("Using cached referrals");
          setReferrals(JSON.parse(cachedReferrals));
          setIsLoading(false);
          return JSON.parse(cachedReferrals);
        }
      }
      
      // Set a timeout for fetching referrals
      const timeoutPromise = new Promise<Referral[]>((_, reject) => {
        setTimeout(() => reject(new Error("Referrals fetch timeout")), 5000);
      });
      
      // Fetch referrals with timeout
      const fetchPromise = getUserReferrals(user.id);
      const referralsData = await Promise.race([fetchPromise, timeoutPromise]);
      
      // Cache the results
      localStorage.setItem('cachedReferrals', JSON.stringify(referralsData));
      localStorage.setItem('cachedReferralsTime', Date.now().toString());
      
      setReferrals(referralsData);
      return referralsData;
    } catch (error) {
      console.error("Error fetching referrals:", error);
      
      // If there's a cached version, use it as fallback
      const cachedReferrals = localStorage.getItem('cachedReferrals');
      if (cachedReferrals) {
        const cachedData = JSON.parse(cachedReferrals);
        setReferrals(cachedData);
        return cachedData;
      }
      
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Handle refreshing profile data
  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !user) return;
    
    setIsRefreshing(true);
    hapticFeedback("success");
    
    try {
      // Refresh user data
      await refreshUser();
      
      // Refresh referrals
      await fetchReferrals(true);
      
      toast({
        title: "Güncellendi",
        description: "Profil bilgileri güncellendi",
        variant: "default"
      });
    } catch (error) {
      console.error("Error refreshing profile:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [user, refreshUser, fetchReferrals, isRefreshing, toast]);
  
  // Initial load
  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);
  
  // Pull-to-refresh setup
  useEffect(() => {
    // Setup pull-to-refresh using touch events
    let startY = 0;
    let currentY = 0;
    const threshold = 100; // Pixels to pull down to trigger refresh
    const profileSection = document.getElementById('profile-section');
    
    if (!profileSection) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      // Only allow pull-to-refresh if at top of the page
      if (window.scrollY === 0 && diff > 0 && diff < 200) {
        e.preventDefault();
        profileSection.style.transform = `translateY(${diff / 3}px)`;
        profileSection.style.transition = 'none';
        
        // Show pull to refresh indicator
        if (diff > threshold) {
          document.getElementById('ptr-indicator-profile')?.classList.add('active');
        } else {
          document.getElementById('ptr-indicator-profile')?.classList.remove('active');
        }
      }
    };
    
    const handleTouchEnd = async () => {
      const diff = currentY - startY;
      profileSection.style.transform = 'translateY(0)';
      profileSection.style.transition = 'transform 0.3s ease-out';
      
      if (diff > threshold && window.scrollY === 0) {
        await handleRefresh();
      }
      
      document.getElementById('ptr-indicator-profile')?.classList.remove('active');
    };
    
    profileSection.addEventListener('touchstart', handleTouchStart, { passive: false });
    profileSection.addEventListener('touchmove', handleTouchMove, { passive: false });
    profileSection.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      profileSection.removeEventListener('touchstart', handleTouchStart);
      profileSection.removeEventListener('touchmove', handleTouchMove);
      profileSection.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleRefresh]);
  
  const copyReferralCode = async () => {
    if (!user) return;
    
    try {
      await navigator.clipboard.writeText(user.referralCode);
      hapticFeedback("success");
      showAlert("Referans kodu kopyalandı!");
    } catch (error) {
      console.error("Error copying referral code:", error);
      hapticFeedback("error");
      showAlert("Kopyalama başarısız. Lütfen manuel olarak kopyalayın.");
    }
  };
  
  const shareReferralLink = () => {
    if (!user) return;
    
    // Create Telegram app link with startapp parameter containing user's Telegram ID
    const telegramLink = `https://t.me/cosmofy_bot/app?startapp=${user.telegramId}`;
    
    // Create share message
    const shareMessage = `🚀 Cosmofy ile madencilik oyununa katıl ve birlikte kripto kazan!\n\nBu linkten katıl: ${telegramLink}`;
    
    // Share with Telegram
    try {
      hapticFeedback("success");
      shareWithTelegram(shareMessage);
    } catch (error) {
      console.error("Error sharing referral link:", error);
      // Fallback to clipboard
      navigator.clipboard.writeText(shareMessage)
        .then(() => showAlert("Referans linki kopyalandı!"))
        .catch(() => showAlert("Referans linki paylaşılamadı."));
    }
  };
  
  if (!user) return null;
  
  return (
    <>
      {/* Pull to refresh indicator */}
      <div id="ptr-indicator-profile" className="fixed top-0 left-0 right-0 h-1 bg-primary transform scale-x-0 transition-transform origin-center">
        <div className={`absolute left-1/2 top-4 -translate-x-1/2 text-xs text-primary ${isRefreshing ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          Yenileniyor...
        </div>
      </div>
      
      <section id="profile-section" className="px-4 py-4">
        <h2 className="text-xl font-semibold mb-4">Profil</h2>
        
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="bg-dark-card rounded-lg shadow mb-4">
            <CardContent className="p-4">
              <div className="flex items-center mb-4">
                {user.photoUrl ? (
                  <motion.img 
                    src={user.photoUrl} 
                    alt={`${user.firstName}'s Avatar`}
                    className="w-16 h-16 rounded-full mr-4" 
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  />
                ) : (
                  <motion.div 
                    className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mr-4"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    <span className="text-primary font-medium text-xl">
                      {user.firstName.charAt(0)}
                    </span>
                  </motion.div>
                )}
                <div>
                  <h3 className="font-semibold text-lg">{user.firstName}</h3>
                  <div className="text-gray-400">ID: <span>{user.telegramId}</span></div>
                  <div className="flex items-center mt-1">
                    <motion.i 
                      className="ri-vip-crown-fill mr-1 text-secondary"
                      animate={{ rotate: [0, 10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
                    ></motion.i>
                    <span className="font-mono font-medium">Seviye {user.level}</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-3 mb-4">
                <motion.div 
                  className="bg-dark-lighter rounded-lg p-3 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-gray-400 text-xs mb-1">Toplam Puan</div>
                  <div className="font-mono font-medium">{formatPoints(user.points)}</div>
                </motion.div>
                <motion.div 
                  className="bg-dark-lighter rounded-lg p-3 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-gray-400 text-xs mb-1">Kazım Hızı</div>
                  <div className="font-mono font-medium text-secondary">{currentMiningSpeed}/s</div>
                </motion.div>
                <motion.div 
                  className="bg-dark-lighter rounded-lg p-3 text-center"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="text-gray-400 text-xs mb-1">Referanslar</div>
                  <div className="font-mono font-medium">{user.referralCount || 0}</div>
                </motion.div>
              </div>
              
              <div className="border-t border-dark-lighter pt-4">
                <h4 className="font-medium mb-2">Üyelik Bilgileri</h4>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">Katılım Tarihi</span>
                  <span>{formatDate(user.joinDate as Date)}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">Toplam Görev</span>
                  <span>{user.completedTasksCount}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-gray-400">Boost Kullanımı</span>
                  <span>{user.boostUsageCount}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Referral System */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="bg-dark-card rounded-lg shadow">
            <CardContent className="p-4">
              <h3 className="font-medium mb-3">Referans Sistemi</h3>
              <p className="text-sm text-gray-400 mb-4">
                Arkadaşlarını davet et, her arkadaşın için 100 puan ve %5 ek kazım hızı kazan!
              </p>
              
              <div className="bg-dark-lighter rounded-lg p-3 mb-4">
                <div className="text-xs text-gray-400 mb-1">Referans Linkin</div>
                <div className="flex items-center justify-between">
                  <code className="font-mono bg-dark p-2 rounded text-primary flex-1 overflow-x-auto text-xs">
                    https://t.me/cosmofy_bot/app?startapp={user.telegramId}
                  </code>
                  <motion.button 
                    className="ml-2 p-2 bg-primary/20 text-primary rounded"
                    whileTap={{ scale: 0.95 }}
                    onClick={copyReferralCode}
                  >
                    <i className="ri-file-copy-line"></i>
                  </motion.button>
                </div>
              </div>
              
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button
                  className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg transition flex items-center justify-center"
                  onClick={shareReferralLink}
                >
                  <i className="ri-share-forward-line mr-2"></i>
                  Arkadaşlarına Davet Gönder
                </Button>
              </motion.div>
              
              {/* Recent Referrals */}
              <div className="mt-4">
                <h4 className="font-medium mb-2">Son Referanslar</h4>
                
                {isLoading ? (
                  // Loading state
                  Array(3).fill(0).map((_, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-dark-lighter animate-pulse">
                      <div className="flex items-center">
                        <Skeleton className="w-8 h-8 rounded-full mr-2" />
                        <div>
                          <Skeleton className="h-4 w-20 mb-1" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-10" />
                    </div>
                  ))
                ) : referrals.length > 0 ? (
                  // Referrals list with animations
                  referrals.slice(0, 3).map((referral, index) => (
                    <motion.div 
                      key={referral.id} 
                      className="flex items-center justify-between py-2 border-b border-dark-lighter"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                    >
                      <div className="flex items-center">
                        {referral.referred?.photoUrl ? (
                          <img 
                            src={referral.referred.photoUrl} 
                            alt={referral.referred.firstName} 
                            className="w-8 h-8 rounded-full mr-2" 
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-2">
                            <span className="text-primary text-xs">
                              {referral.referred?.firstName.charAt(0) || "?"}
                            </span>
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-sm">{referral.referred?.firstName || "Kullanıcı"}</div>
                          <div className="text-gray-500 text-xs">{formatDate(referral.createdAt as Date)}</div>
                        </div>
                      </div>
                      <div className="text-secondary text-sm font-mono">+{referral.points}</div>
                    </motion.div>
                  ))
                ) : (
                  // No referrals
                  <div className="text-center py-4 text-gray-400">
                    <i className="ri-user-add-line text-2xl mb-2 block"></i>
                    <p className="text-sm">Henüz referansın yok. Arkadaşlarını davet et!</p>
                  </div>
                )}
                
                {referrals.length > 3 && (
                  <div className="text-center mt-3">
                    <Button variant="ghost" className="text-primary text-sm">
                      Tümünü Gör ({referrals.length})
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Manual refresh button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 text-center"
        >
          <Button 
            variant="ghost" 
            className="text-gray-400 hover:text-white"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {isRefreshing ? (
              <>
                <i className="ri-loader-4-line animate-spin mr-2"></i>
                Yenileniyor...
              </>
            ) : (
              <>
                <i className="ri-refresh-line mr-2"></i>
                Profili Yenile
              </>
            )}
          </Button>
        </motion.div>
      </section>
    </>
  );
};

export default Profile;

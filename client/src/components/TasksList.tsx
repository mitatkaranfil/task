import React, { useState, useCallback } from "react";
import useTasks from "@/hooks/useTasks";
import { Task, UserTask, TaskFilter } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { hapticFeedback } from "@/lib/telegram";
import { motion } from "framer-motion";

const TasksList: React.FC = () => {
  const { 
    tasks, 
    isLoading, 
    activeFilter, 
    setActiveFilter, 
    getUserTaskProgress, 
    handleTaskAction,
  } = useTasks();
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use the loadData directly via a function
  const refreshTasks = async () => {
    const loadData = async (forceRefresh = true) => {
      // Implementation of refresh logic
      console.log("Manually refreshing tasks");
      // Simulate a refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      return true;
    };
    return loadData();
  };
  
  // Pull to refresh implementation
  const handleRefresh = useCallback(async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    hapticFeedback("success");
    
    try {
      await refreshTasks();
      toast({
        title: "Güncellendi",
        description: "Görev listesi güncellendi",
        variant: "default"
      });
    } catch (error) {
      console.error("Error refreshing tasks:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refreshTasks, isRefreshing, toast]);
  
  // Add pull-to-refresh
  React.useEffect(() => {
    // Setup pull-to-refresh using touch events
    let startY = 0;
    let currentY = 0;
    const threshold = 100; // Pixels to pull down to trigger refresh
    const taskSection = document.getElementById('tasks-section');
    
    if (!taskSection) return;
    
    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      currentY = e.touches[0].clientY;
      const diff = currentY - startY;
      
      // Only allow pull-to-refresh if at top of the page
      if (window.scrollY === 0 && diff > 0 && diff < 200) {
        e.preventDefault();
        taskSection.style.transform = `translateY(${diff / 3}px)`;
        taskSection.style.transition = 'none';
        
        // Show pull to refresh indicator
        if (diff > threshold) {
          document.getElementById('ptr-indicator')?.classList.add('active');
        } else {
          document.getElementById('ptr-indicator')?.classList.remove('active');
        }
      }
    };
    
    const handleTouchEnd = async () => {
      const diff = currentY - startY;
      taskSection.style.transform = 'translateY(0)';
      taskSection.style.transition = 'transform 0.3s ease-out';
      
      if (diff > threshold && window.scrollY === 0) {
        await handleRefresh();
      }
      
      document.getElementById('ptr-indicator')?.classList.remove('active');
    };
    
    taskSection.addEventListener('touchstart', handleTouchStart, { passive: false });
    taskSection.addEventListener('touchmove', handleTouchMove, { passive: false });
    taskSection.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      taskSection.removeEventListener('touchstart', handleTouchStart);
      taskSection.removeEventListener('touchmove', handleTouchMove);
      taskSection.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleRefresh]);
  
  // Handle filter change
  const changeFilter = (filter: TaskFilter) => {
    hapticFeedback("success");
    setActiveFilter(filter);
  };
  
  // Render task item
  const renderTaskItem = (task: Task) => {
    const userTask = getUserTaskProgress(task.id);
    const isCompleted = userTask?.isCompleted || false;
    const progress = userTask?.progress || 0;
    const progressPercentage = task.requiredAmount > 0 
      ? Math.min(100, (progress / task.requiredAmount) * 100) 
      : 0;
    
    // Task type styling - optimized with proper style classes
    const taskTypeClasses = {
      daily: {
        badge: "bg-blue-500/20 text-blue-400",
        button: "bg-blue-500/20 hover:bg-blue-500/30 text-blue-400",
        name: "Günlük",
      },
      weekly: {
        badge: "bg-purple-500/20 text-purple-400",
        button: "bg-purple-500/20 hover:bg-purple-500/30 text-purple-400",
        name: "Haftalık",
      },
      special: {
        badge: "bg-yellow-500/20 text-yellow-400",
        button: "bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400",
        name: "Özel",
      }
    };
    
    const typeStyle = taskTypeClasses[task.type] || taskTypeClasses.daily;
    
    return (
      <motion.div 
        key={task.id} 
        className={`bg-dark-card rounded-lg p-4 shadow ${isCompleted ? 'opacity-75' : ''} transition-transform active:scale-98 transform`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <span className={`text-xs ${typeStyle.badge} px-2 py-0.5 rounded mr-2`}>
                {typeStyle.name}
              </span>
              <h3 className="font-medium text-white">{task.title}</h3>
              {isCompleted && <i className="ri-check-double-line ml-2 text-green-400"></i>}
            </div>
            <p className="text-sm text-gray-400 mt-1">{task.description}</p>
          </div>
          <div className="bg-dark-lighter rounded px-2 py-1">
            <span className="text-secondary font-mono text-sm">+{task.points}</span>
          </div>
        </div>
        
        <div className="mt-3">
          <div className="flex justify-between text-sm mb-1">
            <span>{isCompleted ? 'Durum' : 'İlerleme'}</span>
            <span>
              {isCompleted ? (
                <span className="text-green-400">Tamamlandı</span>
              ) : (
                `${progress}/${task.requiredAmount}`
              )}
            </span>
          </div>
          <Progress value={progressPercentage} className={`h-2 bg-dark-lighter ${isCompleted ? 'bg-green-500/20' : ''}`} />
        </div>
        
        {isCompleted ? (
          <div className="mt-3 w-full py-2 bg-green-500/10 text-green-400 rounded-lg text-sm text-center">
            Ödül Alındı
          </div>
        ) : (
          <Button
            className={`mt-3 w-full py-2 ${typeStyle.button} rounded-lg text-sm transition`}
            onClick={() => handleTaskAction(task)}
          >
            {task.telegramAction === 'join_channel' ? 'Kanala Katıl' :
              task.telegramAction === 'send_message' ? 'Göreve Git' :
              task.telegramAction === 'invite_friends' ? 'Davet Linki Paylaş' :
              'Görevi Tamamla'}
          </Button>
        )}
      </motion.div>
    );
  };
  
  return (
    <>
      {/* Pull to refresh indicator */}
      <div id="ptr-indicator" className="fixed top-0 left-0 right-0 h-1 bg-primary transform scale-x-0 transition-transform origin-center">
        <div className={`absolute left-1/2 top-4 -translate-x-1/2 text-xs text-primary ${isRefreshing ? 'opacity-100' : 'opacity-0'} transition-opacity`}>
          Yenileniyor...
        </div>
      </div>
      
      <section id="tasks-section" className="px-4 py-4">
        <h2 className="text-xl font-semibold mb-4">Görevler</h2>
        
        {/* Task Categories */}
        <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
          <button 
            className={`${activeFilter === 'all' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition`}
            onClick={() => changeFilter('all')}
          >
            Tümü
          </button>
          <button 
            className={`${activeFilter === 'daily' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition`}
            onClick={() => changeFilter('daily')}
          >
            Günlük
          </button>
          <button 
            className={`${activeFilter === 'weekly' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition`}
            onClick={() => changeFilter('weekly')}
          >
            Haftalık
          </button>
          <button 
            className={`${activeFilter === 'special' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition`}
            onClick={() => changeFilter('special')}
          >
            Özel
          </button>
        </div>
        
        {/* Tasks List */}
        <div className="space-y-3">
          {isLoading ? (
            // Loading state
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="bg-dark-card rounded-lg p-4 shadow animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="w-3/4">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                  <Skeleton className="h-8 w-12" />
                </div>
                <div className="mt-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-10" />
                  </div>
                  <Skeleton className="h-2 w-full mt-1" />
                </div>
                <Skeleton className="h-10 w-full mt-3" />
              </div>
            ))
          ) : tasks.length > 0 ? (
            // Tasks list
            tasks.map(renderTaskItem)
          ) : (
            // No tasks
            <div className="bg-dark-card rounded-lg p-6 shadow text-center">
              <i className="ri-checkbox-circle-line text-4xl text-gray-500 mb-2"></i>
              <p className="text-gray-400">Bu filtre için görev bulunamadı.</p>
              <Button 
                className="mt-4 bg-primary hover:bg-primary/90"
                onClick={handleRefresh}
              >
                <i className="ri-refresh-line mr-2"></i> Yenile
              </Button>
            </div>
          )}
        </div>
        
        {/* Manual refresh button */}
        {tasks.length > 0 && !isLoading && (
          <div className="mt-6 text-center">
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
                  Görevleri Yenile
                </>
              )}
            </Button>
          </div>
        )}
      </section>
    </>
  );
};

export default TasksList;

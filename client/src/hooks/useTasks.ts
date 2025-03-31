import { useState, useEffect, useCallback } from "react";
import { getTasks, getUserTasks, updateUserTaskProgress } from "@/lib/firebase";
import { Task, UserTask, TaskFilter } from "@/types";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { openTelegramLink, hapticFeedback } from "@/lib/telegram";

export const useTasks = () => {
  const { user, refreshUser, isOfflineMode } = useUser();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);
  
  // Fetch user tasks (optimized)
  const fetchUserTasks = useCallback(async () => {
    if (!user) return [];
    
    try {
      // First check for cached user tasks
      const cachedUserTasks = localStorage.getItem('cachedUserTasks');
      const cachedTime = localStorage.getItem('cachedUserTasksTime');
      
      // Use cache if it's less than 5 minutes old
      if (cachedUserTasks && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime, 10);
        if (cacheAge < 5 * 60 * 1000) { // 5 minutes
          console.log("Using cached user tasks");
          return JSON.parse(cachedUserTasks);
        }
      }
      
      // Try API first
      try {
        console.log("Fetching user tasks from API");
        const response = await fetch(`/api/users/${user.id}/tasks`, {
          signal: AbortSignal.timeout(3000) // 3-second timeout
        });
        
        if (response.ok) {
          const userTasksData = await response.json();
          
          // Update cache
          localStorage.setItem('cachedUserTasks', JSON.stringify(userTasksData));
          localStorage.setItem('cachedUserTasksTime', Date.now().toString());
          
          return userTasksData;
        }
      } catch (apiError) {
        console.warn("API error fetching user tasks:", apiError);
      }
      
      // Fallback to Firebase with timeout
      const timeoutPromise = new Promise<UserTask[]>((_, reject) => {
        setTimeout(() => reject(new Error("Firebase timeout")), 4000);
      });
      
      const firebasePromise = getUserTasks(user.id);
      const userTasksData = await Promise.race([firebasePromise, timeoutPromise]);
      
      // Cache the results
      localStorage.setItem('cachedUserTasks', JSON.stringify(userTasksData));
      localStorage.setItem('cachedUserTasksTime', Date.now().toString());
      
      return userTasksData;
    } catch (error) {
      console.error("Error fetching user tasks:", error);
      
      // If there's a cached version, use it even if expired
      const cachedUserTasks = localStorage.getItem('cachedUserTasks');
      if (cachedUserTasks) {
        console.log("Using expired cached user tasks due to fetch error");
        return JSON.parse(cachedUserTasks);
      }
      
      return [];
    }
  }, [user]);
  
  // Fetch tasks (optimized)
  const fetchTasks = useCallback(async () => {
    try {
      // First check for cached tasks
      const cachedTasks = localStorage.getItem('cachedTasks');
      const cachedTime = localStorage.getItem('cachedTasksTime');
      
      // Use cache if it's less than 30 minutes old
      if (cachedTasks && cachedTime) {
        const cacheAge = Date.now() - parseInt(cachedTime, 10);
        if (cacheAge < 30 * 60 * 1000) { // 30 minutes
          console.log("Using cached tasks");
          return JSON.parse(cachedTasks);
        }
      }
      
      // Try API first
      try {
        console.log("Fetching tasks from API");
        const response = await fetch("/api/tasks", {
          signal: AbortSignal.timeout(3000) // 3-second timeout
        });
        
        if (response.ok) {
          const tasksData = await response.json();
          
          // Update cache
          localStorage.setItem('cachedTasks', JSON.stringify(tasksData));
          localStorage.setItem('cachedTasksTime', Date.now().toString());
          
          return tasksData;
        }
      } catch (apiError) {
        console.warn("API error fetching tasks:", apiError);
      }
      
      // Fallback to Firebase with timeout
      const timeoutPromise = new Promise<Task[]>((_, reject) => {
        setTimeout(() => reject(new Error("Firebase timeout")), 4000);
      });
      
      const firebasePromise = getTasks();
      const tasksData = await Promise.race([firebasePromise, timeoutPromise]);
      
      // Cache the results
      localStorage.setItem('cachedTasks', JSON.stringify(tasksData));
      localStorage.setItem('cachedTasksTime', Date.now().toString());
      
      return tasksData;
    } catch (error) {
      console.error("Error fetching tasks:", error);
      
      // If there's a cached version, use it even if expired
      const cachedTasks = localStorage.getItem('cachedTasks');
      if (cachedTasks) {
        console.log("Using expired cached tasks due to fetch error");
        return JSON.parse(cachedTasks);
      }
      
      return [];
    }
  }, []);
  
  // Load tasks
  const loadData = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    
    try {
      // Check if we should reload (15 second minimum between refreshes)
      const shouldReload = forceRefresh || Date.now() - lastFetchTime > 15000;
      
      if (!shouldReload && tasks.length > 0 && userTasks.length > 0) {
        console.log("Using in-memory tasks data");
        return;
      }
      
      setIsLoading(true);
      
      // If in offline mode, just use cached data
      if (isOfflineMode) {
        const cachedTasks = localStorage.getItem('cachedTasks');
        const cachedUserTasks = localStorage.getItem('cachedUserTasks');
        
        if (cachedTasks && cachedUserTasks) {
          setTasks(JSON.parse(cachedTasks));
          setUserTasks(JSON.parse(cachedUserTasks));
          setIsLoading(false);
          return;
        }
      }
      
      // Load tasks and user tasks in parallel
      const [tasksData, userTasksData] = await Promise.all([
        fetchTasks(),
        fetchUserTasks()
      ]);
      
      setTasks(tasksData);
      setUserTasks(userTasksData);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error("Error loading tasks data:", error);
      toast({
        title: "Hata",
        description: "Görevler yüklenirken bir hata oluştu.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast, fetchTasks, fetchUserTasks, tasks.length, userTasks.length, lastFetchTime, isOfflineMode]);
  
  // Initial load
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);
  
  // Refresh function (for pull-to-refresh)
  const refreshTasks = useCallback(() => {
    return loadData(true);
  }, [loadData]);
  
  // Filter tasks based on active filter
  const filteredTasks = tasks.filter(task => {
    if (activeFilter === "all") return true;
    return task.type === activeFilter;
  });
  
  // Get user progress for a task
  const getUserTaskProgress = useCallback((taskId: string): UserTask | undefined => {
    return userTasks.find(ut => ut.taskId === taskId);
  }, [userTasks]);
  
  // Handle task action (e.g., navigating to Telegram group)
  const handleTaskAction = async (task: Task) => {
    if (!user) return;
    
    try {
      console.log("Handling task action for task:", task);
      
      // Handle different task actions
      switch (task.telegramAction) {
        case "open_app":
          // Auto-complete this task as the app is already open
          try {
            console.log("Trying to update task progress via API");
            const response = await fetch(`/api/users/${user.id}/tasks/${task.id}/progress`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ progress: task.requiredAmount }),
            });
            
            if (response.ok) {
              console.log("Task progress updated via API");
              
              // Update local cache immediately 
              const updatedUserTasks = userTasks.map(ut => {
                if (ut.taskId === task.id) {
                  return {
                    ...ut,
                    progress: task.requiredAmount,
                    isCompleted: true
                  };
                }
                return ut;
              });
              
              setUserTasks(updatedUserTasks);
              localStorage.setItem('cachedUserTasks', JSON.stringify(updatedUserTasks));
              
              await refreshUser();
              hapticFeedback("success");
              toast({
                title: "Görev Tamamlandı",
                description: `${task.points} puan kazandınız!`,
                variant: "default"
              });
            } else {
              console.warn("Failed to update task progress via API, falling back to Firebase");
              await updateUserTaskProgress(user.id, task.id, task.requiredAmount);
              await refreshTasks();
              await refreshUser();
              hapticFeedback("success");
              toast({
                title: "Görev Tamamlandı",
                description: `${task.points} puan kazandınız!`,
                variant: "default"
              });
            }
          } catch (apiError) {
            console.warn("API error updating task progress, falling back to Firebase:", apiError);
            await updateUserTaskProgress(user.id, task.id, task.requiredAmount);
            await refreshTasks();
            await refreshUser();
            hapticFeedback("success");
            toast({
              title: "Görev Tamamlandı",
              description: `${task.points} puan kazandınız!`,
              variant: "default"
            });
          }
          break;
          
        case "send_message":
          if (task.telegramTarget) {
            try {
              // Open the Telegram link and attempt to mark as complete
              openTelegramLink(task.telegramTarget);
              
              // Update task progress
              try {
                const response = await fetch(`/api/users/${user.id}/tasks/${task.id}/progress`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ progress: 1 }), // Increment by 1
                });
                
                if (response.ok) {
                  console.log(`Task progress updated for ${task.telegramAction}`);
                  toast({
                    title: "Görev İlerlemesi",
                    description: "Görev ilerlemesi güncellendi.",
                  });
                  await refreshUser();
                }
              } catch (progressError) {
                console.error("Error updating task progress:", progressError);
              }
            } catch (linkError) {
              console.error("Error opening Telegram link:", linkError);
            }
          }
          break;
          
        case "join_channel":
          if (task.telegramTarget) {
            try {
              console.log("Opening channel link:", task.telegramTarget);
              
              // Open the Telegram link
              openTelegramLink(task.telegramTarget);
              
              // Mark task as complete
              try {
                // Complete the task directly
                await fetch(`/api/users/${user.id}/tasks/${task.id}/progress`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({ progress: task.requiredAmount }),
                });
                
                toast({
                  title: "Görev Tamamlanıyor",
                  description: "Kanala katıldıktan sonra görev tamamlanacak",
                });
                
                await refreshUser();
              } catch (progressError) {
                console.error("Error updating channel join task progress:", progressError);
              }
            } catch (linkError) {
              console.error("Error opening Telegram channel link:", linkError);
            }
          }
          break;
          
        case "invite_friends":
          // This will be handled by a different component
          break;
          
        default:
          console.warn(`Unknown task action: ${task.telegramAction}`);
      }
      
      // Update user tasks after task action
      try {
        console.log("Trying to reload user tasks from API after action");
        const response = await fetch(`/api/users/${user.id}/tasks`);
        if (response.ok) {
          const userTasksData = await response.json();
          console.log("User tasks reloaded from API:", userTasksData);
          setUserTasks(userTasksData);
        } else {
          console.warn("Failed to reload user tasks from API, falling back to Firebase");
          const updatedUserTasks = await getUserTasks(user.id);
          setUserTasks(updatedUserTasks);
        }
      } catch (apiError) {
        console.warn("API error reloading user tasks, falling back to Firebase:", apiError);
        const updatedUserTasks = await getUserTasks(user.id);
        setUserTasks(updatedUserTasks);
      }
      
    } catch (error) {
      console.error("Error handling task action:", error);
      toast({
        title: "Hata",
        description: "Görev işlenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  // Update task progress
  const updateTaskProgress = async (taskId: string, progress: number) => {
    if (!user) return;
    
    try {
      await updateUserTaskProgress(user.id, taskId, progress);
      
      // Refresh user tasks
      const updatedUserTasks = await getUserTasks(user.id);
      setUserTasks(updatedUserTasks);
      
      // Refresh user data for updated points
      await refreshUser();
      
    } catch (error) {
      console.error("Error updating task progress:", error);
      toast({
        title: "Hata",
        description: "Görev ilerlemesi güncellenirken bir hata oluştu.",
        variant: "destructive"
      });
    }
  };
  
  return {
    tasks: filteredTasks,
    userTasks,
    isLoading,
    activeFilter,
    setActiveFilter,
    getUserTaskProgress,
    handleTaskAction,
    updateTaskProgress
  };
};

export default useTasks;

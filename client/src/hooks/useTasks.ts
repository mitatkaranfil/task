import { useState, useEffect } from "react";
import { getTasks, getUserTasks, updateUserTaskProgress } from "@/lib/firebase";
import { Task, UserTask, TaskFilter } from "@/types";
import useUser from "./useUser";
import { useToast } from "@/hooks/use-toast";
import { openTelegramLink, hapticFeedback } from "@/lib/telegram";

export const useTasks = () => {
  const { user, refreshUser } = useUser();
  const { toast } = useToast();
  
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<UserTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("all");
  
  // Load tasks
  useEffect(() => {
    const loadTasks = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        
        // Get all tasks
        const allTasks = await getTasks();
        setTasks(allTasks);
        
        // Get user's progress on tasks
        const userTasksData = await getUserTasks(user.id);
        setUserTasks(userTasksData);
        
      } catch (error) {
        console.error("Error loading tasks:", error);
        toast({
          title: "Hata",
          description: "Görevler yüklenirken bir hata oluştu.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTasks();
  }, [user]);
  
  // Filter tasks based on active filter
  const filteredTasks = tasks.filter(task => {
    if (activeFilter === "all") return true;
    return task.type === activeFilter;
  });
  
  // Get user progress for a task
  const getUserTaskProgress = (taskId: string): UserTask | undefined => {
    return userTasks.find(ut => ut.taskId === taskId);
  };
  
  // Handle task action (e.g., navigating to Telegram group)
  const handleTaskAction = async (task: Task) => {
    if (!user) return;
    
    try {
      // Handle different task actions
      switch (task.telegramAction) {
        case "open_app":
          // Auto-complete this task as the app is already open
          await updateUserTaskProgress(user.id, task.id, task.requiredAmount);
          await refreshUser();
          hapticFeedback("success");
          toast({
            title: "Görev Tamamlandı",
            description: `${task.points} puan kazandınız!`,
            variant: "default"
          });
          break;
          
        case "send_message":
          if (task.telegramTarget) {
            openTelegramLink(task.telegramTarget);
          }
          break;
          
        case "join_channel":
          if (task.telegramTarget) {
            openTelegramLink(task.telegramTarget);
          }
          break;
          
        case "invite_friends":
          // This will be handled by a different component
          break;
          
        default:
          console.warn(`Unknown task action: ${task.telegramAction}`);
      }
      
      // Update user tasks after task action
      const updatedUserTasks = await getUserTasks(user.id);
      setUserTasks(updatedUserTasks);
      
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

import React from "react";
import useTasks from "@/hooks/useTasks";
import { Task, UserTask, TaskFilter } from "@/types";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const TasksList: React.FC = () => {
  const { 
    tasks, 
    isLoading, 
    activeFilter, 
    setActiveFilter, 
    getUserTaskProgress, 
    handleTaskAction 
  } = useTasks();
  
  // Handle filter change
  const changeFilter = (filter: TaskFilter) => {
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
    
    // Task type styling
    const taskTypeStyles: Record<string, { bg: string, text: string }> = {
      daily: { bg: "blue-500/20", text: "blue-400" },
      weekly: { bg: "purple-500/20", text: "purple-400" },
      special: { bg: "yellow-500/20", text: "yellow-400" }
    };
    
    const typeStyle = taskTypeStyles[task.type] || taskTypeStyles.daily;
    
    return (
      <div 
        key={task.id} 
        className={`bg-dark-card rounded-lg p-4 shadow ${isCompleted ? 'opacity-75' : ''}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center">
              <span className={`text-xs bg-${typeStyle.bg} text-${typeStyle.text} px-2 py-0.5 rounded mr-2`}>
                {task.type === 'daily' ? 'Günlük' : task.type === 'weekly' ? 'Haftalık' : 'Özel'}
              </span>
              <h3 className="font-medium">{task.title}</h3>
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
          <Progress value={progressPercentage} className="h-2 bg-dark-lighter" />
        </div>
        
        {isCompleted ? (
          <div className="mt-3 w-full py-2 bg-green-500/10 text-green-400 rounded-lg text-sm text-center">
            Ödül Alındı
          </div>
        ) : (
          <Button
            className={`mt-3 w-full py-2 bg-${typeStyle.bg} hover:bg-${typeStyle.text}/30 text-${typeStyle.text} rounded-lg text-sm transition`}
            onClick={() => handleTaskAction(task)}
          >
            {task.telegramAction === 'join_channel' ? 'Kanala Katıl' :
              task.telegramAction === 'send_message' ? 'Göreve Git' :
              task.telegramAction === 'invite_friends' ? 'Davet Linki Paylaş' :
              'Görevi Tamamla'}
          </Button>
        )}
      </div>
    );
  };
  
  return (
    <section id="tasks-section" className="px-4 py-4">
      <h2 className="text-xl font-semibold mb-4">Görevler</h2>
      
      {/* Task Categories */}
      <div className="flex space-x-2 mb-4 overflow-x-auto pb-2 hide-scrollbar">
        <button 
          className={`${activeFilter === 'all' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap`}
          onClick={() => changeFilter('all')}
        >
          Tümü
        </button>
        <button 
          className={`${activeFilter === 'daily' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap`}
          onClick={() => changeFilter('daily')}
        >
          Günlük
        </button>
        <button 
          className={`${activeFilter === 'weekly' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap`}
          onClick={() => changeFilter('weekly')}
        >
          Haftalık
        </button>
        <button 
          className={`${activeFilter === 'special' ? 'bg-primary text-white' : 'bg-dark-lighter text-gray-300'} px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap`}
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
            <div key={index} className="bg-dark-card rounded-lg p-4 shadow">
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
          </div>
        )}
      </div>
    </section>
  );
};

export default TasksList;

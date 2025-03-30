import { initializeApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  Timestamp,
  addDoc,
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";
import { User, Task, BoostType, UserBoost, UserTask, Referral } from "@/types";

// Firebase configuration
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Firebase app instance
let app: any;
let db: any;

// Initialize Firebase
export async function initializeFirebase() {
  if (!app) {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    
    // Initialize collections with default data if needed
    await initializeDefaultData();
  }
  return { app, db };
}

// Initialize default data (tasks, boost types)
async function initializeDefaultData() {
  // Check if boost types exist, if not create defaults
  const boostTypesSnapshot = await getDocs(collection(db, "boostTypes"));
  
  if (boostTypesSnapshot.empty) {
    // Default boost types
    const defaultBoostTypes: Partial<BoostType>[] = [
      {
        name: "Hız Boost",
        description: "Kazım hızını 24 saat boyunca 1.5x artır",
        multiplier: 150, // 1.5x
        durationHours: 24,
        price: 500,
        isActive: true,
        iconName: "rocket",
        colorClass: "blue",
        isPopular: false
      },
      {
        name: "Süper Boost",
        description: "Kazım hızını 24 saat boyunca 2x artır",
        multiplier: 200, // 2x
        durationHours: 24,
        price: 1000,
        isActive: true,
        iconName: "rocket",
        colorClass: "purple",
        isPopular: false
      },
      {
        name: "Mega Boost",
        description: "Kazım hızını 24 saat boyunca 3x artır",
        multiplier: 300, // 3x
        durationHours: 24,
        price: 2000,
        isActive: true,
        iconName: "rocket",
        colorClass: "yellow",
        isPopular: false
      },
      {
        name: "Ultra Boost",
        description: "Kazım hızını 7 gün boyunca 2x artır",
        multiplier: 200, // 2x
        durationHours: 168, // 7 days
        price: 5000,
        isActive: true,
        iconName: "rocket",
        colorClass: "red",
        isPopular: true
      }
    ];
    
    for (const boostType of defaultBoostTypes) {
      await addDoc(collection(db, "boostTypes"), {
        ...boostType,
        createdAt: serverTimestamp()
      });
    }
  }
  
  // Check if tasks exist, if not create defaults
  const tasksSnapshot = await getDocs(collection(db, "tasks"));
  
  if (tasksSnapshot.empty) {
    // Default tasks
    const defaultTasks: Partial<Task>[] = [
      {
        title: "Uygulamayı Aç",
        description: "Uygulamayı günde bir kez aç",
        type: "daily",
        points: 10,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "open_app",
        telegramTarget: null
      },
      {
        title: "Gruba Mesaj Gönder",
        description: "Telegram grubuna en az 3 mesaj gönder",
        type: "daily",
        points: 50,
        requiredAmount: 3,
        isActive: true,
        telegramAction: "send_message",
        telegramTarget: "@mining_group"
      },
      {
        title: "5 Arkadaş Davet Et",
        description: "5 arkadaşını referans koduyla davet et",
        type: "weekly",
        points: 200,
        requiredAmount: 5,
        isActive: true,
        telegramAction: "invite_friends",
        telegramTarget: null
      },
      {
        title: "Kanala Katıl",
        description: "Resmi duyuru kanalımıza katıl",
        type: "special",
        points: 100,
        requiredAmount: 1,
        isActive: true,
        telegramAction: "join_channel",
        telegramTarget: "@mining_channel"
      }
    ];
    
    for (const task of defaultTasks) {
      await addDoc(collection(db, "tasks"), {
        ...task,
        createdAt: serverTimestamp()
      });
    }
  }
}

// User related functions
export async function getUserByTelegramId(telegramId: string): Promise<User | null> {
  try {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("telegramId", "==", telegramId));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const userDoc = querySnapshot.docs[0];
      return { 
        id: userDoc.id,
        ...userDoc.data() as Omit<User, 'id'>
      };
    }
    
    return null;
  } catch (error) {
    console.error("Error getting user by Telegram ID:", error);
    return null;
  }
}

export async function createUser(userData: Partial<User>): Promise<User | null> {
  try {
    const usersRef = collection(db, "users");
    
    // Default user values
    const newUser = {
      ...userData,
      level: 1,
      points: 0,
      miningSpeed: 10,
      lastMiningTime: Timestamp.now(),
      joinDate: Timestamp.now(),
      completedTasksCount: 0,
      boostUsageCount: 0
    };
    
    const docRef = await addDoc(usersRef, newUser);
    
    return {
      id: docRef.id,
      ...newUser
    } as User;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}

export async function updateUserPoints(userId: string, pointsToAdd: number): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const currentPoints = userDoc.data().points || 0;
      await updateDoc(userRef, {
        points: currentPoints + pointsToAdd
      });
      return true;
    }
    
    return false;
  } catch (error) {
    console.error("Error updating user points:", error);
    return false;
  }
}

export async function updateUserLastMiningTime(userId: string): Promise<boolean> {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      lastMiningTime: Timestamp.now()
    });
    return true;
  } catch (error) {
    console.error("Error updating last mining time:", error);
    return false;
  }
}

// Task related functions
export async function getTasks(type?: string): Promise<Task[]> {
  try {
    let tasksQuery;
    
    if (type) {
      tasksQuery = query(
        collection(db, "tasks"), 
        where("type", "==", type),
        where("isActive", "==", true)
      );
    } else {
      tasksQuery = query(
        collection(db, "tasks"),
        where("isActive", "==", true)
      );
    }
    
    const tasksSnapshot = await getDocs(tasksQuery);
    
    return tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  } catch (error) {
    console.error("Error getting tasks:", error);
    return [];
  }
}

export async function getAllTasks(): Promise<Task[]> {
  try {
    const tasksSnapshot = await getDocs(collection(db, "tasks"));
    
    return tasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Task));
  } catch (error) {
    console.error("Error getting all tasks:", error);
    return [];
  }
}

export async function createTask(taskData: Partial<Task>): Promise<Task | null> {
  try {
    const tasksRef = collection(db, "tasks");
    const docRef = await addDoc(tasksRef, {
      ...taskData,
      createdAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...taskData
    } as Task;
  } catch (error) {
    console.error("Error creating task:", error);
    return null;
  }
}

export async function updateTask(taskId: string, taskData: Partial<Task>): Promise<boolean> {
  try {
    const taskRef = doc(db, "tasks", taskId);
    await updateDoc(taskRef, taskData);
    return true;
  } catch (error) {
    console.error("Error updating task:", error);
    return false;
  }
}

export async function deleteTask(taskId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "tasks", taskId));
    return true;
  } catch (error) {
    console.error("Error deleting task:", error);
    return false;
  }
}

// User Tasks related functions
export async function getUserTasks(userId: string): Promise<UserTask[]> {
  try {
    const userTasksQuery = query(
      collection(db, "userTasks"),
      where("userId", "==", userId)
    );
    
    const userTasksSnapshot = await getDocs(userTasksQuery);
    const userTasks = userTasksSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as UserTask));
    
    // Get task details for each user task
    const tasksPromises = userTasks.map(async (userTask) => {
      const taskDoc = await getDoc(doc(db, "tasks", userTask.taskId));
      return {
        ...userTask,
        task: {
          id: taskDoc.id,
          ...taskDoc.data()
        } as Task
      };
    });
    
    return Promise.all(tasksPromises);
  } catch (error) {
    console.error("Error getting user tasks:", error);
    return [];
  }
}

export async function updateUserTaskProgress(
  userId: string, 
  taskId: string, 
  progress: number
): Promise<boolean> {
  try {
    // Check if user task exists
    const userTasksQuery = query(
      collection(db, "userTasks"),
      where("userId", "==", userId),
      where("taskId", "==", taskId)
    );
    
    const userTasksSnapshot = await getDocs(userTasksQuery);
    
    if (userTasksSnapshot.empty) {
      // Create new user task
      await addDoc(collection(db, "userTasks"), {
        userId,
        taskId,
        progress,
        isCompleted: false,
        createdAt: serverTimestamp()
      });
    } else {
      // Update existing user task
      const userTaskDoc = userTasksSnapshot.docs[0];
      const taskDoc = await getDoc(doc(db, "tasks", taskId));
      
      if (taskDoc.exists()) {
        const task = taskDoc.data() as Task;
        const isCompleted = progress >= task.requiredAmount;
        
        await updateDoc(doc(db, "userTasks", userTaskDoc.id), {
          progress,
          isCompleted,
          completedAt: isCompleted ? Timestamp.now() : null
        });
        
        // If task just completed, award points
        if (isCompleted && !userTaskDoc.data().isCompleted) {
          const userRef = doc(db, "users", userId);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            const user = userDoc.data() as User;
            await updateDoc(userRef, {
              points: user.points + task.points,
              completedTasksCount: (user.completedTasksCount || 0) + 1
            });
          }
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error("Error updating user task progress:", error);
    return false;
  }
}

// Boost related functions
export async function getBoostTypes(): Promise<BoostType[]> {
  try {
    const boostTypesQuery = query(
      collection(db, "boostTypes"),
      where("isActive", "==", true)
    );
    
    const boostTypesSnapshot = await getDocs(boostTypesQuery);
    
    return boostTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoostType));
  } catch (error) {
    console.error("Error getting boost types:", error);
    return [];
  }
}

export async function getAllBoostTypes(): Promise<BoostType[]> {
  try {
    const boostTypesSnapshot = await getDocs(collection(db, "boostTypes"));
    
    return boostTypesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as BoostType));
  } catch (error) {
    console.error("Error getting all boost types:", error);
    return [];
  }
}

export async function createBoostType(boostData: Partial<BoostType>): Promise<BoostType | null> {
  try {
    const boostTypesRef = collection(db, "boostTypes");
    const docRef = await addDoc(boostTypesRef, {
      ...boostData,
      createdAt: serverTimestamp()
    });
    
    return {
      id: docRef.id,
      ...boostData
    } as BoostType;
  } catch (error) {
    console.error("Error creating boost type:", error);
    return null;
  }
}

export async function updateBoostType(boostId: string, boostData: Partial<BoostType>): Promise<boolean> {
  try {
    const boostRef = doc(db, "boostTypes", boostId);
    await updateDoc(boostRef, boostData);
    return true;
  } catch (error) {
    console.error("Error updating boost type:", error);
    return false;
  }
}

export async function deleteBoostType(boostId: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, "boostTypes", boostId));
    return true;
  } catch (error) {
    console.error("Error deleting boost type:", error);
    return false;
  }
}

export async function getUserActiveBoosts(userId: string): Promise<UserBoost[]> {
  try {
    const now = Timestamp.now();
    const userBoostsQuery = query(
      collection(db, "userBoosts"),
      where("userId", "==", userId),
      where("isActive", "==", true)
    );
    
    const userBoostsSnapshot = await getDocs(userBoostsQuery);
    const userBoosts = userBoostsSnapshot.docs
      .map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserBoost))
      .filter(boost => boost.endTime.toDate() > now.toDate());
    
    // Get boost type details for each user boost
    const boostsPromises = userBoosts.map(async (userBoost) => {
      const boostTypeDoc = await getDoc(doc(db, "boostTypes", userBoost.boostTypeId));
      return {
        ...userBoost,
        boostType: {
          id: boostTypeDoc.id,
          ...boostTypeDoc.data()
        } as BoostType
      };
    });
    
    return Promise.all(boostsPromises);
  } catch (error) {
    console.error("Error getting user active boosts:", error);
    return [];
  }
}

export async function purchaseBoost(
  userId: string,
  boostTypeId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get user
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      return { success: false, error: "User not found" };
    }
    
    const user = userDoc.data() as User;
    
    // Get boost type
    const boostTypeRef = doc(db, "boostTypes", boostTypeId);
    const boostTypeDoc = await getDoc(boostTypeRef);
    
    if (!boostTypeDoc.exists()) {
      return { success: false, error: "Boost type not found" };
    }
    
    const boostType = boostTypeDoc.data() as BoostType;
    
    // Check if user has enough points
    if (user.points < boostType.price) {
      return { success: false, error: "Insufficient points" };
    }
    
    // Deduct points
    await updateDoc(userRef, {
      points: user.points - boostType.price,
      boostUsageCount: (user.boostUsageCount || 0) + 1
    });
    
    // Create user boost
    const startTime = Timestamp.now();
    const endTime = new Date(startTime.toDate().getTime() + boostType.durationHours * 60 * 60 * 1000);
    
    await addDoc(collection(db, "userBoosts"), {
      userId,
      boostTypeId,
      startTime,
      endTime: Timestamp.fromDate(endTime),
      isActive: true,
      createdAt: serverTimestamp()
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error purchasing boost:", error);
    return { success: false, error: "Failed to purchase boost" };
  }
}

// Referral related functions
export async function getUserReferrals(userId: string): Promise<Referral[]> {
  try {
    const referralsQuery = query(
      collection(db, "referrals"),
      where("referrerId", "==", userId)
    );
    
    const referralsSnapshot = await getDocs(referralsQuery);
    const referrals = referralsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Referral));
    
    // Get referred user details
    const referralsWithUsers = await Promise.all(
      referrals.map(async (referral) => {
        const referredUserDoc = await getDoc(doc(db, "users", referral.referredId));
        return {
          ...referral,
          referred: {
            id: referredUserDoc.id,
            ...referredUserDoc.data()
          } as User
        };
      })
    );
    
    return referralsWithUsers;
  } catch (error) {
    console.error("Error getting user referrals:", error);
    return [];
  }
}

export async function createReferral(
  referrerCode: string, 
  referredUser: User
): Promise<{ success: boolean; error?: string }> {
  try {
    // Find referrer by code
    const referrersQuery = query(
      collection(db, "users"),
      where("referralCode", "==", referrerCode)
    );
    
    const referrersSnapshot = await getDocs(referrersQuery);
    
    if (referrersSnapshot.empty) {
      return { success: false, error: "Invalid referral code" };
    }
    
    const referrer = {
      id: referrersSnapshot.docs[0].id,
      ...referrersSnapshot.docs[0].data()
    } as User;
    
    // Create referral
    await addDoc(collection(db, "referrals"), {
      referrerId: referrer.id,
      referredId: referredUser.id,
      points: 100,
      createdAt: serverTimestamp()
    });
    
    // Update referrer
    await updateDoc(doc(db, "users", referrer.id), {
      points: referrer.points + 100,
      // Boost mining speed by 5%
      miningSpeed: Math.floor(referrer.miningSpeed * 1.05)
    });
    
    return { success: true };
  } catch (error) {
    console.error("Error creating referral:", error);
    return { success: false, error: "Failed to create referral" };
  }
}

export async function getReferralCount(userId: string): Promise<number> {
  try {
    const referralsQuery = query(
      collection(db, "referrals"),
      where("referrerId", "==", userId)
    );
    
    const referralsSnapshot = await getDocs(referralsQuery);
    return referralsSnapshot.size;
  } catch (error) {
    console.error("Error getting referral count:", error);
    return 0;
  }
}

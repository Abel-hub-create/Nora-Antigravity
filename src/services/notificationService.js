import api from '../lib/api';

// Check if push notifications are supported
export const isPushSupported = () => {
  return 'serviceWorker' in navigator && 'PushManager' in window;
};

// Register service worker
export const registerServiceWorker = async () => {
  if (!isPushSupported()) {
    console.log('Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    console.log('Service Worker registered:', registration);
    return registration;
  } catch (error) {
    console.error('Service Worker registration failed:', error);
    return null;
  }
};

// Get VAPID public key from backend
export const getVapidPublicKey = async () => {
  const data = await api.get('/notifications/vapid-public-key');
  return data.publicKey;
};

// Convert VAPID key to Uint8Array
const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
};

// Subscribe to push notifications
export const subscribeToPush = async () => {
  if (!isPushSupported()) {
    throw new Error('Push notifications not supported');
  }

  // Request notification permission
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    throw new Error('Notification permission denied');
  }

  // Register service worker
  const registration = await registerServiceWorker();
  if (!registration) {
    throw new Error('Service worker registration failed');
  }

  // Get VAPID key
  const vapidPublicKey = await getVapidPublicKey();
  const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);

  // Subscribe
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: convertedVapidKey
  });

  // Send subscription to backend
  await api.post('/notifications/subscribe', { subscription });

  return subscription;
};

// Unsubscribe from push notifications
export const unsubscribeFromPush = async () => {
  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  // Notify backend
  await api.post('/notifications/unsubscribe');
};

// Get notification settings
export const getNotificationSettings = async () => {
  return await api.get('/notifications/settings');
};

// Update notification settings (enable/disable)
export const updateNotificationSettings = async (enabled) => {
  return await api.patch('/notifications/settings', { enabled });
};

// Sync daily progress to backend (for notification eligibility check)
export const syncDailyProgress = async (dailyGoals, progressPercentage, rewardClaimed, dailyStats = null) => {
  const payload = {
    dailyGoals,
    progressPercentage,
    rewardClaimed
  };

  // Include study times if provided
  if (dailyStats) {
    payload.quizTime = dailyStats.quizTime || 0;
    payload.flashcardsTime = dailyStats.flashcardsTime || 0;
    payload.summaryTime = dailyStats.summaryTime || 0;
    payload.xpAwarded = dailyStats.xpAwarded || {};
  }

  return await api.post('/notifications/sync-progress', payload);
};

// Get full daily progress from backend (on app load)
export const getDailyProgress = async () => {
  return await api.get('/notifications/daily-progress');
};

// Save study history when day changes
export const saveStudyHistory = async (studyDate, totalSeconds) => {
  return await api.post('/notifications/study-history', {
    studyDate,
    totalSeconds
  });
};

// Check if user is currently subscribed
export const isSubscribed = async () => {
  if (!isPushSupported()) {
    return false;
  }

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  return !!subscription;
};

// Get current notification permission status
export const getPermissionStatus = () => {
  if (!isPushSupported()) {
    return 'unsupported';
  }
  return Notification.permission;
};

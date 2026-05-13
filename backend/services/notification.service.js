/**
 * Dark Horse Messenger - Push Notification Service
 */

const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
let firebaseApp;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;
  try {
    const serviceAccount = require('../config/firebase-service-account.json');
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin error:', error.message);
  }
};

/**
 * Send push notification to a single device
 */
const sendPushNotification = async ({ token, title, body, data = {} }) => {
  try {
    if (!token) return;
    initFirebase();

    const message = {
      token,
      notification: { title, body },
      data: { ...data, click_action: 'FLUTTER_NOTIFICATION_CLICK' },
      webpush: {
        notification: {
          title,
          body,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200]
        },
        fcmOptions: {
          link: process.env.CLIENT_URL
        }
      }
    };

    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Notification error:', error.message);
  }
};

/**
 * Send notification to multiple devices
 */
const sendMulticastNotification = async ({ tokens, title, body, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) return;
    initFirebase();

    const message = {
      tokens,
      notification: { title, body },
      data,
      webpush: {
        notification: {
          title, body,
          icon: '/icons/icon-192x192.png'
        },
        fcmOptions: { link: process.env.CLIENT_URL }
      }
    };

    const response = await admin.messaging().sendEachForMulticast(message);
    console.log(`✅ Notifications sent: ${response.successCount}/${tokens.length}`);
    return response;
  } catch (error) {
    console.error('❌ Multicast notification error:', error.message);
  }
};

module.exports = { initFirebase, sendPushNotification, sendMulticastNotification };

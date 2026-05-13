/**
 * Dark Horse Messenger - Push Notification Service
 */

const admin = require('firebase-admin');

let firebaseApp;

const initFirebase = () => {
  if (firebaseApp) return firebaseApp;
  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
      private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: process.env.FIREBASE_CLIENT_ID,
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token'
    };

    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    console.log('✅ Firebase Admin initialized');
    return firebaseApp;
  } catch (error) {
    console.error('❌ Firebase Admin error:', error.message);
  }
};

const sendPushNotification = async ({ token, title, body, data = {} }) => {
  try {
    if (!token) return;
    initFirebase();
    const message = {
      token,
      notification: { title, body },
      data: { ...data },
      webpush: {
        notification: {
          title, body,
          icon: '/icons/icon-192x192.png',
          vibrate: [200, 100, 200]
        },
        fcmOptions: { link: process.env.CLIENT_URL }
      }
    };
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
    return response;
  } catch (error) {
    console.error('❌ Notification error:', error.message);
  }
};

const sendMulticastNotification = async ({ tokens, title, body, data = {} }) => {
  try {
    if (!tokens || tokens.length === 0) return;
    initFirebase();
    const message = {
      tokens, notification: { title, body }, data,
      webpush: {
        notification: { title, body, icon: '/icons/icon-192x192.png' },
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

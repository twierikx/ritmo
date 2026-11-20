// Firebase web configuration of the shared project (the same one Tómbola uses).
// These values identify the project; they are not secrets. Access is controlled by the Firestore rules.
export const firebaseConfig = {
  apiKey: 'AIzaSyCuppYbWiTkwtiTwRILFbwuEmj9lhhLQ3s',
  authDomain: 'tombola-59330.firebaseapp.com',
  projectId: 'tombola-59330',
  storageBucket: 'tombola-59330.firebasestorage.app',
  messagingSenderId: '706809549192',
  appId: '1:706809549192:web:8f7bbb916fc40c79c42a3d',
};

export const FIREBASE_SDK = 'https://www.gstatic.com/firebasejs/13.3.0';

// Public key of the Web Push certificate (Firebase, Cloud Messaging). Not a secret: the
// private half stays with Google.
export const VAPID_KEY = 'BMulAVHZSDoOek_6_oXEk0WroNN6MXqZWLFE7vsgoYLoNckTN8lVuekLBV9Sfd0pdvPHtcmBUlra9iJcyqDCv70';

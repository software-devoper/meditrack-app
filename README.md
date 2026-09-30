# MediTrack Pro - Pharmacy Management System

A production-grade, scalable, fully responsive Pharmacy Management Web Application built with React, TypeScript, Vite, and Firebase.

## Features

*   **Dashboard:** Real-time analytics, sales trends, and stock alerts.
*   **Inventory (Stock Management):** Manage medicines, batch numbers, tracking expiries, and stock ledgers.
*   **Purchase:** Record incoming stock and update inventory automatically via Firebase Transactions.
*   **Sales (POS):** Fast point-of-sale interface, auto GST calculation, and real-time inventory deduction.

## Setup Instructions

### 1. Firebase Project Setup

1.  Go to the [Firebase Console](https://console.firebase.google.com/).
2.  Create a new project.
3.  Navigate to **Build > Firestore Database** and click **Create database** (Native mode).
4.  Navigate to **Build > Authentication** and enable **Email/Password** sign-in provider.
5.  Navigate to **Project Settings > General**, scroll down, and add a **Web App**.
6.  Copy the Firebase configuration object.

### 2. Configure Environment Variables

Open the `.env` (or `.env.example`) file in the root of the project and paste your Firebase configuration:

```env
VITE_FIREBASE_API_KEY="your-api-key"
VITE_FIREBASE_AUTH_DOMAIN="your-auth-domain"
VITE_FIREBASE_PROJECT_ID="your-project-id"
VITE_FIREBASE_STORAGE_BUCKET="your-storage-bucket"
VITE_FIREBASE_MESSAGING_SENDER_ID="your-messaging-sender-id"
VITE_FIREBASE_APP_ID="your-app-id"
```

### 3. First-Time Initialization

Since the system uses an autonomous, admin-only authentication approach, there is no public sign-up page. 
Once you start the application and connect it to your Firebase instance, it will automatically detect if there are no users in the database and present you with a **Setup Screen** to create the very first Admin account.

### 4. Firestore Security Rules

Deploy these rules to your Firebase project to secure your data:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isAdmin() {
      return isAuthenticated() && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{userId} {
      allow read: if isAuthenticated();
      // Only admin can create/update users, except the initial bootstrap
      allow write: if isAdmin() || request.resource.data.createdBy == 'system';
    }

    match /products/{docId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }
    
    match /suppliers/{docId} {
      allow read: if isAuthenticated();
      allow create, update: if isAuthenticated();
      allow delete: if isAdmin();
    }

    match /sales/{docId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    
    match /purchases/{docId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
    
    match /stockLedger/{docId} {
      allow read, create: if isAuthenticated();
      allow update, delete: if isAdmin();
    }
  }
}
```

### 5. Admin Password Reset (Cloud Function)

To allow the admin to reset passwords for staff (since Firebase Client SDK only allows a user to reset their own), deploy the following Firebase Cloud Function:

```javascript
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.resetUserPassword = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'User must be logged in.');
  
  // Verify caller is admin
  const callerDoc = await admin.firestore().collection('users').doc(context.auth.uid).get();
  if (callerDoc.data().role !== 'admin') {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can reset passwords.');
  }

  const { uid, newPassword } = data;
  
  try {
    await admin.auth().updateUser(uid, { password: newPassword });
    return { success: true };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});
```

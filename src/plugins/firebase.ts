import firebase from 'firebase';

if (!firebase.apps.length) {
  // Please add your own API setting
  firebase.initializeApp({
    apiKey: 'AIzaSyCh_ZSBIAluW1O6c7MIIE4eIxilB_MSQ_Q',
    authDomain: 'next-ab9d9.firebaseapp.com',
    projectId: 'next-ab9d9',
    storageBucket: 'next-ab9d9.appspot.com',
    messagingSenderId: '480936522445',
    appId: '1:480936522445:web:5930b10a450eb0e410af84',
    measurementId: 'G-F70JY08BTT',
  });
}

export default firebase;

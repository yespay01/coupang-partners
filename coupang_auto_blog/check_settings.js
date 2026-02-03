const admin = require('firebase-admin');
const serviceAccount = require('./functions/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkSettings() {
  const doc = await db.collection('system_settings').doc('global').get();
  
  if (!doc.exists) {
    console.log('❌ 설정 문서가 존재하지 않습니다');
    return;
  }
  
  const data = doc.data();
  console.log('=== 이미지 설정 확인 ===');
  console.log(JSON.stringify(data.images, null, 2));
}

checkSettings().then(() => process.exit(0)).catch(err => {
  console.error('에러:', err);
  process.exit(1);
});

/* แอปมือถือ จ่ายเงินคนงาน — เก็บตัวโปรแกรมไว้ในเครื่อง ใช้ได้ตอนไม่มีเน็ต
   ตัวโปรแกรม: ดึงของใหม่จากเน็ตก่อน (ได้อัปเดตทันที) ถ้าไม่มีเน็ตใช้ตัวที่เก็บไว้
   ไม่ยุ่งกับการซิงก์ Firebase (ข้อมูลคนงานไม่ผ่านไฟล์นี้) */
var CACHE = 'payroll-app-v1';
var CORE = ['./update/', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png'];
var CDN = /^https:\/\/(www\.gstatic\.com\/firebasejs|cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|fonts\.googleapis\.com|fonts\.gstatic\.com)\//;

self.addEventListener('install', function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){ return c.addAll(CORE); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener('activate', function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener('fetch', function(e){
  var req = e.request;
  if(req.method !== 'GET') return;
  var url = new URL(req.url);
  var same = url.origin === self.location.origin;

  // หน้าโปรแกรม: เน็ตก่อน แล้วเก็บไว้ · ไม่มีเน็ต → ตัวที่เก็บไว้
  if(req.mode === 'navigate' || (same && /\/update\/(index\.html)?$/.test(url.pathname))){
    e.respondWith(fetch(req).then(function(res){
      if(res.ok){ var cp = res.clone(); caches.open(CACHE).then(function(c){ c.put('./update/', cp); }); }
      return res;
    }).catch(function(){
      return caches.match('./update/').then(function(r){ return r || caches.match(req); });
    }));
    return;
  }
  // ไฟล์ประกอบ (ไอคอน ฟอนต์ ไลบรารี): ใช้ของในเครื่องก่อน แล้วอัปเดตเบื้องหลัง
  if((same && !/version\.json$/.test(url.pathname)) || CDN.test(req.url)){
    e.respondWith(caches.match(req).then(function(hit){
      var net = fetch(req).then(function(res){
        if(res && (res.ok || res.type === 'opaque')){ var cp = res.clone(); caches.open(CACHE).then(function(c){ c.put(req, cp); }); }
        return res;
      }).catch(function(){ return hit; });
      return hit || net;
    }));
  }
});

git add routes/aqi.js
git commit -m "Improve city endpoint with better error handling"
git push origin master
```

Railway will auto-redeploy in ~1 minute.

---

## **Test It:**

After deployment, try these again:

### **Test 1: Bangkok (should work now)**
```
https://aqi-api-iqair-production.up.railway.app/api/aqi/city?city=Bangkok&country=Thailand
```

### **Test 2: London**
```
https://aqi-api-iqair-production.up.railway.app/api/aqi/city?city=London&country=United%20Kingdom
```

### **Test 3: Los Angeles (with state)**
```
https://aqi-api-iqair-production.up.railway.app/api/aqi/city?city=Los%20Angeles&state=California&country=USA
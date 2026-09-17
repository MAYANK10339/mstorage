# Mstorage - High-Performance Cloud Storage Web Application
**Developer & Creator: Mayank Mandrai**

Mstorage ek ultra-modern, high-speed cloud storage platform hai jisme zero emojis, 100% custom handcrafted SVG icons, aur pure self-contained architecture ka use kiya gaya hai. Isme koi bhi third-party file hosting API ya external dependence nahi hai.

---

## Key Features

1. **Frictionless Authentication (@username + 4-Digit PIN):**
   - Sirf apna `@username` aur 4-digit PIN enter karke account banayein aur login karein.
   - Kisi bhi device (Mobile, Tablet, Laptop) se 24/7 access karein.
2. **3 Dedicated Upload Buttons:**
   - **Upload Files:** Kisi bhi type ki multiple files select aur upload karein.
   - **Upload Zip:** Specialized archive file upload handler.
   - **Upload Folder:** Ek click me pura directory tree upload karein (`webkitdirectory` supported).
3. **No Limits & Safe Storage Protection:**
   - High-speed direct streaming download aur upload.
   - Configurable retention (Permanent, 24 Hours, 3 Days, 7 Days, 30 Days) taaki server storage kabhi overfill na ho.
   - Dashboard se single-click delete feature storage instantly free karne ke liye.
4. **Configurable Download Countdown Timers:**
   - Har file ke liye custom wait timer set karein (Instant 0s, 5s, 10s, 15s, 30s).
   - Shareable download page par live circular SVG countdown animation chalta hai aur countdown pura hone par high-speed download unlock hota hai.
5. **Native SVG QR Code Generation:**
   - Client-side 100% native QR code generator (zero external APIs).
6. **Mstorage vs Google Drive vs MediaFire Comparison:**
   - Live comparison matrix jo dikhata hai ki Mstorage kyu better, cleaner, aur ad-free hai.
7. **Developer Spotlight:**
   - Creator & Developer: **Mayank Mandrai**.

---

## Local Development / Apne Computer Pe Kaise Chalayein

1. **Dependencies install karein:**
   ```bash
   npm install
   ```

2. **Server start karein:**
   ```bash
   npm start
   ```

3. **Browser me open karein:**
   ```
   http://localhost:3000
   ```

---

## Render.com Se 24/7 Free Live Kaise Karein (PC Band Rakh Kar)

Render.com par aap Mstorage ko free me 24/7 live deploy kar sakte hain.

### Step 1: Code Ko GitHub Pe Push Karein
Apne computer ke terminal me Mstorage folder ke andar ye commands run karein:

```bash
git init
git add .
git commit -m "Mstorage Initial Release by Mayank Mandrai"
git branch -M main
```

Ab [GitHub.com](https://github.com) par ek nayi repository banayein (jaise `mstorage`) aur commands run karein:
```bash
git remote add origin https://github.com/<YOUR-GITHUB-USERNAME>/mstorage.git
git push -u origin main
```

---

### Step 2: Render.com Par Free Web Service Banayein

1. [Render.com](https://render.com) par free account banayein ya login karein.
2. Dashboard me **New +** button par click karein aur **Web Service** select karein.
3. Apni GitHub repository (`mstorage`) connect karein.
4. Render automatically settings detect kar lega (`render.yaml` ke dwara):
   - **Name:** `mstorage`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. **Create Web Service** button par click karein!
6. Render aapki website 2-3 minute me live kar dega aur aapko ek free live URL mil jayega (e.g. `https://mstorage.onrender.com`).

---

### Step 3: PC Band Rakh Kar 24/7 Kaise Active Rakhein (Never Sleep)

Render ka free web service 15 minute inactivity ke baad sleep mode me chala jata hai. Isko 24/7 awake rakhne ke liye:

1. [cron-job.org](https://cron-job.org) ya [UptimeRobot.com](https://uptimerobot.com) par free account banayein.
2. Ek naya monitor add karein:
   - **URL:** `https://your-app-name.onrender.com/api/system/stats`
   - **Interval:** Har 5 ya 10 minute
3. Ab ye service har 5-10 minute me aapke Render server ko ping karti rahegi, jisse aapka website **24/7 awake aur ultra-fast** rahega chahe aapka computer band ho!

---

## Technology Stack

- **Frontend:** HTML5, Vanilla CSS3 (Obsidian Cyber Glassmorphism), Modern Vanilla JavaScript.
- **Backend:** Node.js, Express.js.
- **Iconography:** 100% Handcrafted Crisp SVG Vectors (Zero Emojis).
- **Security:** Bcrypt salted hash PIN security, JWT session tokens.
- **Architecture:** Zero Third-Party Hosting Dependence, 100% Self-Contained.

---

## Author & Creator

- **Developer & Creator:** Mayank Mandrai
- **Project:** Mstorage
- **License:** MIT

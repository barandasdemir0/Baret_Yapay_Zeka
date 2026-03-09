from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO
import cv2
import numpy as np
import io
import os
from pathlib import Path
import uvicorn

app = FastAPI(title="Baret Tespiti API")

# Tüm originlere izin veren CORS ayarları ("*")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Statik dosyaların ('static' klasörü) sunulması
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    """
    Ana sayfaya (http://127.0.0.1:8000) girildiğinde index.html'i doğrudan açar.
    """
    html_path = Path("index.html")
    if html_path.exists():
        return HTMLResponse(content=html_path.read_text(encoding="utf-8"))
    return HTMLResponse(content="<h1>Hata: index.html bulunamadı!</h1>", status_code=404)

# 🚀 PRO HIZLANDIRMA: Modeli sadece site ilk açıldığında 1 kere yüklüyoruz.
# Böylece her fotoğraf yüklediğinde modeli baştan okumaz, site çok hızlı çalışır.
try:
    model = YOLO('best.pt')
    print("Yapay zeka beyni (best.pt) başarıyla yüklendi ve hazır!")
except Exception as e:
    print(f"HATA: best.pt dosyası yüklenemedi. Klasörde olduğundan emin ol. Hata: {e}")
    model = None

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Kullanıcıdan fotoğrafı alıp, YOLO modelini çalıştırıp 
    çizimli fotoğrafı frontend'e fırlatan uç nokta.
    """
    if model is None:
        raise HTTPException(status_code=500, detail="Model (best.pt) bulunamadı.")

    # 1. Fotoğrafı bellekte oku
    try:
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Görüntü okunamadı.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Geçersiz dosya formatı: {e}")

    # 2. YOLO modeli ile tahmin yap 
    # ✨ SİHİRLİ DOKUNUŞ: conf=0.50 eklendi. %50'den emin olmadıklarını (beyaz saç vb.) çizmeyecek.
    try:
        results = model(img, conf=0.50)
        
        # Çizimli (Baret tespiti yapılmış) fotoğrafı al (results[0].plot())
        annotated_img = results[0].plot()
    except Exception as e:
        print(f"Tahmin yapılırken hata oluştu: {e}")
        annotated_img = img # Hata olursa orijinal fotoğrafı geri döndür

    # 3. Çizimli fotoğrafı JPEG formatına encode et
    is_success, buffer = cv2.imencode(".jpg", annotated_img)
    if not is_success:
        raise HTTPException(status_code=500, detail="Görüntü encode edilemedi.")
    
    # 4. Bellek üzerinden StreamingResponse ile frontend'e fırlat (blob olarak)
    io_buf = io.BytesIO(buffer)
    return StreamingResponse(io_buf, media_type="image/jpeg")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
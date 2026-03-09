// DOM Elementlerini Seçimi
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileNameDisplay = document.getElementById('file-name');
const submitBtn = document.getElementById('submit-btn');
const loadingDiv = document.getElementById('loading');
const resultContainer = document.getElementById('result-container');
const resultImg = document.getElementById('result-img');
const errorMessage = document.getElementById('error-message');

let selectedFile = null;

// Dosya seçildiğinde state'i ve UI'ı güncelle
function handleFile(file) {
    if (file && file.type.startsWith('image/')) {
        selectedFile = file;
        fileNameDisplay.textContent = `Seçilen Dosya: ${file.name}`;
        fileNameDisplay.style.display = 'block';
        submitBtn.disabled = false; // Dosya seçilince butonu aktif et
        resultContainer.classList.remove('show'); // Eski sonucu gizle
        errorMessage.style.display = 'none';
    } else {
        alert("Lütfen geçerli bir resim dosyası seçin (JPG, PNG vb.).");
    }
}

// --- Drag & Drop (Sürükle & Bırak) Olayları ---
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover'); // Üzerindeyken çerçeveyi renklendir
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
        fileInput.files = e.dataTransfer.files; // input elemanına da eşitle
    }
});

// Input'a tıklanarak dosya seçildiğinde
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFile(e.target.files[0]);
    }
});

// Backend'e İstek Atma
submitBtn.addEventListener('click', async () => {
    if (!selectedFile) return;

    // UI'ı loading (yükleniyor) durumuna al
    submitBtn.disabled = true;
    loadingDiv.style.display = 'flex';
    resultContainer.classList.remove('show');
    errorMessage.style.display = 'none';
    
    // Resmi bellekten temizle
    resultImg.src = '';

    // Form datası oluştur (UploadFile uyması için)
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
        // FastAPI varsayılan olarak http://127.0.0.1:8000 portunda çalışacak
        const response = await fetch('http://127.0.0.1:8000/predict', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            throw new Error("Sunucu tarafında bir hata oluştu.");
        }

        // Gelen yanıtı Blob (ikili veri) olarak al
        const blob = await response.blob();
        
        // Blob'dan geçici bir tarayıcı URL'si oluştur ve img source'una ata
        const imageUrl = URL.createObjectURL(blob);
        resultImg.src = imageUrl;

        // Loading animasyonunu gizle
        loadingDiv.style.display = 'none';
        
        // Fade-in efekti ile sonucu göstermek için kısa bir gecikme ekliyoruz
        setTimeout(() => {
            resultContainer.classList.add('show');
        }, 100);

    } catch (error) {
        console.error("Hata:", error);
        loadingDiv.style.display = 'none';
        errorMessage.textContent = "Bağlantı hatası: Backend çalışmıyor olabilir veya hata verdi. Lütfen 'uvicorn main:app --reload' komutu ile arkayüzün çalıştığından emin olun.";
        errorMessage.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
    }
});

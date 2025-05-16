import os
import requests
import base64
from PIL import Image
import io
import json

# Gemini API Key
GEMINI_API_KEY = "YOUR_API_KEY"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

def verify_brain_image_with_gemini(image_path):
    """
    Gemini AI API'sini kullanarak görüntünün beyin MR görüntüsü olup olmadığını doğrular
    """
    try:
        # Görüntüyü aç
        image = Image.open(image_path).convert("RGB")
        
        # Görüntüyü base64'e dönüştür
        buffered = io.BytesIO()
        image.save(buffered, format="JPEG")
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Gemini API isteği için URL oluştur
        url = f"{GEMINI_API_URL}?key={GEMINI_API_KEY}"
        
        # Gemini API'sine gönderilecek istek gövdesini hazırla
        payload = {
            "contents": [{
                "parts": [
                    {"text": "Bu görüntü bir beyin MR görüntüsü mü? Sadece 'Evet' veya 'Hayır' şeklinde cevap ver."},
                    {"inline_data": {
                        "mime_type": "image/jpeg",
                        "data": img_str
                    }}
                ]
            }]
        }
        
        print("Gemini API'sine istek gönderiliyor...")
        
        # API isteğini gönder
        response = requests.post(url, json=payload)
        
        # Yanıtı işle
        if response.status_code == 200:
            result = response.json()
            print("Ham API yanıtı:")
            print(json.dumps(result, indent=2))
            
            if 'candidates' in result and len(result['candidates']) > 0:
                text_response = result['candidates'][0]['content']['parts'][0]['text']
                print(f"\nGemini yanıtı: {text_response}")
                is_brain_image = "evet" in text_response.lower()
                print(f"Beyin MR görüntüsü mü: {'Evet' if is_brain_image else 'Hayır'}")
                return is_brain_image
            else:
                print("Gemini yanıtı işlenemedi")
                return False
        else:
            print(f"Gemini API hatası: {response.status_code}")
            print(response.text)
            return False
    
    except Exception as e:
        print(f"Gemini doğrulama hatası: {str(e)}")
        return False

def main():
    print("=" * 50)
    print("GEMINI API GÖRÜNTÜ DOĞRULAMA TESTİ")
    print("=" * 50)
    
    # Test için görüntü yolunu al
    image_path = input("\nTest edilecek görüntü dosyasının yolunu girin: ")
    
    if not os.path.exists(image_path):
        print(f"HATA: {image_path} bulunamadı!")
        return
        
    print(f"Görüntü dosyası: {image_path}")
    result = verify_brain_image_with_gemini(image_path)
    
    print("\n" + "=" * 50)
    print(f"SONUÇ: {'Bu bir beyin MR görüntüsüdür.' if result else 'Bu bir beyin MR görüntüsü değildir.'}")
    print("=" * 50)

if __name__ == "__main__":
    main() 
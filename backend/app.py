from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
from transformers import BeitForImageClassification, BeitFeatureExtractor
import torch
import os
import traceback
import sys
from torchvision import transforms
import requests
import base64
import io

app = Flask(__name__)
CORS(app)

# CORS ayarlarını yapılandır
CORS(app, resources={
    r"/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Gemini API Key
GEMINI_API_KEY = "YOUR_API_KEY"
GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

# Model yükleme işlemlerini try-except bloğuna alalım
try:
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("\n" + "="*50)
    print(f"Kullanılan cihaz: {device}")
    print("="*50 + "\n")

    # Model dosyasının varlığını kontrol et
    model_path = os.path.join(os.path.dirname(__file__), "Brain_weights.pth")
    print(f"Model dosyası aranıyor: {model_path}")

    if not os.path.exists(model_path):
        print(f"HATA: {model_path} bulunamadı!")
        print("Lütfen model dosyasının backend klasöründe olduğundan emin olun.")
        sys.exit(1)

    # Model yükleme
    print("\nModel yükleniyor...")
    model_name = 'microsoft/beit-base-patch16-224-pt22k-ft22k'

    # Model mimarisini oluştur
    model = BeitForImageClassification.from_pretrained(
        model_name,
        num_labels=4,  # 4 sınıf
        ignore_mismatched_sizes=True
    )

    # Model ağırlıklarını yükle
    print("Model ağırlıkları yükleniyor...")
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.to(device)
    model.eval()

    # Feature extractor yükleme 
    print("Feature extractor yükleniyor...")
    feature_extractor = BeitFeatureExtractor.from_pretrained(model_name)

    # Görüntü dönüşümleri 
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    class_labels = ["glioma", "meningioma", "notumor", "pituitary"]
    print("\n" + "="*50)
    print("Model başarıyla yüklendi!")
    print("="*50 + "\n")

except Exception as e:
    print("\n" + "="*50)
    print("MODEL YÜKLEME HATASI!")
    print("="*50)
    print(f"\nHata mesajı: {str(e)}")
    print("\nHata detayı:")
    print(traceback.format_exc())
    print("="*50 + "\n")
    sys.exit(1)

def verify_brain_image_with_gemini(image):
    """
    Gemini AI API'sini kullanarak görüntünün beyin MR görüntüsü olup olmadığını doğrular
    """
    try:
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
        
        # API isteğini gönder
        response = requests.post(url, json=payload)
        
        # Yanıtı işle
        if response.status_code == 200:
            result = response.json()
            if 'candidates' in result and len(result['candidates']) > 0:
                text_response = result['candidates'][0]['content']['parts'][0]['text'].lower()
                print(f"Gemini yanıtı: {text_response}")
                return "evet" in text_response
            else:
                print("Gemini yanıtı işlenemedi")
                return False
        else:
            print(f"Gemini API hatası: {response.status_code}, {response.text}")
            return False
    
    except Exception as e:
        print(f"Gemini doğrulama hatası: {str(e)}")
        return False

@app.route('/predict', methods=['POST', 'OPTIONS'])
def predict():
    if request.method == 'OPTIONS':
        # CORS preflight request
        return '', 204

    try:
        print("\n" + "="*50)
        print("Yeni tahmin isteği alındı")
        print("="*50)

        if 'image' not in request.files:
            print("Hata: Resim dosyası bulunamadı")
            return jsonify({"error": "Resim yüklenmedi"}), 400

        image_file = request.files['image']
        print(f"\nDosya bilgileri:")
        print(f"- Ad: {image_file.filename}")
        print(f"- Tip: {image_file.content_type}")

        if not image_file.filename:
            print("Hata: Geçersiz dosya adı")
            return jsonify({"error": "Geçersiz dosya"}), 400

        # Görüntüyü açma
        image = Image.open(image_file).convert("RGB")
        
        # Gemini ile görüntüyü doğrula
        print("\nGemini ile görüntü doğrulanıyor...")
        is_brain_image = verify_brain_image_with_gemini(image)
        
        if not is_brain_image:
            print("Hata: Yüklenen görüntü beyin MR görüntüsü değil")
            return jsonify({
                "error": "Yüklenen görüntü beyin MR görüntüsü değil",
                "is_brain_image": False
            }), 400
        
        # Beyin görüntüsü doğrulandıysa, sınıflandırma yap
        print("Görüntü beyin MR olarak doğrulandı, sınıflandırma yapılıyor...")
        processed_image = transform(image).unsqueeze(0).to(device)

        # Model tahmini 
        print("Model tahmini yapılıyor...")
        with torch.no_grad():
            outputs = model(processed_image)
            probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
            predicted_class = torch.argmax(probabilities, dim=-1).item()
            confidence = probabilities[0][predicted_class].item()

            # Tüm sınıflar için olasılıkları hesapla
            predictions = []
            for i, prob in enumerate(probabilities[0]):
                predictions.append({
                    "class": class_labels[i],
                    "probability": f"{prob.item() * 100:.2f}%"
                })

        result = {
            "class": class_labels[predicted_class],
            "confidence": f"{confidence * 100:.2f}%",
            "all_predictions": sorted(predictions, key=lambda x: float(x["probability"].rstrip('%')), reverse=True),
            "is_brain_image": True
        }

        # Sonuçları güzel bir şekilde yazdır
        print("\n" + "="*50)
        print("TAHMİN SONUÇLARI")
        print("="*50)
        print(f"\nEn yüksek olasılıklı sınıf: {result['class'].upper()}")
        print(f"Güven oranı: {result['confidence']}")
        print("\nTüm sınıfların olasılıkları:")
        print("-"*30)
        for pred in result['all_predictions']:
            print(f"{pred['class'].upper():<15} : {pred['probability']:>10}")
        print("="*50 + "\n")

        return jsonify(result)

    except Exception as e:
        error_detail = traceback.format_exc()
        print("\n" + "="*50)
        print("HATA OLUŞTU!")
        print("="*50)
        print(f"\nHata mesajı: {str(e)}")
        print("\nHata detayı:")
        print(error_detail)
        print("="*50 + "\n")
        return jsonify({
            "error": "Görüntü işlenirken bir hata oluştu",
            "detail": str(e),
            "trace": error_detail
        }), 500

@app.route('/validate', methods=['POST', 'OPTIONS'])
def validate_image():
    """
    Sadece görüntünün beyin MR görüntüsü olup olmadığını doğrulayan endpoint
    """
    if request.method == 'OPTIONS':
        return '', 204

    try:
        if 'image' not in request.files:
            return jsonify({"error": "Resim yüklenmedi"}), 400

        image_file = request.files['image']

        if not image_file.filename:
            return jsonify({"error": "Geçersiz dosya"}), 400

        # Görüntüyü açma
        image = Image.open(image_file).convert("RGB")
        
        # Gemini ile görüntüyü doğrula
        is_brain_image = verify_brain_image_with_gemini(image)
        
        return jsonify({
            "is_brain_image": is_brain_image,
            "message": "Bu görüntü bir beyin MR görüntüsüdür." if is_brain_image else "Bu görüntü bir beyin MR görüntüsü değildir."
        })

    except Exception as e:
        error_detail = traceback.format_exc()
        return jsonify({
            "error": "Görüntü doğrulanırken bir hata oluştu",
            "detail": str(e),
            "trace": error_detail
        }), 500

if __name__ == '__main__':
    print("\n" + "="*50)
    print("BEYİN TÜMÖRÜ SINIFLANDIRMA API")
    print("="*50)
    print("\nEndpoint-1: http://localhost:5000/predict")
    print("Endpoint-2: http://localhost:5000/validate")
    print("CORS ayarları aktif")
    print("Gemini API entegrasyonu aktif")
    print("="*50 + "\n")
    app.run(debug=True, host='0.0.0.0', port=5000)
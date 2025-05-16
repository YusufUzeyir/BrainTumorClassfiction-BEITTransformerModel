# -*- coding: utf-8 -*-
from flask import Flask, request, jsonify # Flask kısımları kullanılmayacak ama kalsın
from flask_cors import CORS             # Flask kısımları kullanılmayacak ama kalsın
from PIL import Image
import torch
from transformers import BeitForImageClassification, BeitFeatureExtractor
import os
import traceback
import sys
from torchvision import transforms
import glob # Dosya listelemek için eklendi

# --- Flask App Tanımlamaları (Bu script için kullanılmayacak) ---
# app = Flask(__name__)
# CORS(app)
# CORS(app, resources={
#     r"/*": {
#         "origins": ["http://localhost:3000"],
#         "methods": ["GET", "POST", "OPTIONS"],
#         "allow_headers": ["Content-Type"]
#     }
# })
# --------------------------------------------------------------------

# --- Model ve Yardımcı Fonksiyonlar ---
try:
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print("\n" + "="*50)
    print(f"Kullanılan cihaz: {device}")
    print("="*50 + "\n")

    # Model dosyasının varlığını kontrol et (Script'in bulunduğu dizine göre)
    # __file__ bu script dosyasının yolunu verir.
    script_dir = os.path.dirname(os.path.abspath(__file__))
    model_path = os.path.join(script_dir, "Brain_weights.pth")
    print(f"Model dosyası aranıyor: {model_path}")

    if not os.path.exists(model_path):
        print(f"HATA: {model_path} bulunamadı!")
        print("Lütfen 'Brain_weights2.pth' model dosyasının bu script ile aynı klasörde olduğundan emin olun.")
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
    model.eval() # Modeli değerlendirme moduna al

    # Feature extractor yükleme
    print("Feature extractor yükleniyor...")
    feature_extractor = BeitFeatureExtractor.from_pretrained(model_name) # Bu aslında transform içinde kullanılmıyor ama kalsın

    # Görüntü dönüşümleri (API ile aynı olmalı)
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

# --- API Endpoint (Bu script için kullanılmayacak) ---
# @app.route('/predict', methods=['POST', 'OPTIONS'])
# def predict():
#     # ... (API kodu burada kalabilir ama çağrılmayacak) ...
#     pass
# --------------------------------------------------------

def test_directory_images(directory_path, expected_label):
    """
    Belirtilen dizindeki tüm görüntüleri işler ve beklenen etiketten
    farklı sınıflandırılanları listeler.
    """
    print("\n" + "="*60)
    print(f"DİZİN TESTİ BAŞLATILIYOR")
    print(f"Test Edilen Dizin: {directory_path}")
    print(f"Beklenen Etiket  : {expected_label}")
    print("="*60 + "\n")

    if not os.path.isdir(directory_path):
        print(f"HATA: Dizin bulunamadı -> {directory_path}")
        return

    if expected_label not in class_labels:
        print(f"HATA: Beklenen etiket '{expected_label}' modelin bildiği etiketlerde ({class_labels}) bulunmuyor.")
        return

    # Desteklenen resim formatları (küçük harfe çevirerek kontrol edilecek)
    supported_formats = ('.png', '.jpg', '.jpeg', '.bmp', '.tiff', '.gif')
    misclassified_files = []
    processed_count = 0
    error_files = []

    # Klasördeki tüm dosyaları al
    try:
        all_files_in_dir = os.listdir(directory_path)
        image_files = [f for f in all_files_in_dir if f.lower().endswith(supported_formats)]
        total_images = len(image_files)
        print(f"Dizinde {total_images} adet resim dosyası bulundu.\n")

        if total_images == 0:
            print("Test edilecek resim dosyası bulunamadı.")
            return

    except Exception as e:
        print(f"HATA: Dizin okunurken bir sorun oluştu: {e}")
        return


    # Her bir resim dosyasını işle
    for i, filename in enumerate(image_files):
        file_path = os.path.join(directory_path, filename)
        try:
            # Görüntüyü açma ve işleme
            image = Image.open(file_path).convert("RGB")
            processed_image = transform(image).unsqueeze(0).to(device) # Batch boyutu ekle ve cihaza gönder

            # Model tahmini
            with torch.no_grad(): # Gradyan hesaplamasını kapat (inferans için)
                outputs = model(processed_image)
                probabilities = torch.nn.functional.softmax(outputs.logits, dim=-1)
                predicted_class_idx = torch.argmax(probabilities, dim=-1).item()
                predicted_label = class_labels[predicted_class_idx]
                confidence = probabilities[0][predicted_class_idx].item()

            processed_count += 1
            # İlerleme durumu (her satırı güncellemek yerine arada bir yazdırabiliriz)
            if (i + 1) % 10 == 0 or (i + 1) == total_images:
                 print(f"İşlenen: {processed_count}/{total_images} - Son dosya: {filename} -> Tahmin: {predicted_label} ({confidence*100:.2f}%)")

            # Yanlış sınıflandırmayı kontrol et
            if predicted_label != expected_label:
                misclassified_files.append({
                    "filename": filename,
                    "predicted_label": predicted_label,
                    "confidence": confidence
                })
                print(f"*** YANLIŞ SINIFLANDIRMA ***: {filename} -> '{predicted_label}' olarak tahmin edildi (%{confidence*100:.2f})")


        except Exception as e:
            print(f"\n!!! HATA: '{filename}' dosyası işlenirken hata oluştu: {str(e)}")
            error_files.append(filename)
            # traceback.print_exc() # Detaylı hata için bu satırı açabiliriz

    # --- Sonuçları Yazdır ---
    print("\n" + "="*60)
    print("DİZİN TESTİ TAMAMLANDI")
    print("="*60)
    print(f"Toplam {total_images} resim dosyası bulundu.")
    print(f"Başarıyla işlenen resim sayısı: {processed_count}")
    if error_files:
        print(f"İşlenirken Hata Alınan Dosya Sayısı: {len(error_files)}")
        # print("Hatalı dosyalar:", error_files) 

    print("-" * 30)

    if not misclassified_files:
        print(f"Tebrikler! '{directory_path}' dizinindeki tüm işlenen resimler '{expected_label}' olarak doğru sınıflandırıldı.")
    else:
        print(f"'{directory_path}' dizininde '{expected_label}' dışında farklı sınıflandırılan {len(misclassified_files)} dosya bulundu:")
        # Güven skoruna göre sıralayabiliriz (isteğe bağlı)
        # misclassified_files.sort(key=lambda x: x['confidence'], reverse=True)
        for item in misclassified_files:
            print(f"  - Dosya: {item['filename']:<30} | Tahmin Edilen: {item['predicted_label']:<15} | Güven: {item['confidence']*100:.2f}%")

    print("="*60 + "\n")


# --- Ana Çalıştırma Bloğu ---
if __name__ == '__main__':
    print("\n" + "="*50)
    print("BEYİN TÜMÖRÜ SINIFLANDIRMA - DİZİN TEST MODU")
    print("="*50)

    # --- Test Edilecek Dizin ve Beklenen Etiket ---
    target_directory_to_test = r"C:\Users\ASUS\Desktop\BrainDataSets\archive\BrainDataset\glioma"
    expected_class_label = "glioma" # Bu dizindeki resimlerin olması beklenen etiket

    # --- Test Fonksiyonunu Çağır ---
    test_directory_images(target_directory_to_test, expected_class_label)

    # --- API'yi çalıştırmak isterseniz aşağıdaki yorum satırlarını kaldırın ---
    # print("\n" + "="*50)
    # print("Flask API başlatılıyor (eğer yorum satırı kaldırıldıysa)...")
    # print("Endpoint: http://localhost:5000/predict")
    # print("="*50 + "\n")
    # app.run(debug=True, host='0.0.0.0', port=5000)
    # --------------------------------------------------------------------------

    print("Script tamamlandı.")
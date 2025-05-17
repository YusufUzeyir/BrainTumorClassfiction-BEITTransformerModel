# Beyin Tümörü Sınıflandırma Projesi (BEiT Transformer Modeli)

Bu proje, beyin MR (Manyetik Rezonans) görüntülerindeki tümörleri sınıflandırmak için bir BEiT (Bidirectional Encoder representation from Image Transformers) modeli kullanır. Proje, bir Python/Flask backend'i ve bir React frontend'inden oluşmaktadır.


### Özellikler

* **Model:** Beyin MR görüntülerinden tümörleri (glioma, meningioma, pituitary) ve tümör olmayan durumları sınıflandırmak için ince ayarlanmış BEiT Transformer modeli kullanılır.
* **Backend (Flask):** Yüklenen MR görüntülerinin beyin MR görüntüsü olup olmadığını doğrulamak için Gemini API'sini kullanır ve ardından tümör sınıflandırması yapar. Sınıflandırma sonuçlarını JSON formatında döndürür.
* **Frontend (React):** Kullanıcı arayüzü sağlar, MR görüntüsü yüklemeye, analiz sonuçlarını görüntülemeye ve tümör türleri hakkında bilgi edinmeye olanak tanır. Chart.js kütüphanesi ile tahmin olasılıklarını görselleştirir.

### Kurulum

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin:

1.  **Depoyu Klonlayın:**
    ```bash
    git clone https://github.com/YusufUzeyir/BrainTumorClassfiction-BEITTransformerModel.git
    cd BrainTumorClassfiction-BEITTransformerModel
    ```
2.  **Backend Kurulumu:**
    * `backend` klasörüne gidin: `cd backend`
    * Gerekli Python bağımlılıklarını yükleyin: `pip install -r requirements.txt`
    * **Model Ağırlıkları:** `Brain_weights.pth` dosyasının `backend` klasöründe bulunduğundan emin olun. Bu dosya modelin eğitilmiş ağırlıklarını içerir.
    * **Gemini API Anahtarı:** `backend/app.py` dosyasında bulunan `GEMINI_API_KEY` değişkenine kendi Gemini API anahtarınızı ekleyin.
3.  **Frontend Kurulumu:**
    * `frontend` klasörüne gidin: `cd ../frontend`
    * Gerekli Node.js bağımlılıklarını yükleyin: `npm install`

### Çalıştırma

1.  **Backend'i Başlatın:**
    * `backend` klasöründe olduğunuzdan emin olun.
    * Flask uygulamasını çalıştırın: `python app.py`
    * Backend varsayılan olarak `http://localhost:5000` adresinde çalışacaktır.
2.  **Frontend'i Başlatın:**
    * `frontend` klasöründe olduğunuzdan emin olun.
    * React uygulamasını başlatın: `npm start`
    * Frontend varsayılan olarak `http://localhost:3000` adresinde çalışacaktır.

Tarayıcınızda `http://localhost:3000` adresine giderek uygulamaya erişebilirsiniz.

### Kullanım

Uygulama arayüzünde "MR Görüntüsü Yükle" alanına beyin MR görüntünüzü sürükleyip bırakın veya tıklayarak dosya seçin. Desteklenen formatlar `.jpg`, `.png`, `.bmp`, `.tif`'tir. Görüntüyü seçtikten sonra "Analizi Başlat" butonuna tıklayın. Uygulama görüntüyü doğrulayacak ve ardından tümör sınıflandırmasını yapacaktır. Sonuçlar arayüzde görüntülenecektir. Tümör tespit edildiğinde, tümör türü hakkında detaylı bilgi ve tedavi seçenekleri de sunulacaktır.

**Önemli Not:** Bu uygulama yalnızca bir demo niteliğindedir ve profesyonel tıbbi teşhis yerine geçmez. Lütfen tıbbi konularda her zaman bir sağlık uzmanına danışın.

### Model Eğitimi

Model eğitimi için `backend/ModelTrain.ipynb` Jupyter Notebook dosyasını kullanabilirsiniz. Model, başlıca [Kaggle'da bulunan bu veri seti](https://www.kaggle.com/code/yousefmohamed20/brain-tumor-mri-accuracy-99/notebook) kullanılarak eğitilmiştir. Bu notebook, veri yükleme, model tanımlama, eğitim süreci ve model ağırlıklarının kaydedilmesi adımlarını içermektedir. Eğitim için uygun bir beyin tümörü veri setine ihtiyacınız olacaktır.

### Model Eğitimi Sonuçları

Model, `ModelTrain.ipynb` dosyasında detaylandırılan eğitim süreciyle belirli sayıda epoch boyunca eğitilmiştir. Eğitim süresince ve doğrulama veri seti üzerinde elde edilen temel metrikler aşağıda tablo halinde sunulmuştur. Bu metrikler, modelin öğrenme performansını ve genelleme yeteneğini göstermektedir.

| Epoch | Eğitim Kaybı (Train Loss) | Eğitim Doğruluğu (Train Accuracy) | Doğrulama Kaybı (Validation Loss) | Doğrulama Doğruluğu (Validation Accuracy) | F1 Skoru (F1-Score) |
| :---- | :------------------------- | :-------------------------------- | :-------------------------------- | :---------------------------------------- | :------------------ |
| 1     | ~0.5                       | ~80%                              | ~0.4                              | ~85%                                      | ~0.84               |
| 2     | ~0.3                       | ~90%                              | ~0.25                             | ~92%                                      | ~0.91               |
| 3     | ~0.2                       | ~94%                              | ~0.18                             | ~95%                                      | ~0.95               |
| 4     | ~0.15                      | ~96%                              | ~0.15                             | ~96.5%                                    | ~0.96               |
| 5     | ~0.1                       | ~97%                              | ~0.13                             | ~97%                                      | ~0.97               |

*Not: Yukarıdaki değerler, `ModelTrain.ipynb` dosyasındaki eğitim çıktılarından elde edilen örnek/yaklaşık değerlerdir. Gerçek eğitim sonuçları, kullanılan veri setine, hiperparametrelere ve eğitim süresince gerçekleşen rastgeleliğe bağlı olarak biraz farklılık gösterebilir.*

Tabloda görüldüğü gibi, epoch'lar ilerledikçe eğitim ve doğrulama kaybı azalmakta, doğruluk ve F1 skoru ise artmaktadır. F1 skoru, sınıflandırma problemlerinde Precision (Kesinlik) ve Recall (Geri Çağırma) değerlerinin harmonik ortalamasıdır ve modelin performansı hakkında dengeli bir görüş sunar, özellikle sınıflar arası dengesizlik olduğunda kullanışlıdır.

### Ekran Görüntüleri

Aşağıda uygulamanın farklı aşamalarından ekran görüntüleri bulunmaktadır:

#### Ana Sayfa ve Görüntü Yükleme Alanı

Uygulamanın başlangıç arayüzü ve kullanıcıların MR görüntülerini yükleyebileceği bölüm.

![image](https://github.com/user-attachments/assets/f4d76dfc-5b12-4d7b-8cc1-c5d32054195a)

#### Analiz Sonuçları ve Tümör Bilgisi

Yüklenen görüntünün analiz edilmesi sonucunda elde edilen tümör sınıflandırması, güven skoru, olasılık dağılımları ve tümör hakkında detaylı bilgi.

![Ekran görüntüsü 2025-05-16 124908](https://github.com/user-attachments/assets/0227e363-59e3-4029-9c87-598643f5ae7b)

#### Backend Terminal Çıktısı (Görüntü Doğrulama ve Sınıflandırma)

Backend'in Gemini API ile görüntüyü doğrulama ve model ile sınıflandırma adımlarındaki terminal çıktıları.

![Ekran görüntüsü 2025-05-16 124946](https://github.com/user-attachments/assets/2c10bdf6-ec28-4d3a-9460-85410f7946b9)



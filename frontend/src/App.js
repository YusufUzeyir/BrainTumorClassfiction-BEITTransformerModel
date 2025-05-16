import React, { useState } from 'react';
import axios from 'axios';
// React Bootstrap Bileşenleri
import { Spinner, Accordion } from 'react-bootstrap';
// İkonlar
import { FaBrain } from 'react-icons/fa';
import { FiUploadCloud, FiBarChart2, FiInfo, FiAlertTriangle, FiCheckCircle, FiXCircle } from 'react-icons/fi';
// Chart.js ve React wrapper (Pie eklendi)
import { Bar, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // ArcElement eklendi (Pie/Doughnut için gerekli)
  Title,
  Tooltip,
  Legend
} from 'chart.js';
// Veri Etiketleri Eklentisi (Grafik üzerine olasılık yazdırmak için)
import ChartDataLabels from 'chartjs-plugin-datalabels';
// Lottie Animasyon Bileşeni
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
// CSS Dosyaları
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap CSS
import './App.css'; // Özel CSS dosyamız

// Chart.js global ayarları ve Element/Eklenti Kayıtları
ChartJS.defaults.color = '#a0a8d0'; // Genel metin rengi
ChartJS.defaults.borderColor = 'rgba(0, 245, 201, 0.2)'; // Genel kenarlık rengi
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement, // Pie/Doughnut için
  Title,
  Tooltip,
  Legend,
  ChartDataLabels // Veri etiketleri eklentisi
);

// Tümör bilgilerini içeren sabit (Değişmedi)
const tumorInfo = {
    glioma: {
      title: 'Glioma Tümörü Bilgisi',
      description: 'Gliomalar, beynin destek hücrelerinden (glial hücreler) kaynaklanan tümörlerdir. Beyin kanserlerinin yaklaşık %30\'unu oluştururlar ve farklı agresiflik düzeylerinde olabilirler.',
      symptoms: ['Baş ağrısı (özellikle sabahları daha şiddetli)','Nöbetler','Kişilik değişiklikleri','Bulantı ve kusma','Görme problemleri','Konuşma zorluğu','Vücudun bir tarafında güçsüzlük veya uyuşma'],
      treatment: ['Cerrahi müdahale (tümörün mümkün olduğunca çıkarılması)','Radyoterapi','Kemoterapi (özellikle Temozolomide ilacı)','Hedefli tedaviler','Klinik denemeler']
    },
    meningioma: {
      title: 'Meningioma Tümörü Bilgisi',
      description: 'Meningiomalar, beyni ve omuriliği çevreleyen zarlardan (meninges) kaynaklanan tümörlerdir. Genellikle yavaş büyürler ve çoğunlukla iyi huyludurlar. En yaygın görülen primer beyin tümörü tipidir.',
      symptoms: ['Baş ağrısı','Bulanık veya çift görme','Koku duyusunda kayıp','Kol veya bacaklarda güçsüzlük','Hafıza kaybı','Nöbetler','İşitme kaybı veya kulak çınlaması'],
      treatment: ['Cerrahi rezeksiyon (tümörün tamamen çıkarılması)','Radyoterapi (özellikle cerrahi tam başarılı olamadığında)','Stereotaktik radyocerrahi','Düzenli görüntüleme ve takip (küçük ve belirti göstermeyen tümörler için)']
    },
    notumor: {
      title: 'Tümör Tespit Edilmedi',
      description: 'Görüntüde herhangi bir beyin tümörü belirtisi tespit edilmemiştir. Bu durum, semptomların başka bir nedenden kaynaklanabileceğini gösterebilir.',
      symptoms: ['Görüntüde tümör tespit edilmemiş olsa da, yaşanılan semptomların araştırılması önemlidir','Baş ağrılarının, görme problemlerinin veya diğer nörolojik semptomların başka nedenleri olabilir'],
      treatment: ['Semptomların başka olası nedenleri için ek testler yapılması','Nörolojik muayene','Takip görüntülemeleri','Semptomatik tedavi']
    },
    pituitary: {
      title: 'Hipofiz (Pituitary) Tümörü Bilgisi',
      description: 'Hipofiz tümörleri, beynin tabanındaki hipofiz bezinde gelişen anormal büyümelerdir. Çoğunlukla iyi huyludurlar ancak hormonal dengesizliklere ve çevre dokulara basınç uygulayabilirler.',
      symptoms: ['Baş ağrısı','Görme problemleri (özellikle periferik görme kaybı)','Hormonal dengesizlikler','Aşırı terleme','Yüz ve ellerde şişme','Kilo değişimleri','Üreme ve cinsel fonksiyon sorunları','Yorgunluk ve güçsüzlük'],
      treatment: ['İlaç tedavisi (bazı tümör tipleri için)','Cerrahi müdahale (genellikle transsfenoidal yaklaşım ile)','Radyoterapi veya radyocerrahi','Hormon replasman tedavisi','Düzenli endokrinolojik takip']
    }
};

// Ana Uygulama Bileşeni
function App() {
  // State Değişkenleri
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false); // Artık string değeri alabilir: false, 'validating', 'classifying'
  const [error, setError] = useState(null);

  // Resim Yükleme İşleyicisi
  const handleImageUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      // Önceki önizlemeyi bellekten kaldır
      if (previewImage) {
        URL.revokeObjectURL(previewImage);
      }
      // Yeni önizleme oluştur
      setPreviewImage(URL.createObjectURL(file));
      // Sonuçları ve hataları temizle
      setResult(null);
      setError(null);
    }
  };

  // Analiz Başlatma İşleyicisi (Adım adım yükleme durumu gösterimi ile)
  const handleSubmit = async () => {
    if (!selectedImage) {
      setError('Lütfen analiz için bir MR görüntüsü seçin.');
      return;
    }

    const startTime = performance.now(); // Analiz başlangıç zamanı
    setLoading('validating'); // İlk adım: Görüntü doğrulama
    setError(null);
    setResult(null); // Önceki sonuçları temizle

    const formData = new FormData();
    formData.append('image', selectedImage);

    let apiResult = null; // API sonucunu geçici saklamak için
    let apiError = null;  // API hatasını geçici saklamak için

    try {
      // İlk adım: Görüntünün beyin MR olup olmadığını doğrula
      const validateResponse = await axios.post('http://localhost:5000/validate', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 15000 // 15 saniye zaman aşımı
      });
      
      // Doğrulama başarısız ise hata mesajı göster
      if (!validateResponse.data.is_brain_image) {
        apiError = "Yüklenen görüntü beyin MR görüntüsü değil. Lütfen geçerli bir beyin MR görüntüsü yükleyin.";
        return;
      }
      
      // İkinci adım: Tümör sınıflandırması
      setLoading('classifying'); // Durum güncellendi: Tümör sınıflandırma
      
      // Backend API'sine sınıflandırma isteği gönder
      const classifyResponse = await axios.post('http://localhost:5000/predict', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30000 // 30 saniye zaman aşımı
      });
      
      apiResult = classifyResponse.data; // Başarılı sonucu al
    } catch (err) {
      console.error('API Hatası:', err);
      // Hata türüne göre kullanıcı dostu mesaj oluştur
      if (err.code === 'ECONNABORTED') {
        apiError = 'Sunucu yanıt vermedi (Timeout). Lütfen tekrar deneyin veya yönetici ile iletişime geçin.';
      } else if (err.response) {
        if (err.response.data.error === "Yüklenen görüntü beyin MR görüntüsü değil") {
          apiError = 'Bu görüntü beyin MR görüntüsü değil. Lütfen geçerli bir beyin MR görüntüsü yükleyin.';
        } else {
          apiError = `Analiz sırasında bir hata oluştu: ${err.response.data.error || 'Sunucu hatası'}. Lütfen farklı bir görüntü deneyin veya yönetici ile iletişime geçin.`;
        }
      } else if (err.request) {
         apiError = 'Sunucuya ulaşılamadı. Lütfen internet bağlantınızı ve sunucu durumunu kontrol edin.';
      } else {
         apiError = 'İstek gönderilirken bir hata oluştu. Lütfen tekrar deneyin.';
      }
    } finally {
      // İstek ne kadar sürerse sürsün bu blok çalışır
      const endTime = performance.now(); // Analiz bitiş zamanı
      const elapsedTime = endTime - startTime; // Geçen süre (ms)
      const minDisplayTime = 2000; // Minimum gösterim süresi (2 saniye)

      // Minimum süreden daha az sürdüyse, kalan süreyi hesapla
      const remainingTime = Math.max(0, minDisplayTime - elapsedTime);

      // Yükleme durumunu bitirmeden önce 'remainingTime' kadar bekle
      setTimeout(() => {
        if (apiResult) { // Başarılı sonuç varsa state'i güncelle
          setResult(apiResult);
          setError(null);
        } else { // Hata varsa state'i güncelle
          setError(apiError);
          setResult(null);
        }
        setLoading(false); // Yükleme animasyonunu durdur
      }, remainingTime);
    }
  };

  // Sınıf adını daha okunabilir hale getiren fonksiyon
  const getClassDisplayName = (className) => {
    switch (className?.toLowerCase()) {
      case 'glioma': return 'Glioma Tümörü';
      case 'meningioma': return 'Meningioma Tümörü';
      case 'notumor': return 'Tümör Yok';
      case 'pituitary': return 'Hipofiz Tümörü';
      default: return className || 'Bilinmeyen';
    }
  };

   // Grafik verilerini hazırlayan fonksiyon (Bar ve Pie için uyumlu)
   const getChartData = () => {
    if (!result || !result.all_predictions || !Array.isArray(result.all_predictions)) return null;

    // Olasılığa göre büyükten küçüğe sırala
    const sortedPredictions = [...result.all_predictions].sort((a, b) =>
        parseFloat(b.probability?.replace('%', '') || 0) - parseFloat(a.probability?.replace('%', '') || 0)
    );

    // Grafikler için etiketler (sınıf adları) ve veriler (olasılıklar)
    const labels = sortedPredictions.map(p => getClassDisplayName(p.class));
    const data = sortedPredictions.map(p => parseFloat(p.probability?.replace('%', '') || 0));

    // Sınıflara göre renk haritası
    const classColorMap = {
        glioma: 'rgba(235, 32, 32, 0.7)',      // Kırmızımsı
        meningioma: 'rgba(52, 152, 219, 0.7)', // Mavi
        notumor: 'rgba(46, 204, 113, 0.7)',    // Yeşil
        pituitary: 'rgba(155, 89, 182, 0.7)'   // Mor
    };
    const defaultColor = 'rgba(150, 150, 150, 0.7)'; // Bilinmeyen için Gri

    // Veriye göre renkleri ata
    const backgroundColors = sortedPredictions.map(p => classColorMap[p.class?.toLowerCase()] || defaultColor);
    // Kenarlık renklerini biraz daha opak yap
    const borderColors = backgroundColors.map(color => color.replace('0.7', '1'));

    // Chart.js'in beklediği formatta veri objesi döndür
    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
          borderRadius: 4, // Bar chart için (Pie göz ardı eder)
        },
      ],
    };
  };

  // DİKEY Bar Grafik Seçenekleri (Veri Etiketleri ile)
  const verticalBarChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false }, // Göstergeyi gizle (Pie'da var)
      title: { display: false }, // Başlığı biz ekliyoruz (h5)
      tooltip: { // Fare üzerine gelince çıkan bilgi kutusu
        backgroundColor: 'rgba(10, 15, 46, 0.9)',
        titleColor: '#e0e0ff',
        bodyColor: '#a0a8d0',
        padding: 10,
        cornerRadius: 6,
        displayColors: false, // Renk kutucuğunu gizle
        callbacks: {
            label: function(context) {
                let label = 'Olasılık'; // Varsayılan etiket
                if (context.parsed.y !== null) { // Dikey barda değer y eksenindedir
                    label += ': ' + context.parsed.y.toFixed(2) + '%';
                }
                return label;
            }
        }
      },
      // Veri Etiketleri: Olasılıkları doğrudan çubuklara yazar
      datalabels: {
        color: '#e0e0ff', // Etiket rengi
        anchor: 'end', // Çubuğun sonuna yerleştir
        align: 'top', // Çubuğun üstüne hizala
        formatter: (value) => value.toFixed(1) + '%', // Değeri % olarak formatla
        font: { weight: 'bold', size: 11 },
        // Çok düşük değerleri gizle (isteğe bağlı)
        display: (context) => context.dataset.data[context.dataIndex] > 1 // %1'den büyükse göster
      }
    },
    scales: { // Eksen ayarları
      x: { // Yatay Eksen (Kategoriler - Sınıflar)
        grid: { display: false }, // Kılavuz çizgilerini gizle
        ticks: { color: '#e0e0ff' }, // Eksen yazı rengi
      },
      y: { // Dikey Eksen (Değerler - Olasılık %)
        beginAtZero: true, // 0'dan başla
        max: 100, // Maksimum 100 olsun
        grid: { // Kılavuz çizgileri
             color: 'rgba(0, 245, 201, 0.1)', // Soluk renk
             borderColor: 'rgba(0, 245, 201, 0.2)' // Ana çizgi
        },
        ticks: { // Eksen değerleri
            color: '#a0a8d0', // Yazı rengi
            callback: (value) => value + '%' // Değerlere % ekle
        },
      }
    }
  };

  // Dairesel (Pie) Grafik Seçenekleri (Veri Etiketleri ile)
  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { // Gösterge (Sınıf adları ve renkleri)
        position: 'bottom', // Altta göster
        labels: {
          color: '#a0a8d0', // Yazı rengi
          padding: 15, // Boşluk
          font: { size: 11 }
        }
      },
      title: { display: false }, // Başlığı biz ekliyoruz (h5)
      tooltip: { // Fare üzerine gelince çıkan bilgi kutusu
        backgroundColor: 'rgba(10, 15, 46, 0.9)',
        titleColor: '#e0e0ff',
        bodyColor: '#a0a8d0',
        padding: 10,
        cornerRadius: 6,
        displayColors: true, // Renk kutucuklarını göster
        callbacks: {
            label: function(context) {
                let label = context.label || ''; // Sınıf adı
                let value = context.parsed || 0; // Olasılık değeri
                if (label) { label += ': '; }
                label += value.toFixed(2) + '%'; // Formatla
                return label;
            }
        }
      },
       // Veri Etiketleri: Olasılıkları doğrudan dilimlere yazar
      datalabels: {
        color: (context) => { // Etiket rengini dilim rengine göre ayarla (isteğe bağlı)
          // Açık renkli dilimler için koyu, koyu dilimler için açık renk kullanılabilir
          // Basitçe şimdilik koyu renk kullanalım
          return '#0a0f2e';
        },
        formatter: (value, context) => {
          const percentage = value.toFixed(1) + '%';
          // Sadece belirli bir yüzdenin üzerindekileri göster (kalabalığı azaltmak için)
          return value > 0.01 ? percentage : ''; // %0.01'ten büyükse göster
        },
        font: { weight: 'bold', size: 12 },
        // Etiketin konumu (ark, kenar vb.)
        // anchor: 'center',
        // align: 'center'
      }
    }
    // Pie chart için 'scales' kullanılmaz
  };


  // JSX - Arayüzü Oluşturma
  return (
    <div className="app-container">
      {/* Sayfa Başlığı */}
      <header className="app-header">
        <h1>
          <FaBrain className="brain-icon" /> Beyin Tümörü Analizi
        </h1>
        <p>Makine Öğrenmesi Destekli Tümör Sınıflandırması</p>
      </header>

      {/* Ana İçerik (Yükleme ve Sonuç Kartları) */}
      <main className="main-content">

        {/* Yükleme Kartı */}
        <div className="styled-card upload-section">
          <div className="card-header-custom">
            <FiUploadCloud className="icon" />
            <h4>MR Görüntüsü Yükle</h4>
          </div>

          {/* Hata Mesajı Alanı */}
          {error && !loading && (
             <div className="error-alert" role="alert">
               <FiAlertTriangle style={{ marginRight: '0.5rem', verticalAlign: 'middle' }}/> {error}
             </div>
           )}

          {/* Dosya Yükleme Alanı */}
          <label htmlFor="file-upload" className="file-input-wrapper">
            <input
              id="file-upload"
              type="file"
              accept="image/jpeg, image/png, image/bmp, image/tiff" // Kabul edilen dosya türleri
              onChange={handleImageUpload} // Değişiklikte fonksiyonu çağır
              disabled={loading} // Yükleme sırasında devre dışı bırak
              style={{ display: 'none' }} // Gerçek inputu gizle
            />
            <FiUploadCloud className="file-input-icon" />
            <span className="file-input-text">Görüntüyü Buraya Sürükleyin</span>
            <span className="file-input-hint">veya tıklayarak seçin (.jpg, .png, .bmp, .tif)</span>
          </label>

          {/* Önizleme Alanı */}
          <div className="preview-area">
            {previewImage ? (
              <div className="preview-image-container">
                <img src={previewImage} alt="Yüklenen MR Görüntüsü Önizlemesi" className="preview-image" />
              </div>
            ) : (
              <p style={{ color: 'var(--text-secondary)' }}>Önizleme burada görünecek</p>
            )}
          </div>

          {/* Analiz Butonu */}
          <button
            className="analyze-button"
            disabled={!selectedImage || loading} // Resim seçilmediyse veya yükleme varsa devre dışı
            onClick={handleSubmit} // Tıklanınca analizi başlat
          >
            {loading ? ( // Yükleme varsa Spinner göster
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
                <span style={{ marginLeft: '0.5rem' }}>
                  {loading === 'validating' && 'Görüntü Doğrulanıyor...'}
                  {loading === 'classifying' && 'Tümör Sınıflandırılıyor...'}
                  {loading !== 'validating' && loading !== 'classifying' && 'Analiz Ediliyor...'}
                </span>
              </>
            ) : ( // Yükleme yoksa normal metin ve ikon
              <>
                <FiBarChart2 />
                <span style={{ marginLeft: '0.5rem' }}>Analizi Başlat</span>
              </>
            )}
          </button>
        </div> {/* Yükleme Kartı Sonu */}


        {/* Sonuç Kartı */}
        <div className="styled-card results-section">
          <div className="card-header-custom">
             <FiBarChart2 className="icon" />
             <h4>Analiz Sonuçları</h4>
          </div>

          {/* Duruma Göre İçerik Gösterimi */}

          {/* 1. Başlangıç Durumu (Sonuç yok, yükleme yok) */}
          {!result && !loading && (
             <div className="results-placeholder">
                <FiBarChart2 className="icon" />
                <p>Analiz sonuçları burada görüntülenecektir.</p>
             </div>
          )}

          {/* 2. Yükleme Durumu (Aşamalı gösterim) */}
          {loading && (
            <div className="results-loading">
              {/* Lottie Animasyonu */}
              <div style={{ width: '400px', height: '400px', margin: '0 auto', marginBottom: '1rem' }}>
                <DotLottieReact
                  src="https://lottie.host/65660fe6-3c39-48a7-8c64-c1704912dbaa/jXPfMxFjpq.lottie"
                  loop
                  autoplay
                />
              </div>
              {/* Yükleme Durumu Mesajı - Aşamaya göre değişir */}
              <div className="loading-status">
                {loading === 'validating' && (
                  <>
                    <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={{ marginRight: '0.5rem' }} />
                      Görüntü Doğrulanıyor
                    </h3>
                    <p>Yüklenen görüntünün beyin MR görüntüsü olup olmadığı kontrol ediliyor...</p>
                  </>
                )}
                {loading === 'classifying' && (
                  <>
                    <h3 style={{ color: 'var(--primary-color)', marginBottom: '1rem' }}>
                      <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" style={{ marginRight: '0.5rem' }} />
                      Tümör Sınıflandırılıyor
                    </h3>
                    <p>Görüntü beyin MR olarak doğrulandı, şimdi tümör analizi yapılıyor...</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 3. Sonuç Gösterim Durumu (Sonuç var, yükleme bitti) */}
          {result && !loading && (
             <div className="result-display">
                {/* En Yüksek Olasılıklı Tahmin */}
                <div className={`prediction-highlight ${result.class?.toLowerCase()}`}>
                    <div className="prediction-class">{getClassDisplayName(result.class)}</div>
                    <div className="prediction-confidence">Güven Skoru: {result.confidence}</div>
                    {/* Güven Skoru Çubuğu */}
                    <div className="confidence-bar-container">
                        <div className="confidence-bar-inner" style={{ width: result.confidence }}></div>
                    </div>
                </div>

                {/* Grafik Alanı (Dikey Bar + Pie) */}
                 <div className="chart-area-container">
                     {/* Dikey Bar Grafik */}
                     <div className="chart-container">
                         <h5>Olasılık Dağılımı (Bar)</h5>
                         {getChartData() && ( // Veri hazırsa grafiği oluştur
                             <Bar data={getChartData()} options={verticalBarChartOptions} />
                         )}
                     </div>
                     {/* Dairesel Grafik */}
                     <div className="chart-container">
                          <h5>Olasılık Dağılımı (Pie)</h5>
                         {getChartData() && ( // Veri hazırsa grafiği oluştur
                             <Pie data={getChartData()} options={pieChartOptions} />
                         )}
                     </div>
                 </div> {/* Grafik Alanı Sonu */}
             </div> // Result Display Sonu
           )}
        </div> {/* Sonuç Kartı Sonu */}

      </main> {/* Ana İçerik Sonu */}


      {/* Tümör Bilgi Bölümü (Sadece tümör varsa ve yükleme bittiyse gösterilir) */}
      {result && !loading && result.class !== 'notumor' && (
        <section className="tumor-info-section">
          {/* Tümör tipine göre stil alan kart */}
          <div className={`styled-card tumor-info-card ${result.class?.toLowerCase()}`}>
             {/* Kart Başlığı */}
             <div className="tumor-info-header">
                {/* Tümör tipine göre ikon */}
                {result.class === 'glioma' && <FiXCircle className="icon" />}
                {result.class === 'meningioma' && <FiInfo className="icon" />}
                {result.class === 'pituitary' && <FiAlertTriangle className="icon" />}
                 {/* Tümör başlığı */}
                 <h4>{tumorInfo[result.class]?.title || 'Tümör Bilgisi'}</h4>
             </div>
             {/* Kart İçeriği */}
             <div className="tumor-info-body">
                 {/* Açıklama */}
                 <p className="tumor-description">{tumorInfo[result.class]?.description || 'Açıklama bulunamadı.'}</p>

                {/* Açılır/Kapanır Bilgi Panelleri (Accordion) */}
                <Accordion defaultActiveKey={['0','1']} alwaysOpen className="styled-accordion">
                    {/* Belirtiler Paneli */}
                    {tumorInfo[result.class]?.symptoms && tumorInfo[result.class].symptoms.length > 0 && (
                        <Accordion.Item eventKey="0">
                        <Accordion.Header>
                           <FiInfo style={{ marginRight: '0.5rem' }} /> Belirtiler ve Semptomlar
                        </Accordion.Header>
                        <Accordion.Body>
                             <ul className="info-list">
                             {tumorInfo[result.class].symptoms.map((symptom, index) => (
                                <li key={index}><span className="list-icon symptom-icon">•</span>{symptom}</li>
                             ))}
                            </ul>
                        </Accordion.Body>
                        </Accordion.Item>
                    )}
                    {/* Tedavi Paneli */}
                     {tumorInfo[result.class]?.treatment && tumorInfo[result.class].treatment.length > 0 && (
                        <Accordion.Item eventKey="1">
                        <Accordion.Header>
                            <FiCheckCircle style={{ marginRight: '0.5rem' }} /> Tedavi Seçenekleri
                        </Accordion.Header>
                        <Accordion.Body>
                             <ul className="info-list">
                             {tumorInfo[result.class].treatment.map((treatment, index) => (
                                <li key={index}><span className="list-icon treatment-icon">✓</span>{treatment}</li>
                             ))}
                            </ul>
                            {/* Feragatname */}
                            <div className="disclaimer-alert" role="alert">
                                <strong>Önemli Not:</strong> Bu bilgiler yalnızca genel bilgilendirme amaçlıdır ve profesyonel tıbbi tavsiye yerine geçmez. Kesin tanı ve tedavi için lütfen bir sağlık uzmanına danışın.
                            </div>
                        </Accordion.Body>
                        </Accordion.Item>
                    )}
                </Accordion> {/* Accordion Sonu */}
             </div> {/* Kart İçeriği Sonu */}
          </div> {/* Tümör Bilgi Kartı Sonu */}
        </section> /* Tümör Bilgi Bölümü Sonu */
      )}


      {/* Sayfa Alt Bilgisi (Footer) */}
      <footer className="app-footer">
        <p>Beyin Tümörü Sınıflandırma Sistemi &copy; {new Date().getFullYear()}</p>
        <span className="version-badge">Version 2.1.0</span> {/* version bilgisi :) */}
        <span className="version-badge">Developed by Uzeyir</span> {/* geliiştirici bilgisi :) */}
      </footer>

    </div> // App Container Sonu
  );
} // App Fonksiyonu Sonu

// Bileşeni dışa aktar
export default App;
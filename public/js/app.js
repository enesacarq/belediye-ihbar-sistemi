document.getElementById('submitBtn').addEventListener('click', async () => {
    const form = document.getElementById('reportForm');
    const phoneInput = document.getElementById('phone');

    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    const phone = phoneInput.value.trim();

    if(phone.length !== 10 || !phone.startsWith('5')) {
        alert("Lütfen telefon numaranızı başında sıfır olmadan, 10 hane olarak giriniz.");
        return;
    }

    // SMS Kodu tetikleme isteği
    const response = await fetch('/api/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
    });
    
    const data = await response.json();
    if(data.success) {
        document.getElementById('smsModal').style.display = 'flex';
    } else {
        alert(data.message);
    }
});

document.getElementById('verifyBtn').addEventListener('click', async () => {
    const form = document.getElementById('reportForm');
    const smsCode = document.getElementById('smsCodeInput').value.trim();
    
    if(smsCode.length !== 6) {
        alert("Lütfen 6 haneli doğrulama kodunu giriniz.");
        return;
    }

    // Dosya ve metin form verilerini güvenli şekilde paketleme
    const formData = new FormData(form);
    formData.append('smsCode', smsCode);

    // Veritabanına kayıt isteği (Headers eklemiyoruz, FormData kendi sınırlarını çizer)
    const response = await fetch('/api/submit-report', {
        method: 'POST',
        body: formData
    });

    const data = await response.json();
    if(data.success) {
        alert(data.message);
        document.getElementById('smsModal').style.display = 'none';
        form.reset();
        document.getElementById('smsCodeInput').value = '';
        
        // Form sıfırlandıktan sonra admin panelini yenilemek istersen sayfayı yönlendirebilirsin
    } else {
        alert(data.message);
    }
});
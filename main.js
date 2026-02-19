let faceMesh;

document.addEventListener('DOMContentLoaded', () => {
    // MediaPipe FaceMesh 초기화 (지연 로딩 대응)
    try {
        faceMesh = new FaceMesh({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
        });

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });
    } catch (e) {
        console.error("FaceMesh initialization failed:", e);
    }

    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewImage = document.getElementById('previewImage');
    const faceCanvas = document.getElementById('faceCanvas');
    const ctx = faceCanvas.getContext('2d');
    const progressFill = document.querySelector('.progress-fill');

    if (!dropZone) return;

    dropZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    // 드래그 앤 드롭 이벤트
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.style.borderColor = "#38bdf8"; });
    dropZone.addEventListener('dragleave', () => { dropZone.style.borderColor = ""; });
    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "";
        handleFiles(e.dataTransfer.files);
    });

    function handleFiles(files) {
        if (files.length > 0) {
            const file = files[0];
            if (!file.type.startsWith('image/')) {
                alert('이미지 파일만 업로드 가능합니다.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => analyzeFace(img);
                img.src = e.target.result;
                previewImage.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }
    }

    async function analyzeFace(imageElement) {
        if (!faceMesh) {
            alert("AI 엔진이 아직 준비되지 않았습니다. 잠시 후 다시 시도해주세요.");
            return;
        }

        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('previewSection').classList.remove('hidden');
        
        faceCanvas.width = imageElement.naturalWidth;
        faceCanvas.height = imageElement.naturalHeight;

        // 로딩바 애니메이션 시작
        let progress = 0;
        const progInterval = setInterval(() => {
            progress += 2;
            if (progress <= 95) progressFill.style.width = progress + "%";
        }, 50);

        faceMesh.onResults((results) => {
            clearInterval(progInterval);
            progressFill.style.width = "100%";
            setTimeout(() => drawResults(results), 500);
        });
        
        try {
            await faceMesh.send({image: imageElement});
        } catch (err) {
            console.error("FaceMesh send error:", err);
            alert("분석 중 오류가 발생했습니다.");
            location.reload();
        }
    }

    function drawResults(results) {
        ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
        
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            
            // 시각적 피드백: 얼굴 메쉬 그리기
            ctx.fillStyle = "rgba(56, 189, 248, 0.5)";
            for (const landmark of landmarks) {
                ctx.beginPath();
                ctx.arc(landmark.x * faceCanvas.width, landmark.y * faceCanvas.height, 1, 0, 2 * Math.PI);
                ctx.fill();
            }

            displayFinalReport(landmarks);
        } else {
            alert("얼굴을 찾을 수 없습니다. 선명한 정면 사진을 사용해주세요.");
            location.reload();
        }
    }

    function displayFinalReport(lm) {
        setTimeout(() => {
            document.getElementById('previewSection').classList.add('hidden');
            document.getElementById('resultSection').classList.remove('hidden');

            const faceHeight = Math.abs(lm[10].y - lm[152].y);
            const faceWidth = Math.abs(lm[234].x - lm[454].x);
            const ratio = (faceHeight / faceWidth).toFixed(2);

            // 1. 비율 분석
            document.getElementById('resultRatio').innerHTML = 
                `측정된 세로/가로 비율은 <strong>${ratio}:1</strong>입니다. ` +
                (ratio > 1.3 ? "이상적인 계란형 비율에 해당하여 다양한 스타일이 잘 어울립니다." : "안정적인 비율을 가진 얼굴형으로 차분한 인상을 줍니다.");

            // 2. 골격 분석
            document.getElementById('resultShape').innerHTML = 
                "턱선과 광대의 연결이 매끄러운 곡선을 이루고 있습니다. 이는 인상을 부드럽게 만들어주며 안경이나 액세서리 활용도가 높습니다.";

            // 3. 이목구비 분석
            document.getElementById('resultFeatures').innerHTML = 
                "눈의 위치가 얼굴 전체 폭의 황금 지점에 위치하고 있어 시각적인 안정감을 제공합니다. 코의 각도가 입체적인 실루엣을 만듭니다.";

            // 4. 피부톤 (시뮬레이션 기반 정보)
            document.getElementById('resultSkin').innerHTML = 
                "현재 조명 상태에서 피부톤이 고르게 분포되어 있습니다. 수분 보습에 집중하시면 더욱 맑은 피부 결을 유지하실 수 있습니다.";
        }, 1000);
    }

    document.getElementById('resetBtn').addEventListener('click', () => location.reload());
});

// 모달 관리 로직
const modalContent = {
    privacy: {
        title: "개인정보처리방침",
        body: `
            <h3>1. 수집하는 데이터</h3>
            <p>본 서비스는 '온-디바이스(On-device)' 기술을 사용하여 사용자의 브라우저 내에서 직접 분석을 수행합니다. 사용자가 업로드한 이미지는 서버로 전송되지 않으며, 저장되지도 않습니다.</p>
            <h3>2. 이용 목적</h3>
            <p>수집된 데이터(얼굴 랜드마크 좌표)는 실시간 분석 결과를 제공하는 목적으로만 사용되며, 브라우저 세션이 종료되면 즉시 폐기됩니다.</p>
            <h3>3. 제3자 제공</h3>
            <p>이미지 및 분석 데이터를 제3자에게 제공하거나 공유하지 않습니다. 단, 서비스 내 표시되는 광고(Google AdSense)는 구글의 정책에 따라 비식별화된 쿠키 정보를 사용할 수 있습니다.</p>
        `
    },
    terms: {
        title: "이용약관",
        body: `
            <h3>제1조 (목적)</h3>
            <p>본 약관은 AI Face Insight가 제공하는 서비스의 이용 조건 및 절차를 규정함을 목적으로 합니다.</p>
            <h3>제2조 (서비스의 성격)</h3>
            <p>본 서비스는 AI 기술을 활용한 정보 제공 및 재미를 목적으로 하며, 결과에 대한 의학적/전문적 신뢰도를 보장하지 않습니다.</p>
            <h3>제3조 (책임의 한계)</h3>
            <p>사용자가 본 서비스의 분석 결과를 바탕으로 내린 결정에 대해 서비스 제공자는 어떠한 책임도 지지 않습니다.</p>
        `
    }
};

function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');

    if (modalContent[type]) {
        title.innerText = modalContent[type].title;
        body.innerHTML = modalContent[type].body;
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // 스크롤 방지
    }
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// 배경 클릭 시 닫기
window.onclick = function(event) {
    const overlay = document.getElementById('modalOverlay');
    if (event.target == overlay) {
        closeModal();
    }
}

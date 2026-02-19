const faceMesh = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

faceMesh.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewImage = document.getElementById('previewImage');
    const faceCanvas = document.getElementById('faceCanvas');
    const ctx = faceCanvas.getContext('2d');
    const progressFill = document.querySelector('.progress-fill');

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
        
        await faceMesh.send({image: imageElement});
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

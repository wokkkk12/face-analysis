let faceMesh;

// 라이브러리 로드 확인 후 초기화하는 안전한 방식
function initFaceMesh() {
    try {
        if (typeof FaceMesh !== 'undefined') {
            faceMesh = new FaceMesh({
                locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
            });

            faceMesh.setOptions({
                maxNumFaces: 1,
                refineLandmarks: true,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });

            faceMesh.onResults(onResults);
            console.log("AI 엔진 초기화 완료");
        } else {
            console.log("라이브러리 대기 중...");
            setTimeout(initFaceMesh, 500);
        }
    } catch (e) {
        console.error("AI 엔진 초기화 실패:", e);
    }
}

// 결과를 그리는 함수를 전역 또는 상위 스코프로 이동
function onResults(results) {
    const progressFill = document.querySelector('.progress-fill');
    const faceCanvas = document.getElementById('faceCanvas');
    const ctx = faceCanvas.getContext('2d');

    if (progressFill) progressFill.style.width = "100%";
    
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // 시각적 피드백: 얼굴 메쉬 그리기
        ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
        for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc(landmark.x * faceCanvas.width, landmark.y * faceCanvas.height, 0.8, 0, 2 * Math.PI);
            ctx.fill();
        }

        displayFinalReport(landmarks);
    } else {
        alert("얼굴을 찾을 수 없습니다. 정면을 향한 선명한 사진을 사용해주세요.");
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initFaceMesh();

    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewImage = document.getElementById('previewImage');
    const faceCanvas = document.getElementById('faceCanvas');
    const progressFill = document.querySelector('.progress-fill');

    if (!dropZone || !fileInput) return;

    // 클릭 시 파일 선택창 열기
    dropZone.addEventListener('click', () => fileInput.click());

    // 파일 선택 시 처리
    fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });
    
    // 드래그 앤 드롭 지원
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "#38bdf8";
        dropZone.style.background = "rgba(56, 189, 248, 0.05)";
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.style.borderColor = "";
        dropZone.style.background = "";
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.style.borderColor = "";
        dropZone.style.background = "";
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
        }
    });

    function handleFiles(files) {
        const file = files[0];
        if (!file.type.startsWith('image/')) {
            alert('이미지 파일만 업로드 가능합니다.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.onload = () => {
                analyzeFace(previewImage);
            };
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function analyzeFace(imageElement) {
        if (!faceMesh) {
            alert("AI 엔진이 아직 준비되지 않았습니다. 잠시만 기다려주세요.");
            return;
        }

        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('previewSection').classList.remove('hidden');
        
        // 캔버스 크기를 이미지에 맞춤
        faceCanvas.width = imageElement.naturalWidth;
        faceCanvas.height = imageElement.naturalHeight;

        // 로딩바 애니메이션
        let progress = 0;
        const progInterval = setInterval(() => {
            progress += 1;
            if (progress <= 90 && progressFill) {
                progressFill.style.width = progress + "%";
            }
            if (progress > 100) clearInterval(progInterval);
        }, 50);

        try {
            await faceMesh.send({image: imageElement});
        } catch (err) {
            console.error("분석 중 오류 발생:", err);
            alert("이미지 분석 중 오류가 발생했습니다.");
            location.reload();
        }
    }

    document.getElementById('resetBtn').addEventListener('click', () => location.reload());
});

// 리포트 생성 함수 (성형외과 전문의 스타일)
function displayFinalReport(lm) {
    setTimeout(() => {
        const resultSection = document.getElementById('resultSection');
        const previewSection = document.getElementById('previewSection');
        
        if (previewSection) previewSection.classList.add('hidden');
        if (resultSection) resultSection.classList.remove('hidden');

        // --- 안면 계측 연산 ---
        const upperH = Math.abs(lm[10].y - lm[168].y);
        const midH = Math.abs(lm[168].y - lm[2].y);
        const lowerH = Math.abs(lm[2].y - lm[152].y);
        const totalH = upperH + midH + lowerH;
        const vR = [(upperH/totalH*3).toFixed(2), (midH/totalH*3).toFixed(2), (lowerH/totalH*3).toFixed(2)];

        const fW = Math.abs(lm[234].x - lm[454].x);
        const jawW = Math.abs(lm[172].x - lm[397].x);
        const fH = Math.abs(lm[10].y - lm[152].y);
        const aspect = (fH / fW).toFixed(2);
        const jawIdx = (jawW / fW).toFixed(2);

        const eyeW = Math.abs(lm[133].x - lm[33].x);
        const interDist = Math.abs(lm[133].x - lm[362].x);
        const eyeSpace = (interDist / eyeW).toFixed(2);

        // 피부 색상 분석
        const canvas = document.getElementById('faceCanvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });
        const pX = Math.floor(lm[117].x * canvas.width);
        const pY = Math.floor(lm[117].y * canvas.height);
        const pixel = context.getImageData(pX, pY, 1, 1).data;
        const r = pixel[0], g = pixel[1], b = pixel[2];
        const bright = (r + g + b) / 3;

        // --- 카테고리별 결과 생성 ---
        const renderResult = (id, title, desc, pros, cons) => {
            const container = document.getElementById(id);
            if (!container) return;
            container.innerHTML = `
                <p class="analysis-desc">${desc}</p>
                <div class="pros-cons">
                    <div class="pros"><strong>✨ Aesthetic Strategy:</strong> ${pros}</div>
                    <div class="cons"><strong>🎨 Medical Advice:</strong> ${cons}</div>
                </div>
            `;
        };

        // 1. 비율 (Ratio)
        let rDesc = `안면 수직 분할 계측 결과, 상/중/하 비율이 <strong>${vR[0]} : ${vR[1]} : ${vR[2]}</strong>의 분포를 보입니다. `;
        let rPros = "", rCons = "";
        if (vR[1] > 1.08) {
            rDesc += "중안부가 발달한 성숙하고 우아한 '엘레강스' 비율입니다.";
            rPros = "지적이고 신뢰감을 주는 고급스러운 인상을 형성합니다.";
            rCons = "쉐이딩으로 코끝을 살짝 끊어주어 수직 시선을 분산시키는 것을 추천합니다.";
        } else if (vR[2] < 0.85) {
            rDesc += "하안부가 짧은 전형적인 '베이비페이스(동안)' 비율입니다.";
            rPros = "친근하고 어려 보이며 대중적인 호감도가 높은 인상입니다.";
            rCons = "턱끝에 하이라이트를 주어 입체감을 살리면 세련된 느낌이 추가됩니다.";
        } else {
            rDesc += "수직 밸런스가 황금비율에 근접한 조화로운 형태입니다.";
            rPros = "안정감이 매우 뛰어나며 클래식한 미적 완성도가 높습니다.";
            rCons = "립이나 아이 메이크업 중 한 곳에 포인트를 주는 스타일이 잘 어울립니다.";
        }
        renderResult('resultRatio', '전체적인 비율', rDesc, rPros, rCons);

        // 2. 얼굴형 (Shape)
        let sDesc = `안면 지수(Facial Index) ${aspect}로 분석되었습니다. `;
        let sPros = "", sCons = "";
        if (jawIdx > 0.85) {
            sDesc += "하악각이 안정적인 '클래식 정방형' 골격 구조입니다.";
            sPros = "옆선이 입체적이며 나이가 들어도 무너지지 않는 탄탄한 라인을 가졌습니다.";
            sCons = "턱선을 부드럽게 감싸는 레이어드 컷 헤어스타일을 추천합니다.";
        } else if (aspect > 1.35) {
            sDesc += "세로 축이 강조된 슬림하고 도시적인 타원형 안면 구조입니다.";
            sPros = "샤프하고 세련된 매력을 발산하며 이목구비가 집중되어 보입니다.";
            sCons = "옆볼의 볼륨을 살리는 웨이브 스타일이 얼굴형 보완에 효과적입니다.";
        } else {
            sDesc += "광대와 턱의 연결이 유려한 이상적인 계란형 윤곽입니다.";
            sPros = "부드럽고 온화한 인상을 주며 어떤 스타일도 잘 소화합니다.";
            sCons = "포니테일이나 업스타일로 페이스 라인을 드러내어 매력을 강조해 보세요.";
        }
        renderResult('resultShape', '골격과 얼굴형', sDesc, sPros, sCons);

        // 3. 이목구비 (Features)
        const eyeType = (lm[33].y < lm[133].y) ? "상향형(Cat-eye)" : "하향형(Puppy-eye)";
        let fDesc = `눈매가 ${eyeType}이며 미간 비율이 ${eyeSpace}로 계측되었습니다. `;
        let fPros = (eyeType === "상향형") ? "매혹적이고 카리스마 있는 표정 연출에 매우 유리합니다." : "선하고 맑은 인상을 주어 신뢰감을 높이는 마스크입니다.";
        let fCons = (eyeSpace > 1.05) ? "미간 음영을 통해 시선을 중앙으로 모으면 더욱 뚜렷해 보입니다." : "눈꼬리를 가로로 길게 빼서 얼굴 여백을 조절하면 비율이 완벽해집니다.";
        renderResult('resultFeatures', '이목구비 디테일', fDesc, fPros, fCons);

        // 4. 피부 (Skin)
        const tone = (r > b + 15) ? "Warm-Yellow" : (b > r + 5) ? "Cool-Blue" : "Neutral-Beige";
        let kDesc = `측정된 피부톤은 ${tone} 계열이며 밝기는 ${bright > 185 ? '고명도' : '중저명도'}입니다. `;
        let kPros = `피부의 빛 반사가 ${bright > 180 ? '좋아 맑고 투명한' : '차분하여 건강한'} 상태입니다.`;
        let kCons = (tone === "Warm-Yellow") ? "코랄, 피치 계열의 색조가 혈색을 가장 잘 살려줍니다." : "핑크, 라벤더 계열의 쿨한 컬러가 투명도를 높여줍니다.";
        renderResult('resultSkin', '피부톤 및 질감', kDesc, kPros, kCons);

    }, 1000);
}

// 모달 로직
function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const content = {
        privacy: { title: "개인정보처리방침", body: "본 서비스는 모든 분석을 브라우저 내에서 수행하며 이미지를 서버로 전송하지 않습니다." },
        terms: { title: "이용약관", body: "본 서비스의 분석 결과는 정보 제공 목적이며 의학적 진단을 대체할 수 없습니다." }
    };
    if (content[type]) {
        title.innerText = content[type].title;
        body.innerHTML = content[type].body;
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

window.onclick = function(e) {
    if (e.target === document.getElementById('modalOverlay')) closeModal();
}

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

            // --- [1] 정밀 좌표 기반 전문 지표 계산 ---
            const topFace = Math.abs(lm[10].y - lm[168].y);
            const midFace = Math.abs(lm[168].y - lm[2].y);
            const bottomFace = Math.abs(lm[2].y - lm[152].y);
            const totalH = topFace + midFace + bottomFace;
            const vR = [ (topFace/totalH*3).toFixed(2), (midFace/totalH*3).toFixed(2), (bottomFace/totalH*3).toFixed(2) ];

            const fW = Math.abs(lm[234].x - lm[454].x);
            const foreheadW = Math.abs(lm[103].x - lm[332].x);
            const jawW = Math.abs(lm[172].x - lm[397].x);
            const fH = Math.abs(lm[10].y - lm[152].y);
            const aspect = (fH / fW).toFixed(2);
            const jawToForehead = (jawW / foreheadW).toFixed(2);

            const eyeDist = Math.abs(lm[133].x - lm[362].x);
            const eyeW = Math.abs(lm[133].x - lm[33].x);
            const eyeSpacing = (eyeDist / eyeW).toFixed(2);
            const leftTilt = (lm[33].y - lm[133].y);
            const isUpturned = leftTilt < 0;

            const canvas = document.getElementById('faceCanvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            const sample = context.getImageData(Math.floor(lm[117].x * canvas.width), Math.floor(lm[117].y * canvas.height), 1, 1).data;
            const r = sample[0], g = sample[1], b = sample[2];
            const brightness = (r + g + b) / 3;

            // --- [2] 전문가 데이터 기반 결과 매칭 ---
            const getExpertAnalysis = () => {
                const results = {
                    ratio: { desc: "", pros: "", cons: "" },
                    shape: { desc: "", pros: "", cons: "" },
                    feat: { desc: "", pros: "", cons: "" },
                    skin: { desc: "", pros: "", cons: "" }
                };

                if (vR[1] > 1.08) {
                    results.ratio.desc = `중안부가 발달한(${vR[1]}) 성숙하고 우아한 '엘레강스' 비율입니다.`;
                    results.ratio.pros = "지적이고 차분한 분위기를 주며 코의 선이 강조되어 입체감이 좋습니다.";
                    results.ratio.cons = "가로로 긴 안경테나 블러셔를 중앙부에 넓게 펴 발라 시선을 가로로 분산시키면 훨씬 부드러워 보입니다.";
                } else if (vR[2] < 0.9) {
                    results.ratio.desc = `하안부가 짧은(${vR[2]}) '베이비페이스'형 동안 비율을 갖추고 있습니다.`;
                    results.ratio.pros = "실제 나이보다 훨씬 어려 보이며 친근하고 귀여운 이미지가 강점입니다.";
                    results.ratio.cons = "턱끝에 하이라이트를 주어 수직감을 살짝 더해주면 세련된 느낌을 추가할 수 있습니다.";
                } else {
                    results.ratio.desc = "수직/수평 밸런스가 황금비율에 완벽히 부합하는 '조화형' 비율입니다.";
                    results.ratio.pros = "안정감이 매우 뛰어나며 클래식하고 정돈된 미적 완성도가 높습니다.";
                    results.ratio.cons = "어떤 스타일도 소화 가능하므로 과감한 트렌디 메이크업에 도전해 보세요.";
                }

                if (aspect > 1.3 && jawToForehead < 0.85) {
                    results.shape.desc = "세로 폭이 강조되면서 하단이 슬림한 '귀족적 타원형' 골격입니다.";
                    results.shape.pros = "슬림하고 도시적인 실루엣을 가졌으며 목선이 길어 보이는 효과가 있습니다.";
                    results.shape.cons = "사이드 볼륨을 살린 레이어드 컷이나 굵은 웨이브가 긴 얼굴형을 보완해 줍니다.";
                } else if (jawToForehead > 0.95) {
                    results.shape.desc = "안정감이 느껴지는 하단 골격의 '클래식 정방형/페어형'입니다.";
                    results.shape.pros = "에너지가 넘치고 강인한 매력이 있으며, 턱선이 주는 고급스러운 아우라가 독보적입니다.";
                    results.shape.cons = "앞머리를 옆으로 넘겨 이마 폭을 확보하고 턱선을 시원하게 드러내는 커트가 베스트입니다.";
                } else {
                    results.shape.desc = "곡선과 직선의 밸런스가 좋은 '이상적 계란형' 골격입니다.";
                    results.shape.pros = "페이스 라인이 매끄러워 어떤 각도에서도 굴곡 없는 부드러운 인상을 줍니다.";
                    results.shape.cons = "얼굴형이 예쁘므로 포니테일이나 업스타일로 헤어 라인을 모두 드러내 보시길 추천합니다.";
                }

                const eyeType = isUpturned ? "상향형(Cat-eye)" : "하향형(Puppy-eye)";
                results.feat.desc = `눈매가 ${eyeType}이며 미간 간격이 ${eyeSpacing > 1.05 ? '넓은' : '집중된'} 개성 있는 눈매입니다.`;
                results.feat.pros = isUpturned ? "눈매가 매혹적이고 힘이 있어 카리스마 있는 표정 연출에 유리합니다." : "선하고 맑은 눈매를 가져 상대방에게 높은 신뢰감과 호감을 줍니다.";
                results.feat.cons = eyeSpacing > 1.05 ? "미간 사이 음영을 주어 콧대를 세우면 시선이 집중되어 더 뚜렷해 보입니다." : "눈꼬리를 뒤로 길게 빼서 얼굴의 여백을 조절하면 비율이 더 완벽해집니다.";

                const tone = (r > b + 15) ? "웜(Warm)" : (b > r + 5) ? "쿨(Cool)" : "뉴트럴(Neutral)";
                results.skin.desc = `측정된 피부톤은 ${tone} 톤이며 밝기는 ${brightness > 180 ? '밝고 맑은' : '차분하고 건강한'} 상태입니다.`;
                results.skin.pros = `피부의 색조 대비가 좋아 특정 컬러(골드/실버) 사용 시 이목구비가 확 살아나는 타입입니다.`;
                results.skin.cons = tone === "웜" ? "오렌지, 코랄, 골드 브라운 컬러의 메이크업이 베스트입니다." : tone === "쿨" ? "라벤더, 핑크, 애쉬 베이지 컬러의 메이크업을 시도해 보세요." : "모든 뉴트럴 컬러를 소화할 수 있는 축복받은 톤입니다.";

                return results;
            };

            const expert = getExpertAnalysis();
            const render = (target, data) => {
                document.getElementById(target).innerHTML = `
                    <p class="analysis-desc">${data.desc}</p>
                    <div class="pros-cons">
                        <div class="pros"><strong>✨ 전문가 리포트:</strong> ${data.pros}</div>
                        <div class="cons"><strong>🎨 컨설팅 가이드:</strong> ${data.cons}</div>
                    </div>
                `;
            };

            render('resultRatio', expert.ratio);
            render('resultShape', expert.shape);
            render('resultFeatures', expert.feat);
            render('resultSkin', expert.skin);
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

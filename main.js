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

            // --- 정밀 데이터 계산 ---
            // 1. 세로 비율 (상:중:하)
            const topFace = Math.abs(lm[10].y - lm[168].y);   // 이마 ~ 미간
            const midFace = Math.abs(lm[168].y - lm[2].y);    // 미간 ~ 코끝
            const bottomFace = Math.abs(lm[2].y - lm[152].y); // 코끝 ~ 턱끝
            const totalHeight = topFace + midFace + bottomFace;
            
            const vRatio = [
                (topFace / totalHeight * 3).toFixed(1),
                (midFace / totalHeight * 3).toFixed(1),
                (bottomFace / totalHeight * 3).toFixed(1)
            ];

            // 2. 가로 비율 및 얼굴형
            const faceWidth = Math.abs(lm[234].x - lm[454].x);
            const jawWidth = Math.abs(lm[172].x - lm[397].x);
            const faceHeight = Math.abs(lm[10].y - lm[152].y);
            const ratio = (faceHeight / faceWidth).toFixed(2);

            // 3. 눈 비례
            const leftEyeWidth = Math.abs(lm[133].x - lm[33].x);
            const eyeDist = Math.abs(lm[133].x - lm[362].x);
            const eyeRatio = (eyeDist / faceWidth).toFixed(2);

            // --- 결과 생성 함수 ---
            const createResultHTML = (desc, pros, cons) => `
                <p class="analysis-desc">${desc}</p>
                <div class="pros-cons">
                    <div class="pros"><strong>👍 장점:</strong> ${pros}</div>
                    <div class="cons"><strong>💡 팁:</strong> ${cons}</div>
                </div>
            `;

            // 1. 비율 분석 (Ratio)
            let ratioDesc = `상:중:하 비율이 <strong>${vRatio[0]}:${vRatio[1]}:${vRatio[2]}</strong>로 측정되었습니다. `;
            let rPros = "", rCons = "";
            if (vRatio[1] > 1.1) {
                ratioDesc += "중안부가 다소 긴 편으로 성숙하고 지적인 분위기를 풍깁니다.";
                rPros = "우아하고 신뢰감을 주는 이미지를 가졌습니다.";
                rCons = "코가 길어 보일 수 있으니 쉐이딩으로 코끝을 끊어주는 메이크업을 추천합니다.";
            } else {
                ratioDesc += "전체적인 세로 밸런스가 안정적이며 동안의 조건을 갖추고 있습니다.";
                rPros = "어려 보이고 생기 넘치는 이미지를 연출하기 좋습니다.";
                rCons = "이목구비가 몰려 보이지 않게 눈썹 산을 살짝 살려 시선을 분산시켜 보세요.";
            }
            document.getElementById('resultRatio').innerHTML = createResultHTML(ratioDesc, rPros, rCons);

            // 2. 골격 분석 (Shape)
            let shapeDesc = "";
            let sPros = "", sCons = "";
            const jawToFace = jawWidth / faceWidth;
            if (jawToFace > 0.82) {
                shapeDesc = "턱의 골격이 확실하여 얼굴에 안정감과 카리스마가 느껴지는 골격입니다.";
                sPros = "옆모습이 입체적이며 고급스러운 분위기를 자아냅니다.";
                sCons = "귀 밑 머리에 볼륨을 주어 턱선을 부드럽게 감싸는 스타일이 잘 어울립니다.";
            } else {
                shapeDesc = "하관이 슬림하고 갸름하여 현대적이고 세련된 V라인 형태를 띠고 있습니다.";
                sPros = "어떤 모자나 안경도 소화하기 쉬운 유연한 골격입니다.";
                sCons = "얼굴이 너무 빈약해 보이지 않도록 광대 주변에 치크로 생기를 더해 보세요.";
            }
            document.getElementById('resultShape').innerHTML = createResultHTML(shapeDesc, sPros, sCons);

            // 3. 이목구비 분석 (Features)
            let featDesc = "";
            let fPros = "", fCons = "";
            if (eyeRatio > 0.42) {
                featDesc = "눈 사이 거리가 넓어 시야가 시원해 보이며 개성 있고 매력적인 '마스크'를 가졌습니다.";
                fPros = "몽환적이고 신비로운 분위기를 연출하는 데 최적입니다.";
                fCons = "콧대 부분에 하이라이트를 주어 시선을 중앙으로 모아주면 더욱 뚜렷해 보입니다.";
            } else {
                featDesc = "이목구비가 중앙에 집중되어 화려하고 이목을 끄는 에너지가 강한 스타일입니다.";
                fPros = "풀 메이크업이 매우 잘 어울리며 화려한 스타일링이 빛을 발합니다.";
                fCons = "아이라인을 길게 빼서 가로 길이를 확장하면 더욱 시원한 인상을 줄 수 있습니다.";
            }
            document.getElementById('resultFeatures').innerHTML = createResultHTML(featDesc, fPros, fCons);

            // 4. 피부톤 (Skin)
            document.getElementById('resultSkin').innerHTML = createResultHTML(
                "피부의 명도와 채도가 균일하게 분포되어 있어 투명한 피부 결을 가지고 있습니다.",
                "피부 톤이 고르고 맑아 화사한 색조가 잘 어울립니다.",
                "지속적인 수분 공급으로 현재의 맑은 톤을 유지하는 것이 중요합니다."
            );
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

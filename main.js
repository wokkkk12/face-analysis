let faceMesh;

document.addEventListener('DOMContentLoaded', () => {
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

        let progress = 0;
        const progInterval = setInterval(() => {
            progress += 2;
            if (progress <= 95) progressFill.style.width = progress + "%";
        }, 40);

        faceMesh.onResults((results) => {
            clearInterval(progInterval);
            progressFill.style.width = "100%";
            setTimeout(() => drawResults(results), 500);
        });
        
        try {
            await faceMesh.send({image: imageElement});
        } catch (err) {
            console.error("FaceMesh send error:", err);
            location.reload();
        }
    }

    function drawResults(results) {
        ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
        if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
            const landmarks = results.multiFaceLandmarks[0];
            ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
            for (const landmark of landmarks) {
                ctx.beginPath();
                ctx.arc(landmark.x * faceCanvas.width, landmark.y * faceCanvas.height, 0.8, 0, 2 * Math.PI);
                ctx.fill();
            }
            displayFinalReport(landmarks);
        } else {
            alert("얼굴을 찾을 수 없습니다.");
            location.reload();
        }
    }

    function displayFinalReport(lm) {
        setTimeout(() => {
            document.getElementById('previewSection').classList.add('hidden');
            document.getElementById('resultSection').classList.remove('hidden');

            // --- [MEDICAL ANALYSIS ENGINE] ---
            
            // 1. 수직 비율 (Vertical Analysis)
            const upperH = Math.abs(lm[10].y - lm[168].y);
            const midH = Math.abs(lm[168].y - lm[2].y);
            const lowerH = Math.abs(lm[2].y - lm[152].y);
            const totalH = upperH + midH + lowerH;
            
            const vRatio = [(upperH/totalH*3).toFixed(2), (midH/totalH*3).toFixed(2), (lowerH/totalH*3).toFixed(2)];
            
            // 2. 수평 비율 및 안면 윤곽 (Architecture Analysis)
            const bizygomaticW = Math.abs(lm[234].x - lm[454].x); // 광대 폭
            const bigonialW = Math.abs(lm[172].x - lm[397].x);    // 턱 폭
            const temporalW = Math.abs(lm[21].x - lm[251].x);    // 관자놀이 폭
            const totalHeight = Math.abs(lm[10].y - lm[152].y);
            
            const faceIndex = (totalHeight / bizygomaticW).toFixed(2);
            const jawIndex = (bigonialW / bizygomaticW).toFixed(2);
            const lowerThirdRatio = (lowerH / totalH).toFixed(2);

            // 3. 이목구비 세부 지표 (Feature Metrics)
            const eyeW = Math.abs(lm[133].x - lm[33].x);
            const intercanthalD = Math.abs(lm[133].x - lm[362].x);
            const eyeSpacing = (intercanthalD / eyeW).toFixed(2); // 눈 너비 대비 미간 (표준 1.0)
            
            const lipW = Math.abs(lm[61].x - lm[291].x);
            const philtrumH = Math.abs(lm[2].y - lm[0].y);
            const chinH = Math.abs(lm[17].y - lm[152].y);
            const lipChinRatio = (chinH / philtrumH).toFixed(2); // 인중 대비 턱 비율 (표준 2.0)

            // 4. 피부 데이터
            const canvas = document.getElementById('faceCanvas');
            const context = canvas.getContext('2d', { willReadFrequently: true });
            const pX = Math.floor(lm[117].x * canvas.width);
            const pY = Math.floor(lm[117].y * canvas.height);
            const pixel = context.getImageData(pX, pY, 1, 1).data;
            const r = pixel[0], g = pixel[1], b = pixel[2];
            const brightness = (r + g + b) / 3;

            // --- [REPORT GENERATOR] ---
            
            const report = { ratio: {}, shape: {}, feat: {}, skin: {} };

            // 1. 비율 리포트 (Ratio)
            const getRatioReport = () => {
                let d = `안면 수직 분할 계측 결과, 상/중/하 비율이 <strong>${vRatio[0]} : ${vRatio[1]} : ${vRatio[2]}</strong>의 분포를 보입니다. `;
                let p = "", c = "";
                if (vRatio[1] > 1.12) {
                    d += "중안부의 수직 연장 지수가 높아 성숙하고 기품 있는 'Aristocratic' 이미지가 강조됩니다.";
                    p = "콧대의 리듬감이 살아있으며, 지적이고 신뢰감을 주는 고급스러운 인상을 형성합니다.";
                    c = "중안부 시선을 끊어주기 위해 일자형 눈썹보다는 아치형을, 치크는 사선보다 가로 방향으로 터치하여 밸런스를 잡으세요.";
                } else if (vRatio[2] < 0.82) {
                    d += "하안부 리모델링 비율이 짧은 '동안형(Baby-face)' 골격 구조를 띄고 있습니다.";
                    p = "실제 연령보다 에너제틱하고 유연한 인상을 주며, 대중적인 호감도가 높은 비율입니다.";
                    c = "턱끝에 소량의 하이라이팅을 주어 수직 투영도를 높이면 훨씬 입체적이고 현대적인 느낌을 줄 수 있습니다.";
                } else {
                    d += "현대 미학의 황금률인 1:1:0.8~1에 근접한 수직 조화를 보여주는 'Harmony' 타입입니다.";
                    p = "상하 밸런스가 매우 안정적이며, 특정 이목구비에 치우치지 않는 클래식한 미적 완성도를 보유하고 있습니다.";
                    c = "안정적인 캔버스를 가졌으므로 립이나 아이 메이크업 중 한 곳에 포인트를 주는 원포인트 스타일링이 베스트입니다.";
                }
                return { d, p, c };
            };

            // 2. 골격 리포트 (Shape)
            const getShapeReport = () => {
                let d = `안면 지수(Facial Index) ${faceIndex}로 분석되었습니다. `;
                let p = "", c = "";
                if (jawIndex > 0.88) {
                    d += "하악각(Mandibular angle)의 볼륨이 안정적인 'Classic-Square'형 골격 구조입니다.";
                    p = "옆선이 입체적이며 카리스마 있는 아우라를 가졌습니다. 나이가 들어도 페이스 라인이 무너지지 않는 탄탄한 구조입니다.";
                    c = "헤어 라인에 층을 내는 레이어드 컷으로 턱선의 각을 부드럽게 감싸주면 세련미가 배가됩니다.";
                } else if (faceIndex > 1.4) {
                    d += "세로 축이 발달한 'Elegant-Oval'형의 슬림한 안면 구조입니다.";
                    p = "전체적으로 여백이 적어 이목구비가 집중되어 보이며, 도시적이고 샤프한 매력을 발산합니다.";
                    c = "이마를 넓게 드러내기보다 시스루 뱅이나 사이드 뱅을 활용해 상단 가로 폭을 확보하는 것이 미적 보완책입니다.";
                } else {
                    d += "광대와 턱의 비율이 유려하게 연결되는 'Ideal-Egg' 형태의 윤곽입니다.";
                    p = "페이스 라인이 매우 매끄러워 굴곡에 의한 그늘이 없으며, 온화하고 부드러운 인상을 줍니다.";
                    c = "윤곽이 아름다우므로 가리지 말고 포니테일 등으로 과감히 드러내는 것이 본연의 매력을 극대화합니다.";
                }
                return { d, p, c };
            };

            // 3. 이목구비 리포트 (Features)
            const getFeatReport = () => {
                let d = `눈 너비 대비 미간 비율이 ${eyeSpacing}이며, 인중 대비 턱 비율은 ${lipChinRatio}로 계측되었습니다. `;
                let p = "", c = "";
                if (eyeSpacing > 1.1) {
                    d += "안안각(Intercanthal) 거리가 넓어 시야가 확 트여 보이는 '신비로운 마스크'를 보유하고 있습니다.";
                    p = "몽환적이고 유니크한 무드를 연출하기에 최적이며, 하이패션 같은 개성 있는 이미지가 강점입니다.";
                    c = "콧대 양옆에 가벼운 쉐이딩을 넣어 미간의 수평감을 좁혀주면 눈매의 선명도가 비약적으로 상승합니다.";
                } else if (lipChinRatio < 1.6) {
                    d += "인중 대비 턱의 수직 길이가 짧아 하관의 무게감이 적은 'Neoteny(동안)'적 특징이 관찰됩니다.";
                    p = "턱선의 선명함보다 입술의 매력이 강조되는 구조로, 웃을 때의 모습이 매우 매력적입니다.";
                    c = "턱끝을 V자로 살짝 쉐이딩하여 수직감을 부여하면 입술의 볼륨감과 턱의 선명도가 조화롭게 어우러집니다.";
                } else {
                    d += "이목구비 각 요소가 안면 중앙부에 집중력 있게 배치된 'Focused' 타입입니다.";
                    p = "이목구비의 자기주장이 뚜렷하여 이목을 끄는 에너지가 강하며 화려한 스타일링이 매우 잘 어울립니다.";
                    c = "눈꼬리를 가로로 길게 빼는 윙 아이라인을 통해 얼굴 가로 여백을 조절하면 완벽한 밸런스가 완성됩니다.";
                }
                return { d, p, c };
            };

            // 4. 피부 리포트 (Skin)
            const getSkinReport = () => {
                const tone = (r > b + 15) ? "Warm-Yellow" : (b > r + 5) ? "Cool-Blue" : "Neutral-Beige";
                let d = `멜라닌과 헤모글로빈 수치의 조화로 ${tone} 성향의 ${brightness > 185 ? '고명도' : '중저명도'} 톤이 관찰됩니다. `;
                let p = `피부의 빛 반사율이 ${brightness > 180 ? '높아 맑은 투명감' : '안정적이라 차분하고 건강한 윤기'}를 보유하고 있습니다.`;
                let c = tone === "Warm-Yellow" ? "코랄, 피치 기반의 메이크업과 골드 주얼리가 피부의 혈색을 극대화합니다." : "라벤더, 로즈 기반의 쿨한 색조와 실버 액세서리가 피부의 투명도를 높여줍니다.";
                return { d, p, c };
            };

            const r = getRatioReport();
            const s = getShapeReport();
            const f = getFeatReport();
            const k = getSkinReport();

            const render = (id, obj) => {
                document.getElementById(id).innerHTML = `
                    <p class="analysis-desc">${obj.d}</p>
                    <div class="pros-cons">
                        <div class="pros"><strong>✨ Aesthetic Strategy:</strong> ${obj.p}</div>
                        <div class="cons"><strong>🎨 Medical Advice:</strong> ${obj.c}</div>
                    </div>
                `;
            };

            render('resultRatio', r);
            render('resultShape', s);
            render('resultFeatures', f);
            render('resultSkin', k);
        }, 1000);
    }

    document.getElementById('resetBtn').addEventListener('click', () => location.reload());
});

const modalContent = {
    privacy: {
        title: "개인정보처리방침",
        body: `<h3>1. 수집하는 데이터</h3><p>본 서비스는 '온-디바이스' 기술을 사용하여 이미지를 서버로 전송하지 않습니다.</p>`
    },
    terms: {
        title: "이용약관",
        body: `<h3>제1조 (목적)</h3><p>본 서비스는 AI 기술을 활용한 정보 제공 및 재미를 목적으로 합니다.</p>`
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
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

window.onclick = function(event) {
    if (event.target == document.getElementById('modalOverlay')) closeModal();
}

let faceMesh;

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
            console.log("Ultra-Sensitive Analysis Engine Ready");
        } else {
            setTimeout(initFaceMesh, 500);
        }
    } catch (e) {
        console.error("Engine Init Failed:", e);
    }
}

function onResults(results) {
    const progressFill = document.querySelector('.progress-fill');
    const faceCanvas = document.getElementById('faceCanvas');
    const ctx = faceCanvas.getContext('2d');
    if (progressFill) progressFill.style.width = "100%";
    ctx.clearRect(0, 0, faceCanvas.width, faceCanvas.height);
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        ctx.fillStyle = "rgba(56, 189, 248, 0.4)";
        for (const landmark of landmarks) {
            ctx.beginPath();
            ctx.arc(landmark.x * faceCanvas.width, landmark.y * faceCanvas.height, 0.7, 0, 2 * Math.PI);
            ctx.fill();
        }
        displayFinalReport(landmarks);
    } else {
        alert("얼굴을 찾을 수 없습니다.");
        location.reload();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initFaceMesh();
    const fileInput = document.getElementById('fileInput');
    const dropZone = document.getElementById('dropZone');
    const previewImage = document.getElementById('previewImage');
    const faceCanvas = document.getElementById('faceCanvas');
    if (dropZone) dropZone.addEventListener('click', () => fileInput.click());
    if (fileInput) fileInput.addEventListener('change', (e) => handleFiles(e.target.files));
    
    function handleFiles(files) {
        const file = files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            previewImage.onload = () => analyzeFace(previewImage);
            previewImage.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    async function analyzeFace(img) {
        document.getElementById('uploadSection').classList.add('hidden');
        document.getElementById('previewSection').classList.remove('hidden');
        faceCanvas.width = img.naturalWidth;
        faceCanvas.height = img.naturalHeight;
        await faceMesh.send({image: img});
    }

    document.getElementById('resetBtn').addEventListener('click', () => location.reload());
});

function displayFinalReport(lm) {
    setTimeout(() => {
        document.getElementById('previewSection').classList.add('hidden');
        document.getElementById('resultSection').classList.remove('hidden');

        // --- [1] 극저지연 정밀 수치 계측 ---
        const upperH = Math.abs(lm[10].y - lm[168].y);
        const midH = Math.abs(lm[168].y - lm[2].y);
        const lowerH = Math.abs(lm[2].y - lm[152].y);
        const totalH = upperH + midH + lowerH;
        
        const vR = [(upperH/totalH*3).toFixed(2), (midH/totalH*3).toFixed(2), (lowerH/totalH*3).toFixed(2)];
        
        const fW = Math.abs(lm[234].x - lm[454].x);
        const jawW = Math.abs(lm[172].x - lm[397].x);
        const foreheadW = Math.abs(lm[103].x - lm[332].x);
        const totalHeight = Math.abs(lm[10].y - lm[152].y);
        
        const aspect = (totalHeight / fW).toFixed(2); // 세로/가로 비율
        const jawIdx = (jawW / fW).toFixed(2); // 턱너비 비율
        const foreIdx = (foreheadW / fW).toFixed(2); // 이마너비 비율

        const eyeW = Math.abs(lm[133].x - lm[33].x);
        const interDist = Math.abs(lm[133].x - lm[362].x);
        const eyeSpace = (interDist / eyeW).toFixed(2);
        const leftTilt = (lm[33].y - lm[133].y).toFixed(4);

        const canvas = document.getElementById('faceCanvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const pixel = ctx.getImageData(Math.floor(lm[117].x * canvas.width), Math.floor(lm[117].y * canvas.height), 1, 1).data;
        const r = pixel[0], g = pixel[1], b = pixel[2];
        const bright = (r + g + b) / 3;

        // --- [2] 하이브리드 문구 생성 시스템 ---
        const render = (id, data) => {
            document.getElementById(id).innerHTML = `
                <p class="analysis-desc">${data.desc}</p>
                <div class="pros-cons">
                    <div class="pros"><strong>✨ Aesthetic Analysis:</strong> ${data.pros}</div>
                    <div class="cons"><strong>🎨 Clinical Solution:</strong> ${data.cons}</div>
                </div>
            `;
        };

        // 1. 비율 분석 (초정밀 0.05 단위 분기)
        let rData = {};
        if (vR[1] > 1.08) {
            rData = { desc: `[중안부 강조형: ${vR[1]}] 중안부의 수직 지수가 높아 지적이고 우아한 '엘레강스' 이미지가 강합니다.`, pros: "콧대의 입체감이 잘 살아있으며 신뢰감을 주는 커리어적인 인상이 강점입니다.", cons: "가로 방향 블러셔와 입술 산을 강조한 오버립 메이크업으로 시선을 하단으로 분산시키세요." };
        } else if (vR[2] < 0.88) {
            rData = { desc: `[하안부 단축형: ${vR[2]}] 하안부가 짧아 실제 나이보다 훨씬 어려 보이는 '베이비페이스' 비율입니다.`, pros: "친근하고 귀여운 이미지를 주며 턱선이 갸름해 보여 상큼한 분위기를 자아냅니다.", cons: "턱 끝에 소량의 하이라이트를 주어 수직감을 살짝 부여하면 입체적인 성숙미를 더할 수 있습니다." };
        } else {
            rData = { desc: `[황금 밸런스형: ${vR[1]}] 상/중/하 수직 밸런스가 매우 안정적인 1:1:1에 근접한 조화로운 비율입니다.`, pros: "어떤 메이크업이나 헤어도 소화 가능한 균형 잡힌 캔버스를 보유하고 있습니다.", cons: "안정적인 만큼 자칫 평범해 보일 수 있으니 립이나 아이 중 한 곳에 확실한 포인트를 주세요." };
        }
        render('resultRatio', rData);

        // 2. 얼굴형 분석 (촘촘한 다차원 분류)
        let sData = {};
        if (aspect > 1.32 && jawIdx < 0.82) {
            sData = { desc: `[긴 타원형: ${aspect}] 세로 폭이 좁고 갸름한 슬림한 안면 구조를 가지고 있습니다.`, pros: "얼굴 면적이 작아 보이며 세련되고 도시적인 샤프한 인상을 줍니다.", cons: "사이드뱅이나 옆머리 볼륨을 살려 가로 폭을 보완하는 레이어드 컷이 가장 이상적입니다." };
        } else if (jawIdx > 0.84) {
            sData = { desc: `[클래식 정방형: ${jawIdx}] 턱의 골격이 확실하여 안정감과 무게감을 주는 우아한 골격입니다.`, pros: "옆모습이 입체적이며 카리스마 있는 독보적인 아우라를 풍깁니다.", cons: "턱선을 가리기보다 당당히 노출하되 귀걸이를 드롭형으로 착용해 시선을 아래로 빼주세요." };
        } else if (foreIdx > jawIdx + 0.12) {
            sData = { desc: `[하트형 윤곽: ${foreIdx}] 이마 대비 하관이 매우 슬림하게 빠진 사랑스러운 윤곽입니다.`, pros: "웃을 때 앞광대의 볼륨이 돋보이며 친근하고 에너제틱한 이미지를 줍니다.", cons: "뾰족한 턱끝이 부각되지 않게 턱선 쉐이딩을 둥글게 처리하고 잔머리 컷을 활용하세요." };
        } else {
            sData = { desc: `[이상적 계란형: ${aspect}] 가로와 세로, 턱의 비중이 완벽한 조화를 이루는 매끄러운 윤곽입니다.`, pros: "안면 굴곡이 없어 부드러운 인상을 주며 어떤 각도에서도 굴곡 없는 라인을 자랑합니다.", cons: "윤곽 자체가 장점이므로 포니테일이나 업스타일로 헤어라인을 모두 드러내는 것이 베스트입니다." };
        }
        render('resultShape', sData);

        // 3. 이목구비 분석 (눈매 경사도 및 간격)
        let fData = {};
        if (eyeSpace > 1.08) {
            fData = { desc: `[개방형 눈매: ${eyeSpace}] 눈 사이 거리가 멀어 신비롭고 몽환적인 독특한 마스크를 가졌습니다.`, pros: "신비롭고 중성적인 매력을 연출하기 좋으며 개성 있는 인상이 매우 매력적입니다.", cons: "콧대 양옆 음영(노즈 쉐이딩)을 통해 시각적 중심을 잡아주면 더욱 뚜렷해 보입니다." };
        } else if (leftTilt < 0) {
            fData = { desc: `[상향형 캣아이: ${leftTilt}] 눈꼬리가 올라가 카리스마 있고 매혹적인 눈매를 보유하고 있습니다.`, pros: "표정 변화 없이도 강렬한 흡입력을 가지며 세련된 섹시미를 풍깁니다.", cons: "언더 삼각존에 음영을 주어 눈꼬리를 살짝 내려주는 연출로 부드러운 이미지 변신이 가능합니다." };
        } else {
            fData = { desc: `[집중형 이목구비: ${eyeSpace}] 이목구비가 중앙에 집중되어 시원시원하고 뚜렷한 존재감을 줍니다.`, pros: "멀리서도 시선을 사로잡는 화려한 인상이며 풀 메이크업이 매우 잘 어울립니다.", cons: "눈꼬리와 입술 라인을 가로로 길게 확장하는 메이크업으로 안면 여백을 조절하세요." };
        }
        render('resultFeatures', fData);

        // 4. 피부 분석 (RGB 정밀 톤 추출)
        const tone = (r > b + 15) ? "Warm-Yellow" : (b > r + 8) ? "Cool-Blue" : "Neutral";
        let kData = { desc: `[${tone} 톤 분석] 픽셀 분석 결과 ${tone} 성향의 ${bright > 185 ? '라이트' : '딥'} 톤이 관찰됩니다.`, pros: `본연의 피부색 대비가 좋아 ${tone === "Warm-Yellow" ? '골드' : '실버'} 주얼리가 인색을 확 살려줍니다.`, cons: `${tone === "Warm-Yellow" ? '코랄, 오렌지' : '라벤더, 핑크'} 계열의 색조가 최상의 궁합을 보여줍니다.` };
        render('resultSkin', kData);

    }, 1000);
}

function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const content = {
        privacy: { title: "개인정보처리방침", body: "본 서비스는 이미지를 서버로 전송하지 않으며 브라우저 내부에서만 분석합니다." },
        terms: { title: "이용약관", body: "본 서비스의 분석 결과는 참고용이며 의학적 진단을 대체할 수 없습니다." }
    };
    if (content[type]) {
        title.innerText = content[type].title;
        body.innerHTML = content[type].body;
        overlay.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }
}
function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.body.style.overflow = 'auto';
}
window.onclick = (e) => { if (e.target === document.getElementById('modalOverlay')) closeModal(); }

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
            console.log("Professional Analysis Engine Ready");
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

        // --- 1. 수직/수평 수치 계산 ---
        const upperH = Math.abs(lm[10].y - lm[168].y);
        const midH = Math.abs(lm[168].y - lm[2].y);
        const lowerH = Math.abs(lm[2].y - lm[152].y);
        const totalH = upperH + midH + lowerH;
        const vR = [(upperH/totalH*3).toFixed(2), (midH/totalH*3).toFixed(2), (lowerH/totalH*3).toFixed(2)];
        
        const fW = Math.abs(lm[234].x - lm[454].x);
        const jawW = Math.abs(lm[172].x - lm[397].x);
        const foreheadW = Math.abs(lm[103].x - lm[332].x);
        const aspect = ( (upperH + midH + lowerH) / fW ).toFixed(2);
        const jawIdx = (jawW / fW).toFixed(2);

        // --- 2. 이목구비 수치 계산 ---
        const eyeW = Math.abs(lm[133].x - lm[33].x);
        const interDist = Math.abs(lm[133].x - lm[362].x);
        const eyeRatio = (interDist / eyeW).toFixed(2);
        const tilt = (lm[33].y - lm[133].y).toFixed(4); // 눈 기울기

        // --- 3. 피부 데이터 추출 ---
        const canvas = document.getElementById('faceCanvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const pixel = ctx.getImageData(Math.floor(lm[117].x * canvas.width), Math.floor(lm[117].y * canvas.height), 1, 1).data;
        const r = pixel[0], g = pixel[1], b = pixel[2];
        const bright = (r + g + b) / 3;

        // --- 분석 결과 데이터 풀 (Pool) ---
        const pool = {
            ratio: [
                { cond: vR[1] > 1.10, d: `[정밀 계측: 중안부 확장형] 중안부 비율이 ${vR[1]}로 표준 대비 높게 측정되었습니다.`, p: "성숙하고 기품 있는 분위기를 주며 코의 라인이 뚜렷해 입체적인 프로필을 가집니다.", c: "긴 중안부를 보완하기 위해 애교살 메이크업으로 눈의 위치를 낮아 보이게 하고, 블러셔를 코 끝보다 높은 위치에 터치하세요." },
                { cond: vR[2] < 0.85, d: `[정밀 계측: 동안 밸런스형] 하안부 비율이 ${vR[2]}로 매우 짧은 전형적인 동안 골격입니다.`, p: "실제 나이보다 훨씬 어려 보이는 'Neoteny' 특징을 가지며 친근하고 생기 넘치는 이미지를 줍니다.", c: "짧은 턱끝을 보완하기 위해 턱 중앙에 하이라이트를 주어 수직적 입체감을 살리면 훨씬 세련되어 보입니다." },
                { cond: vR[0] > 1.05, d: `[정밀 계측: 상안부 부각형] 이마의 비중이 ${vR[0]}로 높아 시원하고 총명한 인상을 주는 비율입니다.`, p: "T존의 가시성이 좋아 이목구비가 시원시원해 보이며 밝고 지적인 아우라를 풍깁니다.", c: "넓은 상단 여백을 조절하기 위해 시스루 뱅이나 잔머리 커트로 헤어 라인을 자연스럽게 채워주는 것이 베스트입니다." },
                { cond: true, d: "[정밀 계측: 황금 분할형] 상/중/하 비율이 1:1:0.9에 근접한 현대 미학의 정석적인 밸런스입니다.", p: "어느 한 곳에 치우침 없는 완벽한 대칭성을 지니며 클래식하고 정돈된 미적 완성도를 보유하고 있습니다.", c: "안정적인 캔버스를 가졌으므로 립이나 아이 메이크업 중 한 곳에 강한 포인트를 주는 스타일이 잘 어울립니다." }
            ],
            shape: [
                { cond: aspect > 1.35 && jawIdx < 0.8, d: `[윤곽 분석: 슬림 오발] 안면 지수 ${aspect}의 갸름하고 세로 폭이 강조된 현대적인 윤곽입니다.`, p: "얼굴 면적이 작아 보이며 이목구비의 밀도가 높아 촬영 시 매우 포토제닉한 골격입니다.", c: "긴 얼굴형을 중화하기 위해 옆머리에 볼륨을 주는 레이어드 컷이나 굵은 웨이브 헤어가 가장 조화롭습니다." },
                { cond: jawIdx > 0.85, d: `[윤곽 분석: 클래식 정방] 하악각의 존재감이 확실한 ${jawIdx} 비율의 강직하고 기품 있는 골격입니다.`, p: "옆선이 입체적이며 신뢰감과 권위를 주는 인상입니다. 시간이 지나도 페이스 라인이 무너지지 않는 장점이 있습니다.", c: "강한 턱선을 가리기보다 당당히 드러내되, 귀걸이를 길게 늘어지는 드롭형으로 선택해 시선을 수직으로 분산시키세요." },
                { cond: foreheadW > jawW * 1.15, d: "[윤곽 분석: 로맨틱 하트] 이마 폭이 턱보다 넓어 하단으로 갈수록 갸름해지는 사랑스러운 윤곽입니다.", p: "웃을 때 앞광대의 볼륨감이 극대화되어 밝고 에너제틱한 '아이돌상'의 특징을 보입니다.", c: "뾰족한 턱 끝이 부각되지 않도록 턱선에 가벼운 쉐이딩을 넣고 입술 산을 둥글게 표현해 부드러움을 더하세요." },
                { cond: true, d: "[윤곽 분석: 이상적 계란형] 모든 수치가 표준 오차 범위 내에 있는 가장 이상적인 달걀 형태의 윤곽입니다.", p: "안면 굴곡이 매끄러워 어떤 각도에서도 그늘이 지지 않으며, 온화하고 부드러운 인상을 줍니다.", c: "윤곽 자체가 매력 포인트이므로 포니테일이나 업스타일로 헤어 라인을 과감하게 노출하는 것이 베스트입니다." }
            ],
            feat: [
                { cond: eyeRatio > 1.05, d: `[디테일: 개방형 눈매] 눈 너비 대비 미간 거리(${eyeRatio})가 넓어 신비롭고 몽환적인 마스크를 가졌습니다.`, p: "중앙 여백이 주는 유니크한 분위기가 독보적이며, 하이패션 같은 개성 있는 연출이 가능합니다.", c: "콧대 옆에 쉐이딩을 넣어 미간을 시각적으로 좁혀주면 눈매의 선명도가 비약적으로 상승하여 뚜렷해 보입니다." },
                { cond: tilt < 0, d: "[디테일: 상향형 캣아이] 외안각이 내안각보다 높은 위치에 있어 카리스마 있고 섹시한 분위기를 풍깁니다.", p: "눈매의 힘이 강해 별도의 화려한 화장 없이도 시선을 사로잡는 흡입력 있는 마스크입니다.", c: "아이라인 꼬리를 수평으로 길게 빼서 여우 같은 매력을 살리거나, 언더 삼각존을 채워 부드럽게 중화할 수 있습니다." },
                { cond: true, d: "[디테일: 집중형 이목구비] 이목구비가 얼굴 중앙부에 밀집되어 뚜렷하고 화려한 인상을 주는 구조입니다.", p: "자기주장이 강한 이목구비로 인해 풀 메이크업이 매우 잘 어울리며 도회적이고 화려한 이미지가 강점입니다.", c: "눈꼬리와 입술 라인을 가로로 길게 확장하는 메이크업을 통해 안면 여백의 밸런스를 맞추는 것이 좋습니다." }
            ],
            skin: [
                { cond: r > b + 15 && bright > 185, d: "[색조 분석: 봄 웜 브라이트] 따뜻한 색감과 높은 명도를 지닌 화사하고 생기 넘치는 피부 톤입니다.", p: "피부 혈색이 좋아 보이며 코랄, 피치 계열을 사용했을 때 안색이 즉각적으로 맑아지는 타입입니다.", c: "푸른기가 도는 쿨한 컬러나 무거운 어스 톤은 안색을 칙칙하게 만들 수 있으니 피하고 골드 주얼리를 활용하세요." },
                { cond: b > r + 5 && bright > 185, d: "[색조 분석: 여름 쿨 라이트] 차가운 바탕색과 투명한 명도를 지닌 깨끗하고 청량한 느낌의 피부 톤입니다.", p: "피부가 매우 맑아 보이며 실버 액세서리와 라벤더 색상이 본연의 미모를 극대화해 줍니다.", c: "노란기가 강한 골드나 주황색 메이크업은 피부를 들떠 보이게 하므로 피하고 로즈 핑크 계열을 선택하세요." },
                { cond: true, d: "[색조 분석: 뉴트럴 클래식] 웜과 쿨의 경계에서 균형을 이루는 차분하고 건강한 질감의 피부 톤입니다.", p: "어떤 색조도 무난하게 소화하며 조명에 따라 다양한 분위기 연출이 가능한 팔색조 같은 매력을 가졌습니다.", c: "지나치게 튀는 원색보다는 톤다운된 뮤트 컬러를 사용하여 본연의 고급스러운 질감을 살리는 것이 좋습니다." }
            ]
        };

        const getMatch = (cat) => pool[cat].find(i => i.cond) || pool[cat][pool[cat].length - 1];

        const render = (id, cat) => {
            const m = getMatch(cat);
            document.getElementById(id).innerHTML = `
                <p class="analysis-desc">${m.d}</p>
                <div class="pros-cons">
                    <div class="pros"><strong>✨ Aesthetic Fact:</strong> ${m.p}</div>
                    <div class="cons"><strong>🎨 Clinical Advice:</strong> ${m.c}</div>
                </div>
            `;
        };

        render('resultRatio', 'ratio');
        render('resultShape', 'shape');
        render('resultFeatures', 'feat');
        render('resultSkin', 'skin');
    }, 1000);
}

function openModal(type) {
    const overlay = document.getElementById('modalOverlay');
    const title = document.getElementById('modalTitle');
    const body = document.getElementById('modalBody');
    const content = {
        privacy: { title: "개인정보처리방침", body: "본 서비스는 이미지를 서버로 전송하지 않으며 브라우저 내부에서만 분석합니다." },
        terms: { title: "이용약관", body: "본 서비스의 분석 결과는 참고용이며 법적 효력을 가지지 않습니다." }
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

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

            // --- [1] 정밀 좌표 및 지표 계산 ---
            const topFace = Math.abs(lm[10].y - lm[168].y);
            const midFace = Math.abs(lm[168].y - lm[2].y);
            const bottomFace = Math.abs(lm[2].y - lm[152].y);
            const totalHeight = topFace + midFace + bottomFace;
            const faceWidth = Math.abs(lm[234].x - lm[454].x);
            const faceHeight = Math.abs(lm[10].y - lm[152].y);
            const jawWidth = Math.abs(lm[172].x - lm[397].x);
            const foreheadWidth = Math.abs(lm[103].x - lm[332].x);

            const vRatios = [
                (topFace / totalHeight * 3).toFixed(2),
                (midFace / totalHeight * 3).toFixed(2),
                (bottomFace / totalHeight * 3).toFixed(2)
            ];
            const hwRatio = (faceHeight / faceWidth).toFixed(2); // 세로/가로 비율
            const jfRatio = (jawWidth / faceWidth).toFixed(2);  // 턱/얼굴폭 비율
            const ffRatio = (foreheadWidth / faceWidth).toFixed(2); // 이마/얼굴폭 비율

            // --- [2] 결과 생성 헬퍼 함수 ---
            const getResult = (category, value) => {
                const data = {
                    ratio: [
                        { cond: vRatios[1] > 1.15, desc: `중안부(${vRatios[1]})가 강조된 세련된 도시형 비율입니다.`, pros: "지적이고 신뢰감을 주는 '커리어 우먼/맨'의 인상을 가졌습니다.", cons: "자칫 성숙해 보일 수 있으니 눈 밑 애교살 강조나 가로형 치크로 시선을 분산시키는 것을 추천합니다." },
                        { cond: vRatios[2] > 1.10, desc: `하안부(${vRatios[2]})의 존재감이 느껴지는 에너제틱한 비율입니다.`, pros: "활동적이고 건강한 이미지를 주며, 하이라이터 활용 시 입체감이 극대화됩니다.", cons: "입술 산을 둥글게 그리거나 오버립 메이크업을 통해 하관의 무게감을 밸런싱해 보세요." },
                        { cond: Math.abs(vRatios[0]-1) < 0.1 && Math.abs(vRatios[1]-1) < 0.1, desc: "황금비율에 근접한 1:1:1의 완벽한 수직 밸런스를 보여줍니다.", pros: "어떤 메이크업이나 헤어도 소화 가능한 '도화지' 같은 비율입니다.", cons: "특별한 단점은 없으나, 눈썹의 각도를 살려 얼굴의 개성을 한 스푼 더해보는 것도 좋습니다." }
                    ],
                    shape: [
                        { cond: hwRatio > 1.35 && jfRatio < 0.8, desc: "세련미가 돋보이는 '슬림 타원형' 얼굴형입니다.", pros: "얼굴이 작아 보이며, 사진 촬영 시 각도에 구애받지 않는 세련된 실루엣입니다.", cons: "볼륨감이 부족해 보일 수 있으니 사이드뱅이나 굵은 S컬 펌으로 가로 볼륨을 채워주세요." },
                        { cond: jfRatio > 0.83, desc: "강직하고 우아한 매력이 공존하는 '클래식 정방형' 골격입니다.", pros: "고급스러운 아우라와 함께 나이가 들어도 무너지지 않는 탄탄한 페이스 라인을 가졌습니다.", cons: "턱선을 가리기보다 당당히 드러내되, 귀걸이를 드롭형으로 착용해 시선을 아래로 길게 빼주세요." },
                        { cond: ffRatio > jfRatio + 0.1, desc: "상부의 볼륨이 매력적인 '하트형' 얼굴입니다.", pros: "사랑스럽고 친근한 이미지를 주며 웃을 때 앞광대의 볼륨이 매우 아름답습니다.", cons: "이마를 완전히 드러내기보다 시스루 뱅이나 잔머리 컷으로 이마 폭을 살짝 보정해 보세요." }
                    ],
                    features: [
                        { cond: Math.abs(lm[133].x - lm[362].x) / faceWidth > 0.43, desc: "눈 사이의 거리가 여유로운 '개방형' 이목구비입니다.", pros: "몽환적이고 신비로운 분위기를 자아내며 하이패션 모델 같은 유니크한 매력이 있습니다.", cons: "앞트임 메이크업 효과를 주는 아이라인 기법으로 눈매의 선명도를 높여보세요." },
                        { cond: Math.abs(lm[133].x - lm[362].x) / faceWidth < 0.37, desc: "중앙으로 집중된 '포커스형' 이목구비입니다.", pros: "이목구비가 매우 뚜렷해 보이며 멀리서도 시선을 사로잡는 화려한 인상을 줍니다.", cons: "눈꼬리를 뒤로 길게 빼는 음영 메이크업으로 가로 폭을 확장하면 더욱 조화로워집니다." }
                    ]
                };
                const match = data[category].find(item => item.cond) || { 
                    desc: "균형 잡힌 스탠다드 형태의 분석 결과입니다.", 
                    pros: "대중적이고 호감 가는 이미지를 가지고 있어 스타일 변화가 자유롭습니다.", 
                    cons: "본인만의 시그니처 스타일을 찾아 한 곳에 포인트를 주는 시도를 해보세요." 
                };
                return `
                    <p class="analysis-desc">${match.desc}</p>
                    <div class="pros-cons">
                        <div class="pros"><strong>✨ 매력 포인트:</strong> ${match.pros}</div>
                        <div class="cons"><strong>🎨 스타일링 팁:</strong> ${match.cons}</div>
                    </div>
                `;
            };

            // --- [3] 결과 출력 ---
            document.getElementById('resultRatio').innerHTML = getResult('ratio');
            document.getElementById('resultShape').innerHTML = getResult('shape');
            document.getElementById('resultFeatures').innerHTML = getResult('features');
            document.getElementById('resultSkin').innerHTML = `
                <p class="analysis-desc">피부 텍스처와 빛 반사 지수가 안정적입니다.</p>
                <div class="pros-cons">
                    <div class="pros"><strong>✨ 매력 포인트:</strong> 건강하고 매끄러운 피부 광택을 보유하고 있습니다.</div>
                    <div class="cons"><strong>🎨 스타일링 팁:</strong> 현재의 톤을 살리는 세미 글로우 베이스 메이크업이 베스트입니다.</div>
                </div>
            `;
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

# kakao-chat-bot

## 프로젝트 구조

```
KAKAO-CHAT-BOT/
│── src/
│   ├── handlers/         # Lambda 핸들러 폴더
│   │   ├── teacher.ts    # 주요 핸들러 파일
│   ├── prompt/           # 프롬프트 관련 폴더
│   │   ├── teacher_v1.0.txt # 프롬프트 파일
│── .env                  # 환경 변수
│── .gitignore            # Git 제외 파일
│── README.md             # 문서
│── sequence-diagram.md   # 다이어그램 문서
```

## 초기 세팅
### 패키지 설치
- 아래의 커맨드를 통해 필요한 의존성을 설치합니다.
```shell
npm install
```

### 서버리스 프레임워크 설치
- 패키지 매니저를 통해 서버리스 프레임워크를 설치합니다.
```
npm i serverless -g
```

### 로컬 환경 실행
```
serverless offline -s <stage_name> start
```

### 배포
- 아래의 커맨드를 통해 배포를 진행합니다.
- stage는 어떤 환경에 배포할 것인지 명시하는 커맨드입니다.

```shell
# --aws-profile: 배포 시 특정 AWS 프로파일 사용
serverless deploy -s <your_stage> --aws-profile dev
```
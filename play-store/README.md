# 공황패스 SOS Play 제출 패키지

- `release/panic-pass-sos-v1.0.16.aab`: 최신 Google Play 업데이트용 서명 AAB
- `release/panic-pass-sos-v1.0.16.apk`: 최신 실제 기기 설치 확인용 서명 APK
- `release/upload_certificate.pem`: Play 업로드 키 공개 인증서
- `release/SHA256SUMS.txt`: 배포 파일 무결성 확인값
- `assets/app-icon-512.png`: 512×512 Play 아이콘
- `assets/feature-graphic-1024x500.jpg`: 1024×500 대표 이미지
- `assets/screenshots/v1.0.14/`: 1080×1920 휴대전화 스크린샷 6장
- `PLAY_STORE_SUBMISSION_KO.md`: 제목·설명·출시 노트·대체 텍스트
- `PLAY_CONSOLE_CHECKLIST.md`: 데이터 보안·건강 앱 선언을 포함한 등록 체크리스트
- `SIGNING_KEY_GUIDE.md`: 새 업로드 키와 기존 키 처리 안내

이 Android 앱은 TWA나 Custom Tab을 사용하지 않습니다. 웹 화면과 음악을 앱 번들에 포함해 일반 Android WebView 안에서 오프라인으로 실행합니다.

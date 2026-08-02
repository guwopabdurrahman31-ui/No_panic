# Play 업로드 키 안내

## 이번 빌드에 사용한 새 키

- 키 파일: `play-store/signing/panicpass-upload.jks`
- 별칭: `upload`
- 인증서: `play-store/release/upload_certificate.pem`
- SHA-256 지문: `DC:2A:19:14:62:CA:E9:EC:41:DF:D2:D0:31:E7:42:D7:2C:36:B9:70:F7:0B:3B:AF:8C:6F:EE:7D:8C:A5:5F:DE`
- 비밀번호 저장 위치: macOS 로그인 키체인
- 키체인 서비스 이름: `com.guwopabdurrahman31ui.panicpasssos.upload-key`

비밀번호는 저장소나 문서에 기록하지 않았습니다. macOS의 `키체인 접근` 앱에서 위 서비스 이름을 검색해 확인할 수 있습니다. 키 파일과 키체인 암호를 서로 다른 안전한 장소에 백업하세요.

## 기존 키와의 관계

프로젝트에 있던 이전 키 파일은 삭제하지 않았지만 이번 빌드에는 사용하지 않았습니다. 이전 비밀번호를 알 수 없어 새로운 업로드 키를 만들었습니다.

- 보존된 기존 `play-store/legacy/upload_certificate-before-panicpass.pem` 지문: `98:09:B8:4E:9A:25:4B:B6:CA:B0:44:B6:61:FD:91:B2:0D:21:CE:78:BB:C4:47:BE:82:41:40:1C:65:D5:6E:21`
- 이전 AAB 서명 지문: `51:1C:91:60:E8:0B:67:BC:4B:A5:28:9B:10:5F:17:03:53:20:32:9C:D4:A9:61:33:6C:70:31:A8:7A:2A:69:41`

Play Console에 이 패키지를 아직 등록하지 않았다면 새 AAB와 새 업로드 인증서를 그대로 사용하면 됩니다.

이미 같은 패키지가 Play App Signing에 등록돼 있다면 `설정 > 앱 무결성(App integrity) > 앱 서명`에서 업로드 키 재설정을 요청하고 새 `upload_certificate.pem`을 제출해야 합니다. 기존 설치 앱의 앱 서명 키 자체를 임의로 바꾸면 업데이트가 불가능하므로, Play Console의 현재 앱 서명 상태를 먼저 확인하세요.

## 다시 빌드하기

```bash
./scripts/build_play_release.sh
```

외장 드라이브에서 생기는 메타데이터 파일이 Android 빌드를 방해하지 않도록, 스크립트가 내부 임시 폴더에서 빌드한 뒤 완성 파일만 `play-store/release/`로 가져옵니다.

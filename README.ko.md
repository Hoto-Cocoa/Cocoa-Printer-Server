## Cocoa-Printer-Server
프린터 제한을 우회하고, PDF로 저장하는게 제한되었던 문서들을 PDF로 저장할 수 있게 해줍니다. USB만 지원하던 프린터를 네트워크에서 사용할 수 있게 해주고, 드라이버가 없던 OS에서도 호스트 PC만 있다면 프린터를 사용할 수 있게 해줍니다.

## 설치
문서의 PDF 변환 및 출력을 위해 GhostScript가 필요합니다. 9.20과 9.23을 테스트 해보았습니다만, 9.20은 동작하지 않았으니 9.23이나 그 이상의 버전을 사용해주세요.
1. 이 저장소를 클론합니다.
1. `npm i`를 입력하여 필요한 의존 패키지를 설치합니다.
1. 아래 형식에 맞추어 `config.json`에 설정을 저장해주세요.
	```
	{
		"printerName": "프린터 이름입니다. 지정되지 않으면, 시스템 기본 프린터로 출력을 시도합니다.",
		"encryptKey": "AES-256 암호화를 위한 32바이트 암호화 키입니다."
	}
	```
1. `npm start`를 입력하여 실행합니다.
1. [127.0.0.1:8080](http://127.0.0.1:8080) 또는 서버 아이피:8080를 웹 브라우저로 접속하시고 가입하세요. 첫번째 사용자에게 관리자 권한이 부여됩니다.
1. 프린터를 장치에 추가해주세요. 만약 "프린터가 응답하지 않습니다"와 같은 메시지가 출력된다면, 그냥 무시하시면 됩니다. PostScript로 출력하는 아무 드라이버나 사용하실 수 있습니다만, 잘 모르겠다면 Windows 기준으로 Microsoft 탭에 있는 "Microsoft PS Class Driver"를 선택해주세요. 만약 프린터 제한을 우회하기 위해 사용하신다면, 그에 맞는 드라이버를 선택해주셔야 합니다. 만약 PostScript 드라이버를 사용하시지 않으신다면 이 프로그램은 프린트 요청을 받지 않을 것입니다.

다른 PC에서 접속하기 위해서는 8080 포트와 9100 포트가 열려있어야 합니다. 만약 방화벽이나 백신이 이 프로그램(또는 node.exe)이 네트워크에 접근하는 것을 허용하겠냐고 물어보면 허용해주세요.

## 추가 설정
만약 웹 인터페이스를 거치지 않고 바로 출력하고 싶으시거나, IP 필터링을 하고 싶지 않으시다면 다음을 참고해주세요:
* 만약 "passthru" 값을 true로 지정하면, 이 프로그램은 이후 모든 프린트 요청을 바로 프린터로 넘겨줍니다. PDF 파일은 생성되지 않습니다.
* 만약 "allowAll" 값을 true로 지정하면, 이 프로그램은 이후 모든 프린트 요청을 승인하고, 누구나 저장된(이 설정을 키기 전에 출력된 다른 PDF 파일을 제외하고, 모든 사용자의 PDF 결과물을 의미합니다) 파일을 볼 수 있게 됩니다. 만약 개인정보 유출 등의 우려로 PDF 문서를 볼 수 없게 하고 싶으시다면, "passthru" 설정이 도움이 될겁니다.

## 빌드
```
npm run pkg
npm run copy-dep-node
```
실행 파일은 `dists` 폴더에 생성됩니다.

## 기여하기
질문이나 문제가 있으시다면, 이슈를 열어주세요. 힘이 닿는 곳까지 도와드리겠습니다.

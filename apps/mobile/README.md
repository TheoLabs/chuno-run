# @chuno/mobile

추노 Flutter 앱 (Android/iOS). Turborepo에는 `package.json` 래퍼로 연동되어 있고, 실제 작업은 `flutter` CLI가 한다.

## 플랫폼 스캐폴딩 생성 (최초 1회)

이 폴더에는 `pubspec.yaml`과 `lib/main.dart`만 있고 `android/`·`ios/` 플랫폼 폴더는 아직 없다. 아래로 생성한다:

```bash
pnpm --filter @chuno/mobile gen
# 또는
cd apps/mobile && flutter create --org run.chuno --project-name mobile --platforms=android,ios .
```

생성 후:

```bash
flutter pub get
pnpm --filter @chuno/mobile dev     # flutter run
```

## turbo 연동

`package.json`의 `build`/`dev`/`lint`/`test` 스크립트가 각각 `flutter build`/`run`/`analyze`/`test`를 감싼다. 따라서 루트에서 `pnpm build` 등을 돌리면 mobile도 함께 오케스트레이션된다 (flutter SDK 필요).

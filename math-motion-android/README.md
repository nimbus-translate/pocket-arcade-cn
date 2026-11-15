# 算迹 · Math Motion Android

离线可运行的 Android 应用，内置原生 WebView 和本地完整的可视化计算器网页。无需联网、无需账号、无广告。APK 为调试签名构建，用于直接安装测试。

- **演示**：观察 → 摆放 → 动态计数 → 揭晓结果。
- **运算**：加减乘除、括号、浮点数、乘方，遵守计算优先级。
- **交互**：动画暂停/播放、单步前后、回放、0.75/1/1.5/2 倍速。
- **Android**：API 26+ (Android 8.0+), target SDK 34, Java 17, SDK 35, Gradle 8.9, AGP 8.7.3。

```
# 在仓库根目录运行：
node math-motion-android/tests/run.js
cd math-motion-android
gradle :app:assembleDebug
```

GitHub Actions 会将 APK 作为 `math-motion/MathMotion-v1.0.apk` 发布到 GitHub Pages 子目录。
# Liquid tab bar

A floating glass tab bar in the style of iOS 26, in two flavours that share the same behaviour:

| | Folder | Runs on |
|---|---|---|
| **Web** (plain HTML/CSS/JS, no dependencies) | [`web/`](web) | any browser, GitHub Pages |
| **Flutter** (pure Dart widget) | [`flutter/`](flutter) | iOS, Android **and Flutter web** |

## What it does

- **Spring lens.** The highlight springs to the tapped tab (damping ratio ≈ 0.77) with a small pop.
- **Drag the lens.** Press and drag across the bar: the lens lifts out of the bar, stretches with drag speed, the icon under it grows, and the ends rubber-band. On release it springs to the nearest tab.
- **Scroll to shrink.** After 66 px of scroll down the bar crossfades into a small pill showing the current tab; 48 px up (or near the top) brings it back. Tapping the pill also expands it.
- **Cheap on phones.** Only `transform` and `opacity` are animated, the animation loop stops at rest, and the backdrop blur is switched off just while the bar/pill swap.

## Web

```html
<link rel="stylesheet" href="liquid-tab-bar.css">

<div class="ltb-wrap">
  <nav class="ltb">
    <a href="#home"><svg viewBox="0 0 24 24">…</svg><span>Home</span></a>
    <a href="#search"><svg viewBox="0 0 24 24">…</svg><span>Search</span></a>
  </nav>
</div>

<script src="liquid-tab-bar.js"></script>
<script>
  new LiquidTabBar(document.querySelector(".ltb"), {
    onChange: (index, link) => console.log(index),
    // preventNavigation: true,      // don't follow the href (SPA)
    // minimizeOnScroll: false,
  });
</script>
```

Colours are CSS variables on `.ltb`: `--ltb-accent`, `--ltb-ink`, `--ltb-bg`, `--ltb-lens`. Open `web/index.html` for a working demo.

## Flutter (including web)

```yaml
dependencies:
  liquid_tab_bar:
    path: ../liquid-tab-bar/flutter   # or a git dependency
```

```dart
final bar = LiquidTabBarController();

NotificationListener<ScrollNotification>(
  onNotification: bar.handleScroll,   // shrink on scroll
  child: ListView(...),
);

LiquidTabBar(
  controller: bar,
  selectedIndex: tab,
  onChanged: (i) => setState(() => tab = i),
  items: const [
    LiquidTabItem(icon: Icons.home_rounded, label: 'Home'),
    LiquidTabItem(icon: Icons.person_rounded, label: 'Me'),
  ],
);
```

To try the example, including in a browser:

```bash
cd flutter/example
flutter create .        # generates the android/ios/web folders once
flutter run -d chrome   # or any device
```

> **Status:** the web version is tested in a browser. The Flutter version was written without a Flutter SDK available, so it has **not been compiled or run yet**; expect to fix small things on the first `flutter run`.

## Honest limits

- This **imitates** the look. It is not Apple's real Liquid Glass (no refraction, no live lensing of content behind it). For the real native control inside a Flutter app on iOS 26, use [adaptive_platform_ui](https://github.com/berkaycatak/adaptive_platform_ui).
- Blur (`backdrop-filter` / `BackdropFilter`) is expensive on low-end Android; consider a solid translucent colour there.

## Credits

Behaviour numbers (shrink threshold, spring damping, lens scale, rubber-band) come from reading the descriptions of
[liquid_glass_nav_bar](https://github.com/rokncode/liquid_glass_nav_bar) and
[facebook/astryx PR #8154](https://github.com/facebook/astryx/pull/8154). No code was copied; both implementations here are written from scratch.

MIT license.

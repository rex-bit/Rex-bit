// Liquid tab bar for Flutter (iOS, Android and web). BETA, not yet compiled. MIT.
//
// Pure Flutter: BackdropFilter blur + a spring-driven lens. It imitates the iOS 26
// look; it is NOT the native UIKit control (for that see adaptive_platform_ui).
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter/physics.dart';

class LiquidTabItem {
  const LiquidTabItem({required this.icon, required this.label});
  final IconData icon;
  final String label;
}

/// Shrinks the bar to a pill after 66px of finger scroll down and brings it back
/// after 48px up (or near the top). Hook it into a [NotificationListener].
class LiquidTabBarController extends ChangeNotifier {
  bool _minimized = false;
  double _acc = 0;

  bool get minimized => _minimized;
  set minimized(bool v) {
    if (v == _minimized) return;
    _minimized = v;
    notifyListeners();
  }

  bool handleScroll(ScrollNotification n) {
    if (n is ScrollUpdateNotification && n.depth == 0 && n.dragDetails != null) {
      final dy = n.scrollDelta ?? 0;
      final y = n.metrics.pixels;
      if (dy * _acc < 0) _acc = 0;
      _acc += dy;
      if (y < 120 || _acc < -48) {
        minimized = false;
      } else if (_acc > 66 && y > 200) {
        minimized = true;
      }
    }
    return false; // never swallow the notification
  }
}

class LiquidTabBar extends StatefulWidget {
  const LiquidTabBar({
    super.key,
    required this.items,
    required this.selectedIndex,
    required this.onChanged,
    this.controller,
    this.accent,
    this.maxWidth = 460,
  });

  final List<LiquidTabItem> items;
  final int selectedIndex;
  final ValueChanged<int> onChanged;
  final LiquidTabBarController? controller;
  final Color? accent;
  final double maxWidth;

  @override
  State<LiquidTabBar> createState() => _LiquidTabBarState();
}

class _LiquidTabBarState extends State<LiquidTabBar> with TickerProviderStateMixin {
  static const double _pad = 6;
  static const double _height = 66;
  static final _moveSpring = SpringDescription.withDampingRatio(mass: 1, stiffness: 380, ratio: 0.77);
  static final _lensSpring = SpringDescription.withDampingRatio(mass: 1, stiffness: 320, ratio: 0.6);

  late final LiquidTabBarController _ctrl = widget.controller ?? LiquidTabBarController();
  // Lens position in "tab units" (0 = first tab), so it needs no layout info.
  late final AnimationController _x = AnimationController.unbounded(vsync: this, value: widget.selectedIndex.toDouble());
  // 0 = resting, 1 = lifted while dragging (also used for the small tap pop).
  late final AnimationController _lens = AnimationController.unbounded(vsync: this, value: 0);

  double _tabW = 1;
  double _raw = 0;
  double _stretch = 0;
  bool _dragging = false;

  @override
  void didUpdateWidget(LiquidTabBar old) {
    super.didUpdateWidget(old);
    if (old.selectedIndex != widget.selectedIndex && !_dragging) {
      _moveTo(widget.selectedIndex.toDouble());
      _lens.value = 0.5; // pop
      _lens.animateWith(SpringSimulation(_lensSpring, 0.5, 0, 0));
    }
  }

  @override
  void dispose() {
    _x.dispose();
    _lens.dispose();
    if (widget.controller == null) _ctrl.dispose();
    super.dispose();
  }

  void _moveTo(double target, {double velocity = 0}) {
    _x.animateWith(SpringSimulation(_moveSpring, _x.value, target, velocity));
  }

  double _rubber(double r) {
    final max = (widget.items.length - 1).toDouble();
    if (r < 0) return -((-r) * 0.35).clamp(0.0, 0.2);
    if (r > max) return max + ((r - max) * 0.35).clamp(0.0, 0.2);
    return r;
  }

  void _dragStart(DragStartDetails d) {
    _dragging = true;
    _x.stop();
    _raw = _x.value;
    _lens.animateWith(SpringSimulation(_lensSpring, _lens.value, 1, 0));
  }

  void _dragUpdate(DragUpdateDetails d) {
    _raw += d.delta.dx / _tabW;
    _x.value = _rubber(_raw);
    setState(() => _stretch = (d.delta.dx.abs() * 0.006).clamp(0.0, 0.1));
  }

  void _dragEnd(DragEndDetails d) {
    final idx = _x.value.round().clamp(0, widget.items.length - 1);
    _dragging = false;
    setState(() => _stretch = 0);
    _moveTo(idx.toDouble(), velocity: d.velocity.pixelsPerSecond.dx / _tabW);
    _lens.animateWith(SpringSimulation(_lensSpring, _lens.value, 0, 0));
    if (idx != widget.selectedIndex) widget.onChanged(idx);
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    final accent = widget.accent ?? Theme.of(context).colorScheme.primary;
    final ink = dark ? Colors.white : const Color(0xFF111111);
    return ListenableBuilder(
      listenable: _ctrl,
      builder: (context, _) {
        final min = _ctrl.minimized;
        return Stack(
          alignment: Alignment.bottomCenter,
          children: [
            _swap(visible: !min, hiddenScale: 0.7, child: _bar(dark, accent, ink)),
            _swap(visible: min, hiddenScale: 1.35, child: _pill(dark, accent)),
          ],
        );
      },
    );
  }

  /// One short easeOutCubic crossfade + scale, same timing as the web version.
  Widget _swap({required bool visible, required double hiddenScale, required Widget child}) {
    return IgnorePointer(
      ignoring: !visible,
      child: AnimatedOpacity(
        opacity: visible ? 1 : 0,
        duration: const Duration(milliseconds: 220),
        curve: Curves.easeOut,
        child: AnimatedScale(
          scale: visible ? 1 : hiddenScale,
          alignment: Alignment.bottomCenter,
          duration: const Duration(milliseconds: 280),
          curve: Curves.easeOutCubic,
          child: child,
        ),
      ),
    );
  }

  Widget _glass({required bool dark, required double height, required Widget child, double? width}) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(999),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 16, sigmaY: 16),
        child: Container(
          width: width,
          height: height,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            color: (dark ? const Color(0xFF18181A) : const Color(0xFFFAFAFC)).withOpacity(dark ? 0.5 : 0.6),
            border: Border.all(color: (dark ? Colors.white : Colors.black).withOpacity(0.14)),
            gradient: LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: [Colors.white.withOpacity(0.14), Colors.white.withOpacity(0), Colors.white.withOpacity(0.04)],
              stops: const [0, 0.5, 1],
            ),
          ),
          child: child,
        ),
      ),
    );
  }

  Widget _pill(bool dark, Color accent) {
    final item = widget.items[widget.selectedIndex];
    return GestureDetector(
      onTap: () => _ctrl.minimized = false,
      child: _glass(
        dark: dark,
        height: 38,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(mainAxisSize: MainAxisSize.min, children: [
            Icon(item.icon, size: 18, color: accent),
            const SizedBox(width: 7),
            Text(item.label, style: TextStyle(color: accent, fontSize: 13, fontWeight: FontWeight.w600)),
          ]),
        ),
      ),
    );
  }

  Widget _bar(bool dark, Color accent, Color ink) {
    final n = widget.items.length;
    return ConstrainedBox(
      constraints: BoxConstraints(maxWidth: widget.maxWidth),
      child: LayoutBuilder(builder: (context, c) {
        _tabW = (c.maxWidth - _pad * 2) / n;
        return GestureDetector(
          behavior: HitTestBehavior.opaque,
          onHorizontalDragStart: _dragStart,
          onHorizontalDragUpdate: _dragUpdate,
          onHorizontalDragEnd: _dragEnd,
          child: SizedBox(
            height: _height,
            child: Stack(clipBehavior: Clip.none, children: [
              Positioned.fill(child: _glass(dark: dark, height: _height, child: const SizedBox.expand())),
              // The lens lives outside the glass clip so it can overflow the bar while dragging.
              AnimatedBuilder(
                animation: Listenable.merge([_x, _lens]),
                builder: (context, _) {
                  final lift = _lens.value.clamp(-0.3, 1.5);
                  final sx = 1 + 0.1 * lift + _stretch;
                  final sy = 1 + 0.13 * lift;
                  return Positioned(
                    left: _pad + _x.value * _tabW,
                    top: _pad,
                    bottom: _pad,
                    width: _tabW,
                    child: Transform(
                      alignment: Alignment.center,
                      transform: Matrix4.diagonal3Values(sx, sy, 1),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(999),
                          color: dark
                              ? Colors.white.withOpacity(0.2 + 0.07 * lift.clamp(0.0, 1.0))
                              : Colors.black.withOpacity(0.08 + 0.05 * lift.clamp(0.0, 1.0)),
                          border: Border.all(color: Colors.white.withOpacity(0.07 + 0.2 * lift.clamp(0.0, 1.0))),
                        ),
                      ),
                    ),
                  );
                },
              ),
              Padding(
                padding: const EdgeInsets.all(_pad),
                child: AnimatedBuilder(
                  animation: _x,
                  builder: (context, _) {
                    final hot = _dragging ? _x.value.round().clamp(0, n - 1) : widget.selectedIndex;
                    return Row(children: [
                      for (var i = 0; i < n; i++)
                        Expanded(
                          child: GestureDetector(
                            behavior: HitTestBehavior.opaque,
                            onTap: () => widget.onChanged(i),
                            child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                              Icon(widget.items[i].icon, size: 22, color: i == hot ? accent : ink),
                              const SizedBox(height: 4),
                              Text(widget.items[i].label,
                                  maxLines: 1,
                                  style: TextStyle(fontSize: 10.5, fontWeight: FontWeight.w600, color: i == hot ? accent : ink)),
                            ]),
                          ),
                        ),
                    ]);
                  },
                ),
              ),
            ]),
          ),
        );
      }),
    );
  }
}

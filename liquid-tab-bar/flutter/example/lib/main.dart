import 'package:flutter/material.dart';
import 'package:liquid_tab_bar/liquid_tab_bar.dart';

void main() => runApp(const DemoApp());

class DemoApp extends StatefulWidget {
  const DemoApp({super.key});
  @override
  State<DemoApp> createState() => _DemoAppState();
}

class _DemoAppState extends State<DemoApp> {
  final _bar = LiquidTabBarController();
  int _tab = 0;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      theme: ThemeData.dark(useMaterial3: true).copyWith(colorScheme: const ColorScheme.dark(primary: Color(0xFFFF7A3D))),
      home: Scaffold(
        body: Stack(children: [
          NotificationListener<ScrollNotification>(
            onNotification: _bar.handleScroll,
            child: ListView.builder(
              padding: const EdgeInsets.fromLTRB(16, 60, 16, 120),
              itemCount: 60,
              itemBuilder: (_, i) => ListTile(title: Text('Tab $_tab · row $i')),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 10,
            child: SafeArea(
              child: Center(
                child: LiquidTabBar(
                  controller: _bar,
                  selectedIndex: _tab,
                  onChanged: (i) => setState(() => _tab = i),
                  items: const [
                    LiquidTabItem(icon: Icons.home_rounded, label: 'Home'),
                    LiquidTabItem(icon: Icons.search_rounded, label: 'Search'),
                    LiquidTabItem(icon: Icons.inbox_rounded, label: 'Inbox'),
                    LiquidTabItem(icon: Icons.person_rounded, label: 'Me'),
                  ],
                ),
              ),
            ),
          ),
        ]),
      ),
    );
  }
}

# Logos Mobile Money - Documentation

## 📱 Logos disponibles

Les logos Mobile Money sont disponibles dans le projet web :

### Web (React)
```
src/assets/images/
├── mtn-momo.svg        # Logo MTN Mobile Money
├── orange-money.svg    # Logo Orange Money
```

### Utilisation dans le code Web

```tsx
import orangeMoneyLogo from "../../assets/images/orange-money.svg";
import mtnMomoLogo from "../../assets/images/mtn-momo.svg";

// Affichage du logo
<img src={orangeMoneyLogo} alt="Orange Money" className="w-12 h-12 object-contain" />
<img src={mtnMomoLogo} alt="MTN Mobile Money" className="w-12 h-12 object-contain" />
```

---

## 🎯 Intégration Flutter

### 1. Copier les logos dans Flutter

Copiez les fichiers SVG depuis le projet web vers Flutter :

```bash
# Depuis la racine du projet Docmaster
cp Docmaster-web/src/assets/images/mtn-momo.svg \
   mobil-docmaster/mobile_docmaster_flutter/assets/images/mtn-momo.svg

cp Docmaster-web/src/assets/images/orange-money.svg \
   mobil-docmaster/mobile_docmaster_flutter/assets/images/orange-money.svg
```

### 2. Déclarer les assets dans `pubspec.yaml`

```yaml
flutter:
  assets:
    - assets/images/mtn-momo.svg
    - assets/images/orange-money.svg
```

### 3. Installer flutter_svg

```yaml
dependencies:
  flutter_svg: ^2.0.9
```

```bash
flutter pub get
```

### 4. Utiliser les logos dans le code Flutter

```dart
import 'package:flutter_svg/flutter_svg.dart';

// Affichage du logo Orange Money
SvgPicture.asset(
  'assets/images/orange-money.svg',
  width: 48,
  height: 48,
  fit: BoxFit.contain,
)

// Affichage du logo MTN Mobile Money
SvgPicture.asset(
  'assets/images/mtn-momo.svg',
  width: 48,
  height: 48,
  fit: BoxFit.contain,
)
```

### 5. Exemple de Widget Payment Method

```dart
class PaymentMethodCard extends StatelessWidget {
  final String type; // 'orange' | 'mtn'
  final bool selected;
  final VoidCallback onTap;

  const PaymentMethodCard({
    required this.type,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final logoPath = type == 'orange' 
      ? 'assets/images/orange-money.svg'
      : 'assets/images/mtn-momo.svg';
      
    final title = type == 'orange'
      ? 'Orange Money'
      : 'MTN Mobile Money';

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: EdgeInsets.all(16),
        decoration: BoxDecoration(
          border: Border.all(
            color: selected ? Color(0xFF2D5A42) : Color(0xFFEAE3D8),
            width: selected ? 2 : 1,
          ),
          borderRadius: BorderRadius.circular(16),
          color: selected ? Color(0xFFF5F5F0) : Colors.white,
        ),
        child: Row(
          children: [
            // Logo
            Container(
              width: 48,
              height: 48,
              padding: EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border.all(color: Color(0xFFEAE3D8)),
                borderRadius: BorderRadius.circular(12),
              ),
              child: SvgPicture.asset(
                logoPath,
                fit: BoxFit.contain,
              ),
            ),
            SizedBox(width: 12),
            
            // Texte
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                  SizedBox(height: 2),
                  Text(
                    'Paiement sécurisé',
                    style: TextStyle(
                      fontSize: 12,
                      color: Color(0xFF6B7280),
                    ),
                  ),
                ],
              ),
            ),
            
            // Checkmark
            if (selected)
              Icon(
                Icons.check_circle,
                color: Color(0xFF2D5A42),
                size: 20,
              ),
          ],
        ),
      ),
    );
  }
}
```

### 6. Utilisation dans un écran de paiement

```dart
class PaymentScreen extends StatefulWidget {
  @override
  _PaymentScreenState createState() => _PaymentScreenState();
}

class _PaymentScreenState extends State<PaymentScreen> {
  String selectedMethod = '';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text('Paiement')),
      body: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Mobile Money',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Color(0xFF6B7280),
                letterSpacing: 0.5,
              ),
            ),
            SizedBox(height: 12),
            
            // Orange Money
            PaymentMethodCard(
              type: 'orange',
              selected: selectedMethod == 'orange',
              onTap: () => setState(() => selectedMethod = 'orange'),
            ),
            SizedBox(height: 12),
            
            // MTN Mobile Money
            PaymentMethodCard(
              type: 'mtn',
              selected: selectedMethod == 'mtn',
              onTap: () => setState(() => selectedMethod = 'mtn'),
            ),
          ],
        ),
      ),
    );
  }
}
```

---

## 🎨 Design Guidelines

### Tailles recommandées
- **Mobile**: 48×48px (w-12 h-12)
- **Desktop**: 56×56px (w-14 h-14)
- **Liste compacte**: 40×40px (w-10 h-10)

### Espacement
- Padding interne du conteneur: 8-12px
- Gap entre logo et texte: 12-16px

### Conteneur du logo
```dart
Container(
  width: 48,
  height: 48,
  padding: EdgeInsets.all(8),
  decoration: BoxDecoration(
    color: Colors.white,
    border: Border.all(color: Color(0xFFEAE3D8)),
    borderRadius: BorderRadius.circular(12),
  ),
  child: SvgPicture.asset(...),
)
```

### État sélectionné
- Bordure: 2px solid #2D5A42 (green-dark)
- Background: #F5F5F0 (léger tint)
- Icône de check: #2D5A42

### État non-sélectionné
- Bordure: 1px solid #EAE3D8 (borderMain)
- Background: white
- Pas d'icône

---

## ✅ Checklist d'intégration

- [ ] Copier les fichiers SVG dans `assets/images/`
- [ ] Déclarer les assets dans `pubspec.yaml`
- [ ] Installer `flutter_svg`
- [ ] Créer le widget `PaymentMethodCard`
- [ ] Intégrer dans les écrans de paiement/retrait
- [ ] Tester sur Android et iOS
- [ ] Vérifier le rendering des SVG
- [ ] Implémenter les états selected/unselected

---

## 📝 Notes

- Les logos sont au format **SVG** pour une qualité optimale
- Compatible avec le thème sombre (inverser les couleurs si nécessaire)
- Les logos respectent les guidelines des opérateurs
- Utilisez toujours les logos officiels fournis

---

**Dernière mise à jour**: 2026-10-07
**Mainteneur**: Équipe DocMaster
